-- Shared abuse controls survive serverless restarts. No raw IP addresses are stored.
create table public.blocked_phones(
 id uuid primary key default gen_random_uuid(),phone text not null unique check(phone ~ '^923[0-9]{9}$'),
 reason text not null check(length(reason) between 3 and 300),created_at timestamptz not null default now()
);
alter table public.blocked_phones enable row level security;
revoke all on public.blocked_phones from anon,authenticated;
grant select,insert,delete on public.blocked_phones to authenticated;
grant all on public.blocked_phones to service_role;
create policy admin_manage on public.blocked_phones for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));

create table private.order_attempts(network_hash text primary key,window_start timestamptz not null,attempts integer not null);
create table private.order_networks(order_id uuid primary key references public.orders(id) on delete cascade,network_hash text not null,created_at timestamptz not null default now());
create index order_networks_recent on private.order_networks(network_hash,created_at);
create index order_attempts_expiry on private.order_attempts(window_start);
create index order_networks_expiry on private.order_networks(created_at);
create index orders_phone_recent on public.orders(phone,created_at desc);
alter table private.order_attempts enable row level security;
alter table private.order_networks enable row level security;
revoke all on private.order_attempts,private.order_networks from public,anon,authenticated;
grant all on private.order_attempts,private.order_networks to service_role;

create function public.record_order_attempt(p_network text) returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;begin
 if p_network !~ '^[a-f0-9]{64}$' then raise exception 'Invalid network reference';end if;
 -- Small TTL tables keep only recent abuse metadata. The increment commits even for rejected requests.
 delete from private.order_attempts where window_start<now()-interval '1 day';
 delete from private.order_networks where created_at<now()-interval '1 day';
 insert into private.order_attempts(network_hash,window_start,attempts) values(p_network,now(),1)
 on conflict(network_hash) do update set
 attempts=case when order_attempts.window_start<=now()-interval '10 minutes' then 1 else least(order_attempts.attempts+1,1000000) end,
 window_start=case when order_attempts.window_start<=now()-interval '10 minutes' then now() else order_attempts.window_start end
 returning attempts into n;
 return n<=20;
end;$$;
revoke all on function public.record_order_attempt(text) from public,anon,authenticated;
grant execute on function public.record_order_attempt(text) to service_role;

create function public.create_guarded_order(p_payload jsonb,p_tracking_hash text,p_fingerprint text,p_network text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;v_phone text=p_payload->>'phone';begin
 if v_phone !~ '^923[0-9]{9}$' or v_phone is null or p_network !~ '^[a-f0-9]{64}$' or p_network is null then raise exception 'Enter a valid Pakistani mobile number';end if;
 -- Consistent lock order prevents concurrent requests bypassing the checks.
 perform pg_advisory_xact_lock(hashtextextended(p_payload->>'request_key',0));
 -- A retry must return the original order even if the limits or blocklist changed afterward.
 if exists(select 1 from public.orders where request_key=(p_payload->>'request_key')::uuid) then return public.create_order(p_payload,p_tracking_hash,p_fingerprint);end if;
 perform pg_advisory_xact_lock(hashtextextended('phone:'||v_phone,1));
 perform pg_advisory_xact_lock(hashtextextended('network:'||p_network,2));
 if exists(select 1 from public.blocked_phones where phone=v_phone) then raise exception 'Online ordering is unavailable for this number. Please call the restaurant';end if;
 if (select count(*) from public.orders where phone=v_phone and created_at>now()-interval '1 hour')>=5 then raise exception 'Too many orders for this number. Please call the restaurant';end if;
 if (select count(*) from public.orders where phone=v_phone and status in ('new','confirmed','preparing','ready_for_pickup','out_for_delivery'))>=2 then raise exception 'You already have two active orders. Please call to change an existing order';end if;
 if exists(select 1 from public.orders where phone=v_phone and created_at>now()-interval '30 seconds') then raise exception 'An order was just placed for this number. Check your last order before ordering again';end if;
 if (select count(*) from private.order_networks where network_hash=p_network and created_at>now()-interval '1 hour')>=20 then raise exception 'Too many orders from this connection. Please call the restaurant';end if;
 result=public.create_order(p_payload,p_tracking_hash,p_fingerprint);
 insert into private.order_networks(order_id,network_hash) values((result->>'id')::uuid,p_network);
 return result;
end;$$;
revoke all on function public.create_guarded_order(jsonb,text,text,text) from public,anon,authenticated;
grant execute on function public.create_guarded_order(jsonb,text,text,text) to service_role;

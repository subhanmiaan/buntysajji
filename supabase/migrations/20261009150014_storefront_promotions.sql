-- Storefront settings and transactionally enforced offers. No offers are enabled by default.
alter table public.restaurant_settings add column homepage jsonb not null default '{"default_theme":"dark","animations":true,"announcement":"Fresh from the fire. Made for your mehfil.","hero_title":"DESI DIL. PUNJABI SOUL.","hero_subtitle":"Slow-roasted sajji, smoky BBQ and sizzling karahi. Bring your people. We will bring the flavour.","hero_image":"/assets/food-ai/chicken-sajji.webp","button_label":"EXPLORE THE MENU","show_deals":true,"show_story":true,"show_featured":true,"featured_count":3}';
update public.restaurant_settings set name=replace(replace(name,'Bunty Sajji','Bunty سجی'),'BuntySajji','Bunty سجی');
create table public.promotions(
 id uuid primary key default gen_random_uuid(),name text not null,description text not null default '',
 kind text not null check(kind in ('deal','voucher')),code text unique,
 discount_type text not null check(discount_type in ('percent','fixed')),
 discount_value numeric(12,2) not null check(discount_value>0 and (discount_type<>'percent' or discount_value<=100)),
 minimum_order numeric(12,2) not null default 0 check(minimum_order>=0),maximum_discount numeric(12,2) check(maximum_discount>=0),
 starts_at timestamptz not null,ends_at timestamptz not null check(ends_at>starts_at),
 usage_limit integer check(usage_limit>0),used_count integer not null default 0 check(used_count>=0),active boolean not null default false,
 created_at timestamptz not null default now(),
 check((kind='voucher' and code is not null and code ~ '^[A-Z0-9_-]{3,40}$') or (kind='deal' and code is null))
);
alter table public.promotions enable row level security;
revoke all on public.promotions from anon,authenticated;
grant select,insert,delete on public.promotions to authenticated;
grant update(name,description,kind,code,discount_type,discount_value,minimum_order,maximum_discount,starts_at,ends_at,usage_limit,active) on public.promotions to authenticated;
grant all on public.promotions to service_role;
create policy admin_manage on public.promotions for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create index promotions_live on public.promotions(ends_at) where active;
alter table public.orders add column discount numeric(12,2) not null default 0 check(discount>=0 and discount<=subtotal),
 add column promotion_id uuid references public.promotions(id) on delete set null,
 add column promotion_name text,add column voucher_code text;
alter table public.orders drop constraint orders_check;
alter table public.orders add constraint orders_total_check check(total=subtotal+delivery_fee-discount);
create index orders_promotion_id on public.orders(promotion_id) where promotion_id is not null;
-- Preserve existing validation, catalog pricing, delivery minimums and pickup rules.
alter function public.quote_order(jsonb) rename to quote_order_base;
create function public.quote_order(p_payload jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare q jsonb;p public.promotions;chosen public.promotions;amount numeric;best numeric=0;sub numeric;v_code text=upper(trim(coalesce(p_payload->>'voucher_code','')));
begin
 q=public.quote_order_base(p_payload);sub=(q->>'subtotal')::numeric;
 -- Lock in a stable order. Redemption and creation happen in the same transaction.
 for p in select * from public.promotions where active and ((v_code<>'' and promotions.code=v_code and kind='voucher') or (v_code='' and kind='deal')) order by id for update loop
  if p.starts_at>now() or p.ends_at<=now() or (p.usage_limit is not null and p.used_count>=p.usage_limit) or sub<p.minimum_order then continue;end if;
  amount=least(sub,coalesce(p.maximum_discount,sub),round(case when p.discount_type='percent' then sub*p.discount_value/100 else p.discount_value end,2));
  if amount>best then best=amount;chosen=p;end if;
 end loop;
 if v_code<>'' and chosen.id is null then raise exception 'Voucher is invalid, expired, fully redeemed, or its minimum order has not been met';end if;
 return q||jsonb_build_object('discount',best,'total',(q->>'total')::numeric-best,'promotion_id',chosen.id,'promotion_name',chosen.name,'voucher_code',chosen.code);
end;$$;
revoke all on function public.quote_order(jsonb) from public,anon,authenticated;
grant execute on function public.quote_order(jsonb) to service_role;

create or replace function public.create_order(p_payload jsonb,p_tracking_hash text,p_fingerprint text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare q jsonb;line jsonb;addon jsonb;o public.orders;line_id uuid;begin
 if p_tracking_hash !~ '^[a-f0-9]{64}$' or p_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'Invalid order reference';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_payload->>'request_key',0));
 select * into o from public.orders where request_key=(p_payload->>'request_key')::uuid;
 if found then
  if o.tracking_token_hash<>p_tracking_hash or o.request_fingerprint<>p_fingerprint then raise exception 'This request key has already been used';end if;
  return jsonb_build_object('order_number',o.order_number,'id',o.id);end if;
 q=public.quote_order(p_payload);
 if (p_payload->>'expected_total')::numeric is distinct from (q->>'total')::numeric then raise exception 'Prices changed. Review the updated total before placing your order';end if;
 insert into public.orders(request_key,request_fingerprint,tracking_token_hash,customer_name,phone,fulfillment,zone_id,zone_name,address,landmark,instructions,pickup_mode,pickup_at,subtotal,delivery_fee,total,estimated_minutes,payment_method,discount,promotion_id,promotion_name,voucher_code)
 values((p_payload->>'request_key')::uuid,p_fingerprint,p_tracking_hash,p_payload->>'customer_name',p_payload->>'phone',p_payload->>'fulfillment',case when p_payload->>'fulfillment'='delivery' then (p_payload->>'zone_id')::uuid end,q->>'zone_name',coalesce(p_payload->>'address',''),coalesce(p_payload->>'landmark',''),coalesce(p_payload->>'instructions',''),case when p_payload->>'fulfillment'='takeaway' then coalesce(p_payload->>'pickup_mode','asap') else 'asap' end,(q->>'pickup_at')::timestamptz,(q->>'subtotal')::numeric,(q->>'delivery_fee')::numeric,(q->>'total')::numeric,(q->>'estimated_minutes')::integer,case when p_payload->>'fulfillment'='delivery' then 'cash_on_delivery' else 'cash_on_pickup' end,(q->>'discount')::numeric,(q->>'promotion_id')::uuid,q->>'promotion_name',q->>'voucher_code') returning * into o;
 if o.promotion_id is not null then update public.promotions set used_count=used_count+1 where id=o.promotion_id;end if;
 for line in select value from jsonb_array_elements(q->'items') loop
  insert into public.order_items(order_id,menu_item_id,variant_id,item_name,variant_name,unit_price,quantity,line_total) values(o.id,(line->>'menu_item_id')::uuid,(line->>'variant_id')::uuid,line->>'item_name',line->>'variant_name',(line->>'unit_price')::numeric,(line->>'quantity')::integer,(line->>'line_total')::numeric) returning id into line_id;
  for addon in select value from jsonb_array_elements(line->'addons') loop
   insert into public.order_item_addons(order_item_id,addon_id,name,unit_price) values(line_id,(addon->>'addon_id')::uuid,addon->>'name',(addon->>'unit_price')::numeric);
  end loop;
 end loop;
 return jsonb_build_object('order_number',o.order_number,'id',o.id);
end;$$;
revoke all on function public.create_order(jsonb,text,text) from public,anon,authenticated;
grant execute on function public.create_order(jsonb,text,text) to service_role;

-- Save the item, its variants and add-ons in one transaction. Removed options are
-- archived, retaining stable IDs for old baskets and historical order references.

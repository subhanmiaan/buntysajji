-- Bunty Sajji: authoritative ordering, admin authorization and immutable snapshots.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create table public.admin_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'admin' check(role in ('owner','admin')),
 active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.admin_profiles where user_id=auth.uid() and active);
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated,service_role;

create table public.categories (
 id uuid primary key default gen_random_uuid(),name text not null unique check(length(name) between 1 and 80),
 sort_order integer not null default 0 check(sort_order>=0),active boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.menu_items (
 id uuid primary key default gen_random_uuid(),category_id uuid not null references public.categories(id) on delete restrict,
 name text not null check(length(name) between 1 and 160),description text not null default '' check(length(description)<=1500),
 image_url text not null default '',available boolean not null default true,featured boolean not null default false,
 sort_order integer not null default 0 check(sort_order>=0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(image_url='' or image_url like '/assets/%' or image_url like 'https://%')
);
create index menu_items_category_idx on public.menu_items(category_id);
create table public.menu_item_variants (
 id uuid primary key default gen_random_uuid(),menu_item_id uuid not null references public.menu_items(id) on delete cascade,
 name text not null check(length(name) between 1 and 100),price numeric(12,2) not null check(price between 0 and 1000000),available boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(menu_item_id,name)
);
create table public.menu_item_addons (
 id uuid primary key default gen_random_uuid(),menu_item_id uuid not null references public.menu_items(id) on delete cascade,
 name text not null check(length(name) between 1 and 100),price numeric(12,2) not null check(price between 0 and 1000000),available boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(menu_item_id,name)
);
create table public.delivery_zones (
 id uuid primary key default gen_random_uuid(),name text not null unique check(length(name) between 1 and 100),
 delivery_fee numeric(12,2) not null check(delivery_fee between 0 and 1000000),minimum_order numeric(12,2) not null check(minimum_order between 0 and 1000000),
 estimated_minutes integer not null check(estimated_minutes between 5 and 1440),active boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.restaurant_settings (
 id integer primary key default 1 check(id=1),name text not null,phone text not null,whatsapp text not null default '',address text not null,
 opening_hours text not null,minimum_preparation_minutes integer not null default 30 check(minimum_preparation_minutes between 5 and 240),
 delivery_enabled boolean not null default false,takeaway_enabled boolean not null default true,
 instagram text not null default '',facebook text not null default '',tiktok text not null default '',youtube text not null default '',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create sequence public.order_number_seq start with 1001;
create table public.orders (
 id uuid primary key default gen_random_uuid(),order_number text not null unique default ('BS-'||nextval('public.order_number_seq')),
 request_key uuid not null unique,request_fingerprint text not null check(length(request_fingerprint)=64),tracking_token_hash text not null check(length(tracking_token_hash)=64),
 customer_name text not null check(length(customer_name) between 2 and 100),phone text not null check(length(phone) between 7 and 30),
 fulfillment text not null check(fulfillment in ('delivery','takeaway')),zone_id uuid references public.delivery_zones(id) on delete set null,zone_name text,
 address text not null default '',landmark text not null default '',instructions text not null default '',
 pickup_mode text not null default 'asap' check(pickup_mode in ('asap','scheduled')),pickup_at timestamptz,
 subtotal numeric(12,2) not null check(subtotal>=0),delivery_fee numeric(12,2) not null check(delivery_fee>=0),total numeric(12,2) not null check(total=subtotal+delivery_fee),
 estimated_minutes integer not null check(estimated_minutes>0),
 payment_method text not null check(payment_method in ('cash_on_delivery','cash_on_pickup','easypaisa','jazzcash','card')),
 payment_status text not null default 'pending' check(payment_status in ('pending','paid','failed','refunded')),
 payment_reference text,payment_provider text,
 status text not null default 'new' check(status in ('new','confirmed','preparing','ready_for_pickup','out_for_delivery','completed','cancelled')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(fulfillment<>'delivery' or length(address)>=5),check(fulfillment<>'takeaway' or delivery_fee=0),
 check(pickup_mode<>'scheduled' or pickup_at is not null)
);
create index orders_created_idx on public.orders(created_at desc);
create index orders_status_idx on public.orders(status,created_at desc);
create index orders_zone_idx on public.orders(zone_id);
create table public.order_items (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,
 menu_item_id uuid references public.menu_items(id) on delete set null,variant_id uuid references public.menu_item_variants(id) on delete set null,
 item_name text not null,variant_name text not null,unit_price numeric(12,2) not null check(unit_price>=0),
 quantity integer not null check(quantity between 1 and 99),line_total numeric(12,2) not null check(line_total>=0),created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items(order_id);
create index order_items_menu_idx on public.order_items(menu_item_id);
create index order_items_variant_idx on public.order_items(variant_id);
create table public.order_item_addons (
 id uuid primary key default gen_random_uuid(),order_item_id uuid not null references public.order_items(id) on delete cascade,
 addon_id uuid references public.menu_item_addons(id) on delete set null,name text not null,unit_price numeric(12,2) not null check(unit_price>=0),created_at timestamptz not null default now()
);
create index order_item_addons_item_idx on public.order_item_addons(order_item_id);
create index order_item_addons_addon_idx on public.order_item_addons(addon_id);
create table public.order_status_history (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,
 status text not null check(status in ('new','confirmed','preparing','ready_for_pickup','out_for_delivery','completed','cancelled')),
 changed_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history(order_id,created_at);
create index order_status_history_admin_idx on public.order_status_history(changed_by);

create function private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now();return new;end;$$;
do $$declare t text;begin
 foreach t in array array['admin_profiles','categories','menu_items','menu_item_variants','menu_item_addons','delivery_zones','restaurant_settings','orders'] loop
 execute format('create trigger touch_updated before update on public.%I for each row execute function private.touch_updated_at()',t);
 end loop;
 foreach t in array array['admin_profiles','categories','menu_items','menu_item_variants','menu_item_addons','delivery_zones','restaurant_settings','orders','order_items','order_item_addons','order_status_history'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
end;$$;
grant usage,select on sequence public.order_number_seq to service_role;
grant select on public.admin_profiles to authenticated;
create policy own_profile on public.admin_profiles for select to authenticated using(user_id=(select auth.uid()));
-- No client can grant itself an admin profile. Bootstrap from SQL/service only.
do $$declare t text;begin
 foreach t in array array['categories','menu_items','menu_item_variants','menu_item_addons','delivery_zones','restaurant_settings'] loop
 execute format('grant select on public.%I to anon,authenticated',t);
 execute format('grant insert,update,delete on public.%I to authenticated',t);
 execute format('create policy admin_manage on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',t);
 end loop;
end;$$;
create policy catalog_categories on public.categories for select to anon,authenticated using(active);
-- Unavailable dishes remain visible but cannot be ordered. Inactive categories are hidden.
create policy catalog_items on public.menu_items for select to anon,authenticated using(exists(select 1 from public.categories c where c.id=category_id and c.active));
create policy catalog_variants on public.menu_item_variants for select to anon,authenticated using(exists(select 1 from public.menu_items m join public.categories c on c.id=m.category_id where m.id=menu_item_id and c.active));
create policy catalog_addons on public.menu_item_addons for select to anon,authenticated using(exists(select 1 from public.menu_items m join public.categories c on c.id=m.category_id where m.id=menu_item_id and c.active));
create policy active_zones on public.delivery_zones for select to anon,authenticated using(active);
create policy public_settings on public.restaurant_settings for select to anon,authenticated using(true);
revoke insert,delete on public.restaurant_settings from authenticated;
do $$declare t text;begin
 foreach t in array array['orders','order_items','order_item_addons','order_status_history'] loop
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy admin_read on public.%I for select to authenticated using ((select private.is_admin()))',t);
 end loop;
end;$$;
grant update(status) on public.orders to authenticated;
create policy admin_order_status on public.orders for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));

create function private.order_transition() returns trigger language plpgsql set search_path='' as $$begin
 if new.status=old.status then return new;end if;
 if old.status in ('completed','cancelled') then raise exception 'This order is already closed';end if;
 if new.status<>'cancelled' and not (
  (old.status='new' and new.status='confirmed') or (old.status='confirmed' and new.status='preparing') or
  (old.status='preparing' and ((new.fulfillment='delivery' and new.status='out_for_delivery') or (new.fulfillment='takeaway' and new.status='ready_for_pickup'))) or
  (old.status in ('out_for_delivery','ready_for_pickup') and new.status='completed')
 ) then raise exception 'Invalid status transition';end if;
 if new.status='completed' and new.payment_method in ('cash_on_delivery','cash_on_pickup') then new.payment_status='paid';end if;
 return new;end;$$;
create trigger order_transition before update of status on public.orders for each row execute function private.order_transition();
create function private.record_order_status() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op='INSERT' or old.status is distinct from new.status then
 insert into public.order_status_history(order_id,status,changed_by) values(new.id,new.status,auth.uid());end if;return new;end;$$;
revoke all on function private.record_order_status() from public;
create trigger record_order_status after insert or update of status on public.orders for each row execute function private.record_order_status();

create function public.set_order_status(p_order_id uuid,p_status text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result public.orders;begin
 if not private.is_admin() then raise exception 'Admin access required' using errcode='42501';end if;
 update public.orders set status=p_status where id=p_order_id returning * into result;
 if not found then raise exception 'Order not found';end if;
 return jsonb_build_object('id',result.id,'status',result.status);end;$$;
revoke all on function public.set_order_status(uuid,text) from public,anon;
grant execute on function public.set_order_status(uuid,text) to authenticated;

-- Each row's price is read under a lock. Creating an order reuses this exact function
-- inside the transaction, so concurrent menu edits cannot split the price snapshot.
create function public.quote_order(p_payload jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s public.restaurant_settings;z public.delivery_zones;m public.menu_items;v public.menu_item_variants;a public.menu_item_addons;
 line jsonb;aid text;addons jsonb;lines jsonb='[]';quantity integer;subtotal numeric=0;fee numeric=0;line_total numeric;addon_total numeric;eta integer;pickup timestamptz;
begin
 select * into strict s from public.restaurant_settings where id=1 for share;
 if p_payload->>'fulfillment' not in ('delivery','takeaway') or p_payload->>'fulfillment' is null then raise exception 'Choose delivery or takeaway';end if;
 if (p_payload->>'fulfillment'='delivery' and not s.delivery_enabled) or (p_payload->>'fulfillment'='takeaway' and not s.takeaway_enabled) then raise exception 'This order type is currently disabled';end if;
 eta=s.minimum_preparation_minutes;
 if p_payload->>'fulfillment'='delivery' then
  select * into z from public.delivery_zones where id=(p_payload->>'zone_id')::uuid and active for share;
  if not found then raise exception 'Choose an active delivery area';end if;fee=z.delivery_fee;eta=z.estimated_minutes;
 elsif p_payload->>'pickup_mode'='scheduled' then
  pickup=(p_payload->>'pickup_at')::timestamptz;
  if pickup is null or pickup<now()+make_interval(mins=>s.minimum_preparation_minutes) or pickup>now()+interval '7 days' then raise exception 'Pickup must allow preparation time and be within the next 7 days';end if;
 end if;
 if jsonb_typeof(p_payload->'items') is distinct from 'array' or jsonb_array_length(p_payload->'items') not between 1 and 50 then raise exception 'Bag must contain 1 to 50 lines';end if;
 for line in select value from jsonb_array_elements(p_payload->'items') loop
  if coalesce(line->>'quantity','') !~ '^[0-9]+$' then raise exception 'Invalid quantity';end if;
  quantity=(line->>'quantity')::integer;if quantity not between 1 and 99 then raise exception 'Quantity must be between 1 and 99';end if;
  select * into m from public.menu_items where id=(line->>'menu_item_id')::uuid and available for share;
  if not found then raise exception 'A dish is no longer available. Refresh your bag';end if;
  perform 1 from public.categories where id=m.category_id and active for share;if not found then raise exception 'This category is no longer available';end if;
  select * into v from public.menu_item_variants where id=(line->>'variant_id')::uuid and menu_item_id=m.id and available for share;
  if not found then raise exception 'The selected portion is unavailable';end if;
  addons='[]';addon_total=0;
  if jsonb_typeof(coalesce(line->'addon_ids','[]'))<>'array' or jsonb_array_length(coalesce(line->'addon_ids','[]'))>20 then raise exception 'Invalid add-ons';end if;
  if (select count(*)<>count(distinct value) from jsonb_array_elements_text(coalesce(line->'addon_ids','[]'))) then raise exception 'Duplicate add-ons';end if;
  for aid in select value from jsonb_array_elements_text(coalesce(line->'addon_ids','[]')) loop
   select * into a from public.menu_item_addons where id=aid::uuid and menu_item_id=m.id and available for share;
   if not found then raise exception 'An add-on is unavailable';end if;
   addon_total=addon_total+a.price;addons=addons||jsonb_build_array(jsonb_build_object('addon_id',a.id,'name',a.name,'unit_price',a.price));
  end loop;
  line_total=(v.price+addon_total)*quantity;subtotal=subtotal+line_total;
  lines=lines||jsonb_build_array(jsonb_build_object('menu_item_id',m.id,'variant_id',v.id,'item_name',m.name,'variant_name',v.name,'unit_price',v.price,'quantity',quantity,'line_total',line_total,'addons',addons));
 end loop;
 if p_payload->>'fulfillment'='delivery' and subtotal<z.minimum_order then raise exception 'Minimum order for % is Rs. %',z.name,z.minimum_order;end if;
 return jsonb_build_object('items',lines,'subtotal',subtotal,'delivery_fee',fee,'total',subtotal+fee,'estimated_minutes',eta,'zone_name',z.name,'pickup_at',pickup);
end;$$;
revoke all on function public.quote_order(jsonb) from public,anon,authenticated;
grant execute on function public.quote_order(jsonb) to service_role;

create function public.create_order(p_payload jsonb,p_tracking_hash text,p_fingerprint text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare q jsonb;line jsonb;addon jsonb;o public.orders;line_id uuid;begin
 if p_tracking_hash !~ '^[a-f0-9]{64}$' or p_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'Invalid order reference';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_payload->>'request_key',0));
 select * into o from public.orders where request_key=(p_payload->>'request_key')::uuid;
 if found then
  if o.tracking_token_hash<>p_tracking_hash or o.request_fingerprint<>p_fingerprint then raise exception 'This request key has already been used';end if;
  return jsonb_build_object('order_number',o.order_number,'id',o.id);end if;
 q=public.quote_order(p_payload);
 if (p_payload->>'expected_total')::numeric is distinct from (q->>'total')::numeric then raise exception 'Prices changed. Review the updated total before placing your order';end if;
 insert into public.orders(request_key,request_fingerprint,tracking_token_hash,customer_name,phone,fulfillment,zone_id,zone_name,address,landmark,instructions,pickup_mode,pickup_at,subtotal,delivery_fee,total,estimated_minutes,payment_method)
 values((p_payload->>'request_key')::uuid,p_fingerprint,p_tracking_hash,p_payload->>'customer_name',p_payload->>'phone',p_payload->>'fulfillment',case when p_payload->>'fulfillment'='delivery' then (p_payload->>'zone_id')::uuid end,q->>'zone_name',coalesce(p_payload->>'address',''),coalesce(p_payload->>'landmark',''),coalesce(p_payload->>'instructions',''),case when p_payload->>'fulfillment'='takeaway' then coalesce(p_payload->>'pickup_mode','asap') else 'asap' end,(q->>'pickup_at')::timestamptz,(q->>'subtotal')::numeric,(q->>'delivery_fee')::numeric,(q->>'total')::numeric,(q->>'estimated_minutes')::integer,case when p_payload->>'fulfillment'='delivery' then 'cash_on_delivery' else 'cash_on_pickup' end) returning * into o;
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
create function public.save_menu_item(p_item jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare mid uuid;v jsonb;vid uuid;kept uuid[];t text;begin
 if not private.is_admin() then raise exception 'Admin access required' using errcode='42501';end if;
 if jsonb_array_length(p_item->'variants')<1 then raise exception 'At least one variant is required';end if;
 if p_item->>'id' is null then
  insert into public.menu_items(category_id,name,description,image_url,available,featured,sort_order) values((p_item->>'category_id')::uuid,p_item->>'name',p_item->>'description',p_item->>'image_url',(p_item->>'available')::boolean,(p_item->>'featured')::boolean,coalesce((p_item->>'sort_order')::integer,0)) returning id into mid;
 else
  mid=(p_item->>'id')::uuid;
  update public.menu_items set category_id=(p_item->>'category_id')::uuid,name=p_item->>'name',description=p_item->>'description',image_url=p_item->>'image_url',available=(p_item->>'available')::boolean,featured=(p_item->>'featured')::boolean,sort_order=coalesce((p_item->>'sort_order')::integer,0) where id=mid;
  if not found then raise exception 'Menu item not found';end if;
 end if;
 foreach t in array array['variants','addons'] loop
  kept='{}';
  for v in select value from jsonb_array_elements(p_item->t) loop
   vid=coalesce((v->>'id')::uuid,gen_random_uuid());
   if t='variants' then
    if v->>'id' is not null and not exists(select 1 from public.menu_item_variants where id=vid and menu_item_id=mid) then raise exception 'Variant belongs to a different item';end if;
    insert into public.menu_item_variants(id,menu_item_id,name,price,available) values(vid,mid,v->>'name',(v->>'price')::numeric,coalesce((v->>'available')::boolean,true)) on conflict(id) do update set name=excluded.name,price=excluded.price,available=excluded.available;
   else
    if v->>'id' is not null and not exists(select 1 from public.menu_item_addons where id=vid and menu_item_id=mid) then raise exception 'Add-on belongs to a different item';end if;
    insert into public.menu_item_addons(id,menu_item_id,name,price,available) values(vid,mid,v->>'name',(v->>'price')::numeric,coalesce((v->>'available')::boolean,true)) on conflict(id) do update set name=excluded.name,price=excluded.price,available=excluded.available;
   end if;
   kept=array_append(kept,vid);
  end loop;
  if t='variants' then update public.menu_item_variants set available=false where menu_item_id=mid and not(id=any(kept));
  else update public.menu_item_addons set available=false where menu_item_id=mid and not(id=any(kept));end if;
 end loop;return mid;
end;$$;
revoke all on function public.save_menu_item(jsonb) from public,anon;
grant execute on function public.save_menu_item(jsonb) to authenticated;

insert into public.restaurant_settings(id,name,phone,address,opening_hours,instagram)
values(1,'Bunty Sajji - Alam Chowk, Sialkot','(052) 3242312','Shahbpura road, Aalam Chowk, Mubarakpura, Sialkot, 51310','Monday–Sunday: 12 pm–4 am (following morning)','https://www.instagram.com/buntysajjisialkot/');
-- Delivery is disabled until the owner defines real zones. No fees are invented.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('food-images','food-images',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy admin_food_upload on storage.objects for insert to authenticated with check(bucket_id='food-images' and (select private.is_admin()));
create policy admin_food_read on storage.objects for select to authenticated using(bucket_id='food-images' and (select private.is_admin()));
create policy admin_food_update on storage.objects for update to authenticated using(bucket_id='food-images' and (select private.is_admin())) with check(bucket_id='food-images' and (select private.is_admin()));
create policy admin_food_delete on storage.objects for delete to authenticated using(bucket_id='food-images' and (select private.is_admin()));

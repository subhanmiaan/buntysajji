-- Keep one SELECT policy per role/table, and separate admin write policies.
do $$declare t text;begin
 foreach t in array array['categories','menu_items','menu_item_variants','menu_item_addons','delivery_zones','restaurant_settings'] loop
 execute format('drop policy admin_manage on public.%I',t);
 execute format('create policy admin_insert on public.%I for insert to authenticated with check ((select private.is_admin()))',t);
 execute format('create policy admin_update on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',t);
 execute format('create policy admin_delete on public.%I for delete to authenticated using ((select private.is_admin()))',t);
 end loop;
end;$$;
alter policy catalog_categories on public.categories to anon;
alter policy catalog_items on public.menu_items to anon;
alter policy catalog_variants on public.menu_item_variants to anon;
alter policy catalog_addons on public.menu_item_addons to anon;
alter policy active_zones on public.delivery_zones to anon;
create policy signed_in_catalog on public.categories for select to authenticated using ((select private.is_admin()) or active);
create policy signed_in_catalog on public.menu_items for select to authenticated using ((select private.is_admin()) or exists(select 1 from public.categories c where c.id=category_id and c.active));
create policy signed_in_catalog on public.menu_item_variants for select to authenticated using ((select private.is_admin()) or exists(select 1 from public.menu_items m join public.categories c on c.id=m.category_id where m.id=menu_item_id and c.active));
create policy signed_in_catalog on public.menu_item_addons for select to authenticated using ((select private.is_admin()) or exists(select 1 from public.menu_items m join public.categories c on c.id=m.category_id where m.id=menu_item_id and c.active));
create policy signed_in_catalog on public.delivery_zones for select to authenticated using ((select private.is_admin()) or active);

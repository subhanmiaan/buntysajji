-- Update brand contact numbers and email address
alter table public.restaurant_settings add column if not exists whatsapp2 text not null default '';
alter table public.restaurant_settings add column if not exists email text not null default '';

update public.restaurant_settings
set phone = '052 3242 312',
    whatsapp = '+92 3353141888',
    whatsapp2 = '+92 3363141888',
    email = 'Buntysajjisialkot@gmail.com'
where id = 1;

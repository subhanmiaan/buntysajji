import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
export const adminId='10000000-0000-4000-a000-000000000001';
export async function createDatabase(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key,bucket_id text);
 grant usage on schema public to anon,authenticated,service_role;`);
 for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 await db.exec(`insert into auth.users(id) values('${adminId}');insert into public.admin_profiles(user_id,role) values('${adminId}','owner');`);
 return db;
}
export async function asRole(db,role,sql,params=[],uid=''){
 return db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);return tx.query(sql,params);});
}
export async function createFixture(db){
 const category=(await db.query("insert into categories(name) values('Test kitchen') returning *")).rows[0];
 const item={name:'Test Sajji',category_id:category.id,description:'Integration test dish',image_url:'/assets/food/sajji.webp',available:true,featured:true,sort_order:0,variants:[{name:'Half',price:500,available:true},{name:'Full',price:900,available:true}],addons:[{name:'Extra raita',price:50,available:true}]};
 const saved=await asRole(db,'authenticated','select public.save_menu_item($1::jsonb) as id',[JSON.stringify(item)],adminId);
 const id=saved.rows[0].id,variants=(await db.query('select * from menu_item_variants where menu_item_id=$1 order by price',[id])).rows,addons=(await db.query('select * from menu_item_addons where menu_item_id=$1',[id])).rows;
 const zone=(await db.query("insert into delivery_zones(name,delivery_fee,minimum_order,estimated_minutes) values('Test Area',100,600,45) returning *")).rows[0];
 await db.exec('update restaurant_settings set delivery_enabled=true');
 return {category,item:{...item,id,variants,addons},zone};
}

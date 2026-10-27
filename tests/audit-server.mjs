// Isolated browser-test server: real migrations and order functions, ephemeral data.
// Never imported by the production entry point. No hosted credentials are used.
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server/app.mjs';
import {AppError} from '../server/supabase.mjs';
import {createDatabase,createFixture,asRole,adminId} from './database.mjs';
const db=await createDatabase();
await createFixture(db);
await db.exec(readFileSync('supabase/seed.sql','utf8'));
const rows=async(sql,params=[])=>(await db.query(sql,params)).rows;
const rpc=async(sql,params=[])=>{try{return (await asRole(db,'service_role',sql,params)).rows[0].result;}catch(error){throw new AppError(error.message);}};
const repository={
 async catalog(){return {categories:await rows('select * from categories where active order by sort_order,name'),items:await rows(`select m.*,coalesce((select json_agg(v order by v.price,v.name) from menu_item_variants v where v.menu_item_id=m.id),'[]') variants,coalesce((select json_agg(a) from menu_item_addons a where a.menu_item_id=m.id),'[]') addons from menu_items m order by sort_order,name`),settings:(await rows('select * from restaurant_settings where id=1'))[0],zones:await rows('select * from delivery_zones where active')};},
 async deals(){return [];},
 quote:payload=>rpc('select quote_order($1::jsonb) result',[JSON.stringify(payload)]),
 orderAttempt:network=>rpc('select record_order_attempt($1) result',[network]),
 createGuardedOrder:(payload,hash,fingerprint,network)=>rpc('select create_guarded_order($1::jsonb,$2,$3,$4) result',[JSON.stringify(payload),hash,fingerprint,network]),
 async track(number,hash){const order=(await rows('select * from orders where order_number=$1 and tracking_token_hash=$2',[number,hash]))[0];if(!order)return null;delete order.tracking_token_hash;delete order.request_fingerprint;delete order.request_key;order.items=await rows(`select i.*,coalesce((select json_agg(a) from order_item_addons a where a.order_item_id=i.id),'[]') addons from order_items i where order_id=$1`,[order.id]);order.history=await rows('select status,created_at from order_status_history where order_id=$1',[order.id]);return order;},
 async list(table){return rows(`select * from ${safeTable(table)} order by created_at`);},
 async save(table,id,data){
  safeTable(table);const keys=Object.keys(data);if(keys.some(k=>!/^[_a-z]+$/.test(k)))throw new AppError('Invalid field');
  const values=keys.map(k=>typeof data[k]==='object'&&data[k]!==null?JSON.stringify(data[k]):data[k]);
  const sql=id?`update ${table} set ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} where id=$${keys.length+1} returning *`:`insert into ${table}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`;
  try{return (await asRole(db,'authenticated',sql,id?[...values,id]:values,adminId)).rows[0];}catch(error){throw new AppError(error.message);}
 },
 async remove(table,id){try{return await asRole(db,'authenticated',`delete from ${safeTable(table)} where id=$1`,[id],adminId);}catch(error){throw new AppError(error.message);}},
 async saveMenu(data){return (await asRole(db,'authenticated','select save_menu_item($1::jsonb) result',[JSON.stringify(data)],adminId)).rows[0].result;},
 async openOrderCount(){return (await rows("select count(*)::int n from orders where status not in ('completed','cancelled')"))[0].n;},
 async orders({page=1,status='',search=''}){const all=await rows(`select o.*,coalesce((select json_agg(i) from order_items i where i.order_id=o.id),'[]') items from orders o order by created_at desc`);const filtered=all.filter(o=>(status==='active'?!['completed','cancelled'].includes(o.status):!status||o.status===status)&&(!search||[o.order_number,o.customer_name,o.phone].some(v=>v.toLowerCase().includes(search.toLowerCase()))));return {orders:filtered.slice((page-1)*25,page*25),total:filtered.length,page,page_size:25};},
 async order(id){const order=(await rows('select * from orders where id=$1',[id]))[0];return order?repository.track(order.order_number,order.tracking_token_hash):null;},
 async status(id,status){return (await asRole(db,'authenticated','select set_order_status($1,$2) result',[id,status],adminId)).rows[0].result;}
};
function safeTable(table){if(!['restaurant_settings','categories','delivery_zones','promotions','blocked_phones','menu_items'].includes(table))throw new AppError('Unsupported test table');return table;}
const sessions=new Set(['isolated-admin']);
const verify=async token=>{if(!sessions.has(token))throw new AppError('Please sign in again.',401);return {user:{email:'audit@example.invalid'},profile:{role:'owner'},token};};
const services={repository:()=>repository,adminRepository:()=>repository,auth:{verify,async login(email,password){if(email!=='audit@example.invalid'||password!=='isolated-test-password')throw new AppError('Email or password is incorrect.',401);const token=randomUUID();sessions.add(token);return {access_token:token,refresh_token:token,expires_in:3600};},async logout(token){sessions.delete(token);}},async upload(_token,bytes){writeFileSync('dist/assets/audit-upload.webp',bytes);return '/assets/audit-upload.webp';}};
const server=createApp({services,env:{NODE_ENV:'test',APP_URL:'http://127.0.0.1:3100',ORDER_SECURITY_SECRET:'isolated-browser-checkout-secret'}}).listen(3100,'127.0.0.1',()=>console.log('Isolated PostgreSQL browser test server ready'));
async function close(){server.close();await db.close();process.exit(0);}
process.on('SIGTERM',close);process.on('SIGINT',close);

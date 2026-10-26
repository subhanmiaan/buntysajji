// Isolated browser-test server: real migrations and order functions, ephemeral data.
// Never imported by the production entry point. No hosted credentials are used.
import {readFileSync,writeFileSync} from 'node:fs';
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
 async save(table,id,data){if(table!=='restaurant_settings'||id!==1)throw new AppError('Unsupported test operation');return (await asRole(db,'authenticated','update restaurant_settings set homepage=$1 where id=1 returning *',[JSON.stringify(data.homepage)],adminId)).rows[0];}
};
const verify=async token=>{if(token!=='isolated-admin')throw new AppError('Please sign in again.',401);return {user:{email:'audit@example.invalid'},profile:{role:'owner'},token};};
const services={repository:()=>repository,adminRepository:()=>repository,auth:{verify},async upload(_token,bytes){writeFileSync('dist/assets/audit-upload.webp',bytes);return '/assets/audit-upload.webp';}};
const server=createApp({services,env:{NODE_ENV:'test',APP_URL:'http://127.0.0.1:3100',ORDER_SECURITY_SECRET:'isolated-browser-checkout-secret'}}).listen(3100,'127.0.0.1',()=>console.log('Isolated PostgreSQL browser test server ready'));
async function close(){server.close();await db.close();process.exit(0);}
process.on('SIGTERM',close);process.on('SIGINT',close);

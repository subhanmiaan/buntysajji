import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createDatabase,createFixture,asRole,adminId} from './database.mjs';
import {orderSchema,menuSchema} from '../server/validation.mjs';

test('authoritative order transactions, RLS, pricing, idempotency and both status flows',async()=>{
 const db=await createDatabase();try{const {item,zone}=await createFixture(db);
 const payload={items:[{menu_item_id:item.id,variant_id:item.variants[0].id,quantity:2,addon_ids:[item.addons[0].id]}],fulfillment:'delivery',zone_id:zone.id,pickup_mode:'asap',pickup_at:null,customer_name:'Test Customer',phone:'03001234567',address:'123 Test Street',landmark:'Test corner',instructions:'Test order',request_key:randomUUID(),expected_total:1200};
 const quote=async p=>(await asRole(db,'service_role','select quote_order($1::jsonb) as result',[JSON.stringify(p)])).rows[0].result;
 const create=async(p=payload,hash='a'.repeat(64),fingerprint='b'.repeat(64))=>(await asRole(db,'service_role','select create_order($1::jsonb,$2,$3) as result',[JSON.stringify(p),hash,fingerprint])).rows[0].result;
 assert.deepEqual((({subtotal,delivery_fee,total})=>({subtotal,delivery_fee,total}))(await quote(payload)),{subtotal:1100,delivery_fee:100,total:1200});
 await assert.rejects(()=>quote({...payload,items:[{...payload.items[0],quantity:1}]}),/Minimum order/);
 await assert.rejects(()=>quote({...payload,items:[{...payload.items[0],quantity:0}]}),/Quantity/);
 await assert.rejects(()=>quote({...payload,items:[{...payload.items[0],addon_ids:[item.addons[0].id,item.addons[0].id]}]}),/Duplicate/);
 await assert.rejects(()=>quote({...payload,items:[{...payload.items[0],variant_id:randomUUID()}]}),/portion/);
 await assert.rejects(()=>quote({...payload,zone_id:randomUUID()}),/delivery area/);
 await assert.rejects(()=>create({...payload,expected_total:1}),/Prices changed/);
 assert.equal((await db.query('select count(*)::int as n from orders')).rows[0].n,0);
 const order=await create();assert.match(order.order_number,/^BS-\d+$/);assert.deepEqual(await create(),order);
 await assert.rejects(()=>create(payload,'c'.repeat(64)),/already been used/);
 const saved=(await db.query('select * from orders where id=$1',[order.id])).rows[0];assert.equal(saved.payment_method,'cash_on_delivery');assert.equal(saved.payment_status,'pending');assert.equal(saved.status,'new');
 assert.equal((await db.query('select count(*)::int as n from order_items')).rows[0].n,1);assert.equal((await db.query('select count(*)::int as n from order_item_addons')).rows[0].n,1);
 for(const role of ['anon','authenticated']){
  if(role==='anon')await assert.rejects(()=>asRole(db,role,'select * from orders'),/permission denied/);
  await assert.rejects(()=>asRole(db,role,'select create_order($1::jsonb,$2,$3)',[JSON.stringify(payload),'a'.repeat(64),'b'.repeat(64)]),/permission denied/);
 }
 assert.equal((await asRole(db,'authenticated','select * from orders')).rows.length,0);
 await assert.rejects(()=>asRole(db,'authenticated',"insert into admin_profiles(user_id) values($1)",[randomUUID()]),/permission denied/);
 await assert.rejects(()=>asRole(db,'authenticated','update orders set total=1 where id=$1',[order.id],adminId),/permission denied/);
 await assert.rejects(()=>asRole(db,'authenticated','select set_order_status($1,$2)',[order.id,'completed'],adminId),/Invalid status/);
 await assert.rejects(()=>asRole(db,'authenticated','select set_order_status($1,$2)',[order.id,'confirmed']),/Admin access/);
 for(const status of ['confirmed','preparing','out_for_delivery','completed'])await asRole(db,'authenticated','select set_order_status($1,$2)',[order.id,status],adminId);
 assert.equal((await db.query('select payment_status from orders where id=$1',[order.id])).rows[0].payment_status,'paid');
 assert.equal((await db.query('select count(*)::int as n from order_status_history where order_id=$1',[order.id])).rows[0].n,5);
 await assert.rejects(()=>asRole(db,'authenticated','select set_order_status($1,$2)',[order.id,'cancelled'],adminId),/closed/);
 const takeaway={...payload,fulfillment:'takeaway',zone_id:null,request_key:randomUUID(),expected_total:1100};
 const pickup=await create(takeaway);assert.equal((await db.query('select payment_method from orders where id=$1',[pickup.id])).rows[0].payment_method,'cash_on_pickup');
 for(const status of ['confirmed','preparing'])await asRole(db,'authenticated','select set_order_status($1,$2)',[pickup.id,status],adminId);
 await assert.rejects(()=>asRole(db,'authenticated','select set_order_status($1,$2)',[pickup.id,'out_for_delivery'],adminId),/Invalid status/);
 for(const status of ['ready_for_pickup','completed'])await asRole(db,'authenticated','select set_order_status($1,$2)',[pickup.id,status],adminId);
 await assert.rejects(()=>quote({...takeaway,pickup_mode:'scheduled',pickup_at:new Date().toISOString()}),/Pickup must/);
 const later=new Date(Date.now()+3600000).toISOString();assert.ok((await quote({...takeaway,pickup_mode:'scheduled',pickup_at:later})).pickup_at);
 await db.query('update menu_item_variants set price=700 where id=$1',[item.variants[0].id]);assert.equal((await db.query('select unit_price from order_items where order_id=$1',[order.id])).rows[0].unit_price,'500.00');
 await db.query('update menu_items set available=false where id=$1',[item.id]);await assert.rejects(()=>quote(payload),/no longer available/);
 await db.query('delete from menu_items where id=$1',[item.id]);assert.equal((await db.query('select item_name from order_items where order_id=$1',[order.id])).rows[0].item_name,'Test Sajji');
 }finally{await db.close();}
});

test('request validation rejects invented prices, invalid quantities and unknown payment methods',()=>{
 const line={menu_item_id:randomUUID(),variant_id:randomUUID(),quantity:1,addon_ids:[]};const base={items:[line],fulfillment:'takeaway',customer_name:'Test Customer',phone:'03001234567',request_key:randomUUID(),tracking_token:'a'.repeat(64),expected_total:500};
 assert.ok(orderSchema.safeParse(base).success);assert.equal(orderSchema.safeParse({...base,payment_method:'card'}).success,false);assert.equal(orderSchema.safeParse({...base,items:[{...line,price:1}]}).success,false);assert.equal(orderSchema.safeParse({...base,items:[{...line,quantity:1.5}]}).success,false);assert.equal(orderSchema.safeParse({...base,fulfillment:'delivery'}).success,false);
 assert.equal(menuSchema.safeParse({name:'X',category_id:randomUUID(),description:'',image_url:'javascript:alert(1)',available:true,featured:false,variants:[{name:'Regular',price:1}],addons:[]}).success,false);
});

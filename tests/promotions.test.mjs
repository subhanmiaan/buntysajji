import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createDatabase,createFixture,asRole,adminId} from './database.mjs';
import {promotionSchema,homepageSchema} from '../server/validation.mjs';

test('offers: authoritative discounts, expiry, limits, retries, history and access control',async()=>{
 const db=await createDatabase();try{
 const {item,zone}=await createFixture(db);
 const base={items:[{menu_item_id:item.id,variant_id:item.variants[0].id,quantity:2,addon_ids:[]}],fulfillment:'delivery',zone_id:zone.id,customer_name:'Offer Test',phone:'03001234567',address:'Test street 123',request_key:randomUUID(),expected_total:1000};
 const quote=async payload=>(await asRole(db,'service_role','select quote_order($1::jsonb) as q',[JSON.stringify(payload)])).rows[0].q;
 const create=async payload=>(await asRole(db,'service_role','select create_order($1::jsonb,$2,$3) as q',[JSON.stringify(payload),'a'.repeat(64),'b'.repeat(64)])).rows[0].q;
 const deal=(await db.query("insert into promotions(name,kind,discount_type,discount_value,starts_at,ends_at,active) values('Dinner deal','deal','percent',10,now()-interval '1 hour',now()+interval '1 day',true) returning id")).rows[0];
 const q=await quote(base);assert.equal(q.subtotal,1000);assert.equal(q.discount,100);assert.equal(q.total,1000);assert.equal(q.delivery_fee,100);
 const voucher=(await db.query("insert into promotions(name,kind,code,discount_type,discount_value,minimum_order,maximum_discount,starts_at,ends_at,usage_limit,active) values('Welcome','voucher','WELCOME','percent',25,900,200,now()-interval '1 hour',now()+interval '1 day',1,true) returning id")).rows[0];
 const payload={...base,voucher_code:'welcome',expected_total:900};
 assert.equal((await quote(payload)).discount,200);assert.equal((await quote(payload)).total,900);
 await assert.rejects(()=>quote({...base,voucher_code:'MISSING'}),/Voucher/);
 await assert.rejects(()=>quote({...payload,fulfillment:'takeaway',zone_id:null,items:[{...base.items[0],quantity:1}]}),/Voucher/);
 await assert.rejects(()=>create({...payload,expected_total:1}),/Prices changed/);
 assert.equal((await db.query('select used_count from promotions where id=$1',[voucher.id])).rows[0].used_count,0);
 const order=await create(payload);assert.deepEqual(await create(payload),order);
 assert.equal((await db.query('select used_count from promotions where id=$1',[voucher.id])).rows[0].used_count,1);
 await assert.rejects(()=>create({...payload,request_key:randomUUID()}),/Voucher/);
 const saved=(await db.query('select * from orders where id=$1',[order.id])).rows[0];assert.equal(saved.discount,'200.00');assert.equal(saved.promotion_name,'Welcome');assert.equal(saved.voucher_code,'WELCOME');
 await db.query('update promotions set usage_limit=10,ends_at=now()-interval \'1 minute\' where id=$1',[voucher.id]);await assert.rejects(()=>quote(payload),/Voucher/);
 await db.query("update promotions set ends_at=now()+interval '2 days',starts_at=now()+interval '1 day' where id=$1",[voucher.id]);await assert.rejects(()=>quote(payload),/Voucher/);
 await db.query('update promotions set discount_value=2000,discount_type=\'fixed\' where id=$1',[deal.id]);assert.equal((await quote(base)).total,100);
 await db.query('update promotions set active=false where id=$1',[deal.id]);assert.equal((await quote(base)).discount,0);
 await assert.rejects(()=>asRole(db,'anon','select * from promotions'),/permission denied/);
 assert.equal((await asRole(db,'authenticated','select * from promotions')).rows.length,0);
 assert.equal((await asRole(db,'authenticated','select * from promotions',[],adminId)).rows.length,2);
 await assert.rejects(()=>asRole(db,'authenticated','update promotions set used_count=0 where id=$1',[voucher.id],adminId),/permission denied/);
 await assert.rejects(()=>asRole(db,'anon','select quote_order($1::jsonb)',[JSON.stringify(base)]),/permission denied/);
 await db.query('delete from promotions where id=$1',[voucher.id]);const history=(await db.query('select discount,promotion_name from orders where id=$1',[order.id])).rows[0];assert.equal(history.discount,'200.00');assert.equal(history.promotion_name,'Welcome');
 }finally{await db.close();}
});

test('promotion and homepage input validation',()=>{
 const valid={name:'Summer',description:'',kind:'voucher',code:'SAVE10',discount_type:'percent',discount_value:10,minimum_order:1000,maximum_discount:null,starts_at:'2026-10-01T00:00:00Z',ends_at:'2026-10-31T00:00:00Z',usage_limit:100,active:true};
 assert.ok(promotionSchema.safeParse(valid).success);
 for(const changes of [{discount_value:101},{maximum_discount:0},{ends_at:valid.starts_at},{code:null},{usage_limit:0},{kind:'deal'},{used_count:0}])assert.equal(promotionSchema.safeParse({...valid,...changes}).success,false);
 assert.equal(homepageSchema.safeParse({hero_title:'Hello',hero_subtitle:'Welcome',hero_image:'javascript:alert(1)',button_label:'Menu',show_deals:true,show_story:true,show_featured:true,featured_count:3}).success,false);
});

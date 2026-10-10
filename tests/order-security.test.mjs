import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {createDatabase,createFixture,asRole,adminId} from './database.mjs';
import {orderSecurity} from '../server/order-security.mjs';
import {customerPhone} from '../server/validation.mjs';
import {createApp} from '../server/app.mjs';

test('checkout signatures, trusted IP handling and phone normalization',()=>{
 const secret='security-test-secret',guard=orderSecurity({ORDER_SECURITY_SECRET:secret}),fresh=guard.issue();
 assert.throws(()=>guard.verify(fresh),/wait/);
 const sign=age=>{const value=(Date.now()-age)+'.'+'a'.repeat(48);return value+'.'+createHmac('sha256',secret).update('bunty-checkout-v1:'+value).digest('hex');};
 assert.doesNotThrow(()=>guard.verify(sign(3000)));assert.throws(()=>guard.verify(sign(3*3600000)),/wait/);assert.throws(()=>guard.verify(sign(3000).slice(0,-1)+'z'),/refresh/);
 const req={ip:'127.0.0.1',get:()=> '8.8.8.8'};assert.equal(guard.network(req),guard.network({...req,get:()=> '1.1.1.1'}));
 const deployed=orderSecurity({ORDER_SECURITY_SECRET:secret,VERCEL:'1'});assert.notEqual(deployed.network(req),deployed.network({...req,get:()=> '1.1.1.1'}));
 assert.equal(deployed.network({...req,get:()=> '2001:db8:abcd:1200::1'}),deployed.network({...req,get:()=> '2001:db8:abcd:12ff::2'}));
 for(const number of ['0300 1234567','+92 300 1234567','00923001234567'])assert.equal(customerPhone.parse(number),'923001234567');
 for(const number of ['1234567','00000000000','+15551234567'])assert.equal(customerPhone.safeParse(number).success,false);
});

test('HTTP checkout rejects missing sessions, traps and forged fields before placing an order',async()=>{
 const secret='http-test-secret';let creates=0,allow=true;
 const repository={orderAttempt:async()=>allow,createGuardedOrder:async()=>{creates++;return {order_number:'BS-TEST'};}};
 const app=createApp({services:{repository:()=>repository},env:{NODE_ENV:'test',ORDER_SECURITY_SECRET:secret}}),server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const base={items:[{menu_item_id:randomUUID(),variant_id:randomUUID(),quantity:1,addon_ids:[]}],fulfillment:'takeaway',customer_name:'HTTP Test',phone:'03001234567',request_key:randomUUID(),tracking_token:'a'.repeat(64),expected_total:500};
 const value=(Date.now()-3000)+'.'+'a'.repeat(48),token=value+'.'+createHmac('sha256',secret).update('bunty-checkout-v1:'+value).digest('hex');
 const post=(data,cookie='bs_checkout='+token)=>fetch(origin+'/api/orders',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(data)});
 try{
  assert.equal((await post(base,'')).status,403);assert.equal((await post({...base,website:'bot-filled'})).status,400);assert.equal((await post({...base,network_hash:'invented'})).status,400);assert.equal(creates,0);
  assert.equal((await post(base)).status,201);assert.equal(creates,1);
  allow=false;const throttled=await post(base);assert.equal(throttled.status,429);assert.equal(throttled.headers.get('retry-after'),'600');assert.equal(creates,1);
  const session=await fetch(origin+'/api/checkout-session');assert.equal(session.status,200);assert.match(session.headers.get('set-cookie'),/HttpOnly/);assert.match(session.headers.get('set-cookie'),/SameSite=Strict/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('shared attempt limits, order limits, blocklist and safe retry behavior',async()=>{
 const db=await createDatabase();try{
 const {item}=await createFixture(db),network='d'.repeat(64);
 for(let i=1;i<=21;i++){const result=await asRole(db,'service_role','select record_order_attempt($1) as allowed',[network]);assert.equal(result.rows[0].allowed,i<=20);}
 await db.exec("update private.order_attempts set window_start=now()-interval '11 minutes'");assert.equal((await asRole(db,'service_role','select record_order_attempt($1) as allowed',[network])).rows[0].allowed,true);
 const payload={items:[{menu_item_id:item.id,variant_id:item.variants[0].id,quantity:1,addon_ids:[]}],fulfillment:'takeaway',customer_name:'Abuse Test',phone:'923001234567',request_key:randomUUID(),expected_total:500};
 const create=async(p=payload,n=network)=>(await asRole(db,'service_role','select create_guarded_order($1::jsonb,$2,$3,$4) as result',[JSON.stringify(p),'a'.repeat(64),'b'.repeat(64),n])).rows[0].result;
 const first=await create();assert.deepEqual(await create(),first);
 await assert.rejects(()=>create({...payload,request_key:randomUUID()}),/just placed/);
 await db.exec("update orders set created_at=now()-interval '1 minute'");const second=await create({...payload,request_key:randomUUID()});assert.ok(second.id);
 await assert.rejects(()=>create({...payload,request_key:randomUUID()}),/two active/);
 await asRole(db,'authenticated','insert into blocked_phones(phone,reason) values($1,$2)',['923009999999','Confirmed test spam'],adminId);
 await assert.rejects(()=>create({...payload,phone:'923009999999',request_key:randomUUID()}),/unavailable/);
 await asRole(db,'authenticated','insert into blocked_phones(phone,reason) values($1,$2)',['923001234567','Confirmed test spam'],adminId);assert.deepEqual(await create(),first);
 await assert.rejects(()=>asRole(db,'anon','select * from blocked_phones'),/permission denied/);assert.equal((await asRole(db,'authenticated','select * from blocked_phones')).rows.length,0);
 await assert.rejects(()=>asRole(db,'authenticated','select * from private.order_networks',[],adminId),/permission denied/);
 await assert.rejects(()=>asRole(db,'anon','select record_order_attempt($1)',[network]),/permission denied/);
 await assert.rejects(()=>asRole(db,'authenticated','select create_guarded_order($1::jsonb,$2,$3,$4)',[JSON.stringify(payload),'a'.repeat(64),'b'.repeat(64),network],adminId),/permission denied/);
 }finally{await db.close();}
});

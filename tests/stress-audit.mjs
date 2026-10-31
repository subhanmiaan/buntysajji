// Local-only adversarial HTTP checks. Never targets the production website.
import assert from 'node:assert/strict';
import './audit-server.mjs';
const origin='http://127.0.0.1:3100';
const post=(path,body)=>fetch(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
try{
 const concurrent=await Promise.all(Array.from({length:30},()=>fetch(origin+'/api/catalog')));
 assert(concurrent.every(response=>response.status===200));
 const catalog=await concurrent[0].json(),item=catalog.items.find(i=>i.name==='Test Sajji');
 const invalid=[null,[],{}, {items:'bad'}, {items:[null]}, {items:[{menu_item_id:item.id,variant_id:item.variants[0].id,quantity:1e20,addon_ids:[]}]}, {items:Array(51).fill({})}, {items:[],fulfillment:'invalid'}, {customer_name:'<script>alert(1)</script>'}];
 const quoteStatuses=[];for(let i=0;i<120;i++)quoteStatuses.push((await post('/api/quote',invalid[i%invalid.length])).status);
 assert(quoteStatuses.every(status=>status===400||status===429));assert(quoteStatuses.includes(429));
 const loginStatuses=[];for(let i=0;i<15;i++)loginStatuses.push((await post('/api/auth/login',{email:'audit@example.invalid',password:'definitely-wrong-password'})).status);
 assert(loginStatuses.every(status=>status===401||status===429));assert(loginStatuses.includes(429));
 const orders=await(await fetch(origin+'/api/admin/orders',{headers:{Cookie:'bs_access=isolated-admin'}})).json();assert.equal(orders.total,0);
 assert.equal((await fetch(origin+'/api/health')).status,200);
 console.log(JSON.stringify({concurrentCatalogReads:30,malformedQuoteAttempts:120,invalidLoginAttempts:15,quoteRateLimited:quoteStatuses.filter(s=>s===429).length,loginRateLimited:loginStatuses.filter(s=>s===429).length,serverErrors:0,ordersCreated:0}));
 process.exit(0);
}catch(error){console.error(error);process.exit(1);}

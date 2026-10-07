'use strict';
window.Bunty=(()=>{
 const key='bunty-cart-v3';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=value=>'Rs. '+Number(value).toLocaleString('en-PK',{maximumFractionDigits:2});
 async function api(path,{body,method='GET',headers={},...options}={}){const response=await fetch(path,{method,credentials:'same-origin',...options,headers:{...(body instanceof FormData?{}:{'Content-Type':'application/json'}),...headers},...(body===undefined?{}:{body:body instanceof FormData?body:JSON.stringify(body)})});if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('The ordering server is unavailable. Please call the restaurant.');const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Request failed'),{status:response.status});return data;}
 let catalog=null,error=null,cart=[];
 try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))cart=saved.filter(x=>typeof x.menu_item_id==='string'&&typeof x.variant_id==='string'&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=99&&Array.isArray(x.addon_ids)).slice(0,50);}catch{/* Storage may be disabled. */}
 function save(){try{localStorage.setItem(key,JSON.stringify(cart));}catch{/* Cart still works in memory. */}window.dispatchEvent(new Event('cartchange'));}
 const ready=api('/api/catalog').then(data=>{catalog=data;return data;}).catch(e=>{error=e.message;return null;});
 function add(menuItemId,variantId,addonIds=[]){const sorted=[...addonIds].sort();const line=cart.find(x=>x.menu_item_id===menuItemId&&x.variant_id===variantId&&JSON.stringify(x.addon_ids)===JSON.stringify(sorted));if(line)line.quantity=Math.min(99,line.quantity+1);else{if(cart.length>=50)throw new Error('Your bag can contain up to 50 different selections.');cart.push({menu_item_id:menuItemId,variant_id:variantId,quantity:1,addon_ids:sorted});}save();}
 function entries(){return cart.map((line,index)=>{const item=catalog?.items.find(i=>i.id===line.menu_item_id);const variant=item?.variants.find(v=>v.id===line.variant_id);const addons=line.addon_ids.map(id=>item?.addons.find(a=>a.id===id));const available=item?.available&&variant?.available&&addons.every(a=>a?.available);const price=Number(variant?.price||0)+addons.reduce((s,a)=>s+Number(a?.price||0),0);return {...line,index,item,variant,addons,available,price,total:price*line.quantity};});}
 window.addEventListener('storage',e=>{if(e.key===key)location.reload();});
 return {escape,money,api,ready,get catalog(){return catalog;},get error(){return error;},get cart(){return cart;},add,entries,
  quantity(index,delta){if(!cart[index])return;cart[index].quantity=Math.min(99,cart[index].quantity+delta);cart=cart.filter(x=>x.quantity>0);save();},remove(index){cart.splice(index,1);save();},clear(){cart=[];save();},
  subtotal(){return entries().reduce((sum,e)=>sum+e.total,0);},count(){return cart.reduce((sum,e)=>sum+e.quantity,0);}
 };
})();

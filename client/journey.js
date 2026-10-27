'use strict';
window.PublicJourney=(()=>{
 const B=window.Bunty,e=B.escape;
 const events=new Set(['menu_click','whatsapp_click','add_to_cart','checkout_started','checkout_abandoned','order_completed']);
 let checkoutStarted=false,completed=false;
 function track(event){
  if(!events.has(event)||navigator.doNotTrack==='1'||navigator.globalPrivacyControl)return;
  try{navigator.sendBeacon('/api/events',new Blob([JSON.stringify({event})],{type:'application/json'}));}catch{/* Analytics must never interrupt an order. */}
 }
 function intent(){try{return sessionStorage.getItem('bunty-fulfillment');}catch{return null;}}
 function remember(value){if(!['delivery','takeaway'].includes(value))return;try{sessionStorage.setItem('bunty-fulfillment',value);}catch{/* Checkout still offers both methods. */}}
 const requested=new URLSearchParams(location.search).get('fulfillment');if(requested)remember(requested);
 function whatsapp(settings,text){const number=String(settings?.whatsapp||'923353141888').replace(/\D/g,'');return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;}
 function cartMessage(notes=''){
  const entries=B.entries();
  return 'Assalam-o-Alaikum, I would like to order from Bunty Sajji.\n'+(intent()==='delivery'?'Delivery':'Pickup / delivery to confirm')+'\n'+entries.map(x=>`${x.quantity} × ${x.item?.name||'Saved dish'} — ${x.variant?.name||'portion to confirm'}${x.addons.length?' + '+x.addons.map(a=>a?.name||'add-on').join(', '):''}`).join('\n')+(entries.length?'\nFood subtotal: '+B.money(B.subtotal()):'')+(notes?'\nNotes: '+notes:'')+'\nPlease confirm availability, final total and timing before preparing.';
 }
 function enhance(catalog){
  const s=catalog?.settings||{},main=document.querySelector('#main');
  const orderWays=document.createElement('section');orderWays.className='order-options';orderWays.setAttribute('aria-label','Ways to order');
  const delivery=catalog?Boolean(s.delivery_enabled&&catalog.zones.some(z=>z.active)):null,pickup=catalog?Boolean(s.takeaway_enabled):null;
  orderWays.innerHTML=`<div><span class="eyebrow">YOUR FEAST, YOUR WAY</span><p>Choose how you’d like to join us.</p></div><div class="order-options-links"><a class="button" data-fulfillment="delivery" href="/menu/?fulfillment=delivery">${delivery===false?'CHECK DELIVERY':'ORDER DELIVERY'} ↗</a><a class="button" data-fulfillment="takeaway" href="/menu/?fulfillment=takeaway">${pickup===false?'CHECK PICKUP':'PICKUP'} ↗</a><a class="text-link" href="#visit">DINE IN ↗</a><a class="text-link" href="${e(whatsapp(s,'Assalam-o-Alaikum, I would like to order from Bunty Sajji. Please help me choose delivery or pickup.'))}" target="_blank" rel="noopener noreferrer">ORDER ON WHATSAPP ↗</a></div><p class="caption">${catalog?`${delivery?'Delivery available in the areas listed below and at checkout.':'Online delivery is currently unavailable; contact us for options.'} ${pickup?'Pickup available. Pay cash on collection.':'Online pickup is currently paused.'}`:'Checking online availability. You can still browse the menu or contact us on WhatsApp.'}</p>`;
  const route=location.pathname.split('/').filter(Boolean)[0]||'home';
  if(['home','menu'].includes(route)){const anchor=main.querySelector('.hero,.page-intro');anchor?.after(orderWays);}
  document.querySelectorAll('[data-whatsapp-order],.whatsapp-contact').forEach(a=>{a.href=whatsapp(s,'Assalam-o-Alaikum, I would like to order from Bunty Sajji. Please confirm today’s availability.');});
  const signature=catalog?.items.find(p=>p.available&&p.name==='Chicken Sajji');
  const portion=signature?.variants.filter(v=>v.available).sort((a,b)=>Number(a.price)-Number(b.price))[0];
  if(portion){const price=document.createElement('p');price.className='signature-price';price.textContent=`${signature.name} · ${portion.name} · ${B.money(portion.price)}`;document.querySelector('.hero-buttons')?.before(price);}
  const contacts=document.querySelector('.visit-details');
  contacts?.querySelectorAll('.whatsapp-badge').forEach((badge,i)=>{badge.textContent=i===0?'WhatsApp orders':'Alternate WhatsApp';});
  const phone=contacts?.querySelector('.phone-link');if(phone){const label=document.createElement('small');label.textContent='Call us · landline';phone.before(label);}
  const visit=document.querySelector('#visit');
  if(visit){const group=document.createElement('section');group.className='section dining-enquiry';group.id='dining';group.innerHTML=`<div><span class="eyebrow">BRING YOUR PEOPLE</span><h2>A TABLE.<br><em>A LITTLE TOGETHERNESS.</em></h2><p>Planning a family meal, birthday or group visit? Ask our team about seating, availability and arrangements before making plans.</p><a class="button" href="${e(whatsapp(s,'Assalam-o-Alaikum, I am planning a group visit. Please confirm seating and any birthday/event arrangements available. Date: \nNumber of guests: '))}" target="_blank" rel="noopener noreferrer">ASK ABOUT YOUR VISIT ↗</a></div><div class="trust-note"><h3>GET TO KNOW US</h3><p>Find our location and customer feedback on Google Maps, or see updates from our team on Instagram.</p><a class="text-link" data-review-source href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent((s.name||'Bunty Sajji')+' '+(s.address||'Alam Chowk Sialkot'))}" target="_blank" rel="noopener noreferrer">FIND US ON GOOGLE MAPS ↗</a><a class="text-link" href="${e(s.instagram||'https://www.instagram.com/buntysajjisialkot/')}" target="_blank" rel="noopener noreferrer">VISIT OUR INSTAGRAM ↗</a></div>`;if(['home','about'].includes(route))visit.before(group);}
  const options=s.homepage||{},dining=document.querySelector('#dining');
  document.querySelectorAll('.order-options-links a[href="#visit"]').forEach(link=>{link.href=dining?'#dining':'/#dining';});
  if(dining&&route==='home')main.querySelector('.story')?.before(dining);
  if(dining&&options.dining_enabled&&options.dining_title&&options.dining_description){
   dining.querySelector('h2').textContent=options.dining_title;dining.querySelector('p').textContent=options.dining_description;
   if(options.dining_capacity){const capacity=document.createElement('p');capacity.textContent=options.dining_capacity;dining.querySelector('h2').after(capacity);}
   if(options.dining_image){const img=document.createElement('img');img.className='dining-photo';img.src=options.dining_image;img.alt=options.dining_title;img.width=800;img.height=600;img.loading='lazy';dining.prepend(img);}
  }
  if(['home','about'].includes(route)&&options.review_enabled&&options.review_quote&&options.review_author&&/^https:\/\//.test(options.review_url||'')){
   const reviews=document.createElement('section');reviews.id='reviews';reviews.className='section reviews-section';reviews.setAttribute('aria-labelledby','reviews-title');
   reviews.innerHTML=`<span class="eyebrow">FROM OUR CUSTOMERS</span><h2 id="reviews-title">CUSTOMER REVIEWS.</h2><figure class="customer-review"><blockquote>${e(options.review_quote)}</blockquote><figcaption>${e(options.review_author)} · <a class="text-link" href="${e(options.review_url)}" target="_blank" rel="noopener noreferrer">Read the original review ↗</a></figcaption></figure>`;
   if(dining)dining.before(reviews);else main.append(reviews);
   const link=document.createElement('a');link.className='text-link';link.href='#reviews';link.textContent='READ REVIEWS ↗';orderWays.querySelector('.order-options-links').append(link);
  }
  const map=document.querySelector('.visit-actions a[href*="google.com/maps"]');if(map)map.setAttribute('aria-label','Get directions to Bunty Sajji, Alam Chowk, Sialkot');
  if(['#dining','#reviews'].includes(location.hash))requestAnimationFrame(()=>document.querySelector(location.hash)?.scrollIntoView({block:'start',behavior:'instant'}));
 }
 document.addEventListener('click',event=>{const link=event.target.closest('a');if(!link)return;if(link.dataset.fulfillment)remember(link.dataset.fulfillment);if(link.href.includes('wa.me/'))track('whatsapp_click');else if(new URL(link.href).pathname==='/menu/')track('menu_click');});
 window.addEventListener('pagehide',()=>{if(checkoutStarted&&!completed&&B.cart.length)track('checkout_abandoned');});
 return {enhance,intent,remember,track,whatsapp,cartMessage,startCheckout(){checkoutStarted=true;track('checkout_started');},complete(){completed=true;track('order_completed');}};
})();

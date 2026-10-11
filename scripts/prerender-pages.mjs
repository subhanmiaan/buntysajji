import {runInNewContext} from 'node:vm';

export function prerenderPages({app,data,photos}){
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const photo=url=>`src="${photos[url]?.src||url}"${photos[url]?.srcset?` srcset="${photos[url].srcset}" sizes="(max-width:680px) 90vw, 33vw"`:''}`;
 const intro=(label,title,description)=>`<section class="page-intro"><span class="eyebrow">${label}</span><h1>${title}</h1><p>${description}</p></section><div class="truck-border" aria-hidden="true"></div>`;
 const loading=message=>`<section class="catalog-placeholder" aria-busy="true"><p role="status">${message}</p><div class="food-grid" aria-hidden="true"><div></div><div></div><div></div></div></section>`;
 const context={window:{}};runInNewContext(data,context);
 const dishes=context.window.previewMenu;
 if(!Array.isArray(dishes))throw new Error('Preview menu is missing');
 const story=app.match(/const story=`([\s\S]*?)`;/)?.[1];
 if(!story)throw new Error('Story template is missing');
 const menu=intro('THE Bunty سجی MENU','PICK YOUR<br><em>DESI FAVOURITE.</em>','Sajji, karahi, BBQ and a little of everything you love.')+`<section class="section"><p class="catalog-loading" role="status">Loading current prices and availability. Ordering will be ready shortly. <a href="tel:0523242312">Call to order</a>.</p><div class="food-grid">${dishes.map(p=>`<article class="food-card"><div class="card-art"><img ${photo('/assets/food/'+p.image+'.webp')} alt="${escape(p.name)}" width="300" height="220" loading="lazy"><span>${escape(p.category)}</span></div><div class="food-info"><h3>${escape(p.name)}</h3><p>${escape(p.description||'')}</p><p class="caption">Checking price and availability…</p></div></article>`).join('')}</div></section>`;
 const about=intro('OUR KIND OF GOOD FOOD','ROOTED IN FLAVOUR.<br><em>MADE FOR SHARING.</em>','For the family catch-up, the friends’ feast, and every “bas ek aur bite” in between.')+story.replace(/\$\{photo\("([^"]+)"\)\}/g,(_m,url)=>photo(url));
 const gallery=intro('STRAIGHT FROM THE MENU','TAKE A<br><em>CLOSER LOOK.</em>','Browse all six original menu sheets. Open a sheet to zoom. Live prices and availability are confirmed at checkout.')+`<section class="section gallery-grid">${['Welcome to Bunty سجی','Sajji, fish & BBQ','Kabab, chicken karahi & handi','Beef karahi, tawa & sides','Rolls, burgers, drinks & tandoor','Platters & special deals'].map((title,i)=>`<a class="gallery-card" href="/assets/menu-${i+1}.jpg" target="_blank" rel="noopener"><img src="/assets/menu-${i+1}-preview.webp" alt="${escape(title)} original menu" width="850" height="1200" loading="lazy"><span>${escape(title)} ↗</span></a>`).join('')}</section>`;
 return {
 'menu/index.html':menu,'about/index.html':about,'gallery/index.html':gallery,
 'checkout.html':intro('YOUR Bunty سجی ORDER','CHECKOUT.','Choose delivery or takeaway. Pay cash when your food arrives or when you collect it.')+loading('Your saved bag is safe. Loading current prices and delivery options…'),
 'order.html':intro('YOUR ORDER','ORDER STATUS.','Your private order details will appear here.')+loading('Loading the latest order status…'),
 '404.html':intro('PAGE NOT FOUND','A LITTLE<br><em>OFF THE MENU.</em>','Let’s get you back to the good food.')+'<section class="section"><a class="button" href="/menu/">EXPLORE THE MENU ↗</a></section>'
 };
}

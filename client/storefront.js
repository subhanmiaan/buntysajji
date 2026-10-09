'use strict';
window.Storefront={
 async enhance(catalog){
  const e=window.Bunty.escape,m=window.Bunty.money,s=catalog?.settings?.homepage||{};
  window.BuntyTheme.configure(s);
  const hero=document.querySelector('.hero');if(!hero)return;
  const title=hero.querySelector('h1');if(s.hero_title)title.textContent=s.hero_title;
  if(s.hero_subtitle)hero.querySelector('.hero-copy>p').textContent=s.hero_subtitle;
  if(s.hero_image)hero.querySelector('.hero-dish').src=s.hero_image;
  if(s.button_label)hero.querySelector('.hero-buttons .button').textContent=s.button_label+' ↗';
  hero.querySelector('.hero-dish').alt='Signature roasted sajji served with rice';
  if(s.announcement){const banner=document.createElement('div');banner.className='announcement';banner.textContent=s.announcement;hero.before(banner);}
  if(s.show_story===false)document.querySelector('.story')?.remove();
  if(s.show_featured===false)document.querySelector('.food-grid')?.closest('section')?.remove();
  if(s.show_deals===false||!catalog)return;
  let deals;try{deals=await window.Bunty.api('/api/deals');}catch{return;}
  if(!deals.length)return;
  const section=document.createElement('section');section.className='section deals-section';section.id='deals';
  section.innerHTML=`<div class="section-heading"><div><span class="eyebrow">A LITTLE MORE TO LOVE</span><h2>HOT OFFERS.<br><em>HAPPY TABLES.</em></h2></div><p>Limited-time savings, automatically applied at checkout. One offer per order.</p></div><div class="deal-grid">${deals.map(p=>`<article class="deal-card" data-deal-end="${e(p.ends_at)}"><div class="deal-top"><span>LIMITED TIME</span><span data-countdown></span></div><strong class="deal-saving">${p.discount_type==='percent'?Number(p.discount_value)+'%':m(p.discount_value)} <small>OFF</small></strong><h3>${e(p.name)}</h3><p>${e(p.description)}</p><p class="deal-terms">Minimum ${m(p.minimum_order)}${p.maximum_discount!==null?' · Save up to '+m(p.maximum_discount):''}</p><a class="button" href="/menu/">BUILD YOUR FEAST ↗</a></article>`).join('')}</div>`;
  document.querySelector('.discovery')?.after(section);
  const tick=()=>{let active=0;section.querySelectorAll('[data-deal-end]').forEach(card=>{const seconds=Math.max(0,Math.floor((new Date(card.dataset.dealEnd)-Date.now())/1000));card.hidden=seconds===0;if(seconds){active++;const days=Math.floor(seconds/86400),h=Math.floor(seconds%86400/3600),min=Math.floor(seconds%3600/60);card.querySelector('[data-countdown]').textContent=`${days?days+'d ':''}${h}h ${min}m ${seconds%60}s left`;}});section.hidden=!active;};tick();const timer=setInterval(tick,1000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 }
};

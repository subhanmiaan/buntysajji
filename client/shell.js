'use strict';
(()=>{
 const toggle=document.querySelector('.mobile-toggle'),nav=document.querySelector('header nav');
 if(toggle&&nav){toggle.onclick=()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);};document.addEventListener('keydown',event=>{if(event.key==='Escape'){toggle.setAttribute('aria-expanded','false');nav.classList.remove('open');}});}
 const bag=document.querySelector('[data-bag]');if(bag)bag.onclick=()=>{if(!window.publicReady){const d=document.querySelector('#bag-dialog');document.querySelector('#bag-content').innerHTML='<p>The menu is still loading. Your saved bag is safe.</p><a class="button" href="/checkout">GO TO CHECKOUT</a>';d.showModal();}};
 document.addEventListener('click',ev=>{if(!window.publicReady)ev.target.closest('[data-close]')?.closest('dialog')?.close();if(ev.target.closest('[data-retry]'))location.reload();});
 document.querySelector('#year')?.replaceChildren(String(new Date().getFullYear()));
 document.addEventListener('error',ev=>{const img=ev.target;if(img instanceof HTMLImageElement&&!img.dataset.fallback){img.dataset.fallback='true';img.removeAttribute('srcset');img.src='/assets/logo-128.webp';img.classList.add('image-fallback');}},true);
})();

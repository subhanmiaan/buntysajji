'use strict';
(()=>{
 let preferred=null;try{preferred=localStorage.getItem('bunty-theme');}catch{/* Storage may be disabled. */}
 const valid=v=>['dark','light'].includes(v);
 document.documentElement.dataset.theme=valid(preferred)?preferred:'dark';
 window.BuntyTheme={configure(settings){if(!valid(preferred))document.documentElement.dataset.theme=settings?.default_theme||'dark';document.documentElement.dataset.motion=settings?.animations===false?'off':'on';update();}};
 function update(){const b=document.querySelector('[data-theme-toggle]');if(b){const dark=document.documentElement.dataset.theme==='dark';b.textContent=dark?'☀ Light':'☾ Dark';b.setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');}}
 document.addEventListener('DOMContentLoaded',()=>{const button=document.createElement('button');button.type='button';button.className='theme-toggle';button.dataset.themeToggle='';const header=document.querySelector('header');if(header)header.insertBefore(button,header.querySelector('.bag'));else{button.classList.add('admin-theme-toggle');document.body.append(button);}update();button.onclick=()=>{preferred=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=preferred;try{localStorage.setItem('bunty-theme',preferred);}catch{/* Keep the theme for this visit. */}update();};});
})();

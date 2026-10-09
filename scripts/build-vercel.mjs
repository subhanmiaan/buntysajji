import './build.mjs';
import {cpSync,mkdirSync} from 'node:fs';

// Only public assets enter the CDN. Admin HTML stays behind Express auth.
mkdirSync('public',{recursive:true});
for(const file of ['assets','client','app.js','menu-data.js','style.css','enhancements.css','punjabi-theme.css','system.css','brand-refresh.css','order-desk.css','storefront.css']) {
 cpSync(`dist/${file}`,`public/${file}`,{recursive:true});
}
console.log('Vercel public assets ready; pages and API are served by Express.');

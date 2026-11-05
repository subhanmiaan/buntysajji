import {readFileSync,writeFileSync,mkdirSync,existsSync,cpSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prerenderPages,initialOrderOptions} from './prerender-pages.mjs';
import sharp from 'sharp';
const html=readFileSync('index.html','utf8');
for(const [route,title,description] of [['menu','Bunty Sajji Menu | Sajji, BBQ & Karahi in Sialkot','Browse the Bunty Sajji menu in Sialkot: chicken sajji, karahi, BBQ and sharing platters. Check portions and current prices, then order for delivery or pickup.'],['about','About Bunty Sajji | Alam Chowk, Sialkot','Meet Bunty Sajji, a desi restaurant at Alam Chowk, Sialkot. Find our address, opening hours and contact details, and plan a meal with family or friends.'],['gallery','Bunty Sajji Menu Gallery | Sialkot','View the Bunty Sajji menu sheets for sajji, BBQ, karahi, tandoor and sharing platters. Check the online menu for current prices and availability.']]){mkdirSync(route,{recursive:true});writeFileSync(route+'/index.html',html.replace(/<title>.*?<\/title>/,`<title>${title}</title>`).replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${description}">`));}
writeFileSync('404.html',html.replace(/<title>.*?<\/title>/,'<title>Page not found — Bunty سجی</title>'));
for(const asset of ['logo','sajji','karahi','platters','burgers'])if(!existsSync('assets/'+asset+'.jpg'))throw new Error('Missing '+asset);
console.log('Built home, menu, about, gallery and 404. All local assets verified.');
const data=readFileSync('menu-data.js','utf8');
for(const image of [...data.matchAll(/'([a-z]+(?:-[a-z]+)*)'/g)].map(m=>m[1]).filter(n=>['sajji','bbq','fish','kabab','chicken-karahi','beef-karahi','handi','qeema','masala','naan','wings','nuggets','roll','burger','drinks','salad','raita','couple-platter','family-platter','friends-platter'].includes(n)))if(!existsSync(`assets/food/${image}.webp`))throw new Error('Missing food photo: '+image);
for(let i=1;i<=6;i++)if(!existsSync(`assets/menu-${i}.jpg`))throw new Error('Missing menu sheet '+i);
console.log('Verified food photography and all six supplied menu sheets.');
mkdirSync('dist',{recursive:true});
for(const file of ['index.html','404.html','admin.html','app.js','menu-data.js','style.css','enhancements.css','punjabi-theme.css','system.css','brand-refresh.css','order-desk.css','storefront.css','assets','client','menu','about','gallery'])cpSync(file,`dist/${file}`,{recursive:true});
console.log('Built dist/ for the Node server. Secrets, migrations and server code are outside the public directory.');
// Small gallery previews; opening a sheet still uses its original full-size image.
for(let i=1;i<=6;i++)await sharp(`assets/menu-${i}.jpg`).resize({width:600,withoutEnlargement:true}).webp({quality:80}).toFile(`dist/assets/menu-${i}-preview.webp`);
// Render each public page before JavaScript or catalog requests complete.
const photos=JSON.parse(readFileSync('assets/optimized/manifest.json','utf8'));
const app=readFileSync('app.js','utf8');
const hero=app.slice(app.indexOf('<section class="hero">'),app.indexOf('</section>${border}',app.indexOf('<section class="hero">'))+10)
 .replace(/\$\{photo\("([^"]+)"\)\}/g,(_match,url)=>`src="${photos[url]?.src||url}" srcset="${photos[url]?.srcset||''}" sizes="(max-width:680px) 80vw, 45vw"`);
writeFileSync('dist/shell.html',html);
const initialPages=prerenderPages({app,data,photos});
for(const [path,body] of Object.entries(initialPages)){
 const page=['checkout.html','order.html'].includes(path)?html:readFileSync('dist/'+path,'utf8');
 writeFileSync('dist/'+path,page.replace(/<main id="main">[\s\S]*?<\/main>/,`<main id="main">${body}</main>`));
}
writeFileSync('dist/index.html',html.replace(/<section class="storefront-loading"[\s\S]*?<\/section>/,hero+initialOrderOptions+'<section class="catalog-placeholder" aria-label="Menu loading"><p class="catalog-loading" role="status">Loading today\'s menu… You can explore the menu or call us while it loads.</p><div class="food-grid" aria-hidden="true"><div></div><div></div><div></div></div></section>'));

// Keep the tiny theme/shell independent; consolidate the remaining ordered files.
// Content hashes prevent browsers reusing stale code after a deployment.
mkdirSync('dist/assets/bundles',{recursive:true});
const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)];
const scripts=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].filter(m=>!['/client/shell.js','/client/language.js'].includes(m[1]));
const bundle=(matches,extension)=>{const content=matches.map(m=>readFileSync(m[1].slice(1),'utf8')).join(extension==='js'?'\n;\n':'\n');const version=createHash('sha256').update(content).digest('hex').slice(0,16);const name=`storefront.${extension}`;writeFileSync('dist/assets/bundles/'+name,content);return '/assets/bundles/'+name+'?v='+version;};
const css=bundle(styles,'css'),js=bundle(scripts,'js');
for(const path of ['index.html','shell.html',...Object.keys(initialPages)]){
 let page=readFileSync('dist/'+path,'utf8');
 for(const [i,match] of styles.entries())page=page.replace(match[0],i===0?`<link rel="stylesheet" href="${css}">`:'');
 for(const [i,match] of scripts.entries())page=page.replace(match[0],i===0?`<script src="${js}" defer></script>`:'');
 writeFileSync('dist/'+path,page);
}
console.log('Bundled storefront CSS and JavaScript with content-versioned URLs.');

// Public landing pages get their own canonical and social-preview metadata.
const origin=new URL(process.env.APP_URL||'https://buntysajji.vercel.app').origin;
for(const [path,route,label,description] of [
 ['index.html','/','Bunty Sajji | Desi Restaurant in Sialkot','Visit Bunty Sajji, a desi restaurant at Alam Chowk, Sialkot. Explore sajji, karahi, BBQ and family platters. Open daily from noon to 4 am.'],
 ['menu/index.html','/menu/','Bunty Sajji Menu | Sajji, BBQ & Karahi in Sialkot','Browse the Bunty Sajji menu in Sialkot: chicken sajji, karahi, BBQ and sharing platters. Check portions and current prices, then order for delivery or pickup.'],
 ['about/index.html','/about/','About Bunty Sajji | Alam Chowk, Sialkot','Meet Bunty Sajji, a desi restaurant at Alam Chowk, Sialkot. Find our address, opening hours and contact details, and plan a meal with family or friends.'],
 ['gallery/index.html','/gallery/','Bunty Sajji Menu Gallery | Sialkot','View the Bunty Sajji menu sheets for sajji, BBQ, karahi, tandoor and sharing platters. Check the online menu for current prices and availability.']
]){
 let page=readFileSync('dist/'+path,'utf8');
 page=page.replace(/<title>.*?<\/title>/,`<title>${label}</title>`).replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${description}">`);
 const social=`<link rel="canonical" href="${origin}${route}"><meta property="og:type" content="${path==='index.html'?'restaurant':'website'}"><meta property="og:locale" content="en_PK"><meta property="og:site_name" content="Bunty Sajji"><meta property="og:title" content="${label}"><meta property="og:description" content="${description}"><meta property="og:url" content="${origin}${route}"><meta property="og:image" content="${origin}/assets/food-ai/chicken-sajji.webp"><meta property="og:image:alt" content="Chicken sajji with rice at Bunty Sajji in Sialkot"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${label}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${origin}/assets/food-ai/chicken-sajji.webp">`;
 const restaurant=path==='index.html'?`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Restaurant',name:'Bunty Sajji',url:origin+'/',image:origin+'/assets/food-ai/chicken-sajji.webp',telephone:'+92 52 3242 312',email:'Buntysajjisialkot@gmail.com',address:{'@type':'PostalAddress',streetAddress:'Shahbpura Road, Aalam Chowk, Mubarakpura',addressLocality:'Sialkot',postalCode:'51310',addressCountry:'PK'},servesCuisine:['Pakistani','Punjabi','Barbecue'],menu:origin+'/menu/',sameAs:['https://www.instagram.com/buntysajjisialkot/'],openingHoursSpecification:[...['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day=>({'@type':'OpeningHoursSpecification',dayOfWeek:day,opens:'00:00',closes:'04:00'})),...['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day=>({'@type':'OpeningHoursSpecification',dayOfWeek:day,opens:'12:00',closes:'23:59'}))]})}</script>`:'';
 page=page.replace('</head>',`${social}${restaurant}</head>`);
 writeFileSync('dist/'+path,page);
}

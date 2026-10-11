import {readFileSync,writeFileSync,mkdirSync,existsSync,cpSync} from 'node:fs';
import {createHash} from 'node:crypto';
const html=readFileSync('index.html','utf8');
for(const [route,title,description] of [['menu','Our Menu','Explore sajji, karahi, BBQ, platters, burgers and more.'],['about','Our Story','Desi food, good company and a full table. Discover Bunty سجی.'],['gallery','Original Menu Gallery','Browse the supplied Bunty سجی menu sheets and prices.']]){mkdirSync(route,{recursive:true});writeFileSync(route+'/index.html',html.replace(/<title>.*?<\/title>/,`<title>${title} — Bunty سجی</title>`).replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${description}">`));}
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
// Serve a real homepage hero before the catalog request. Other routes keep a neutral loader.
const photos=JSON.parse(readFileSync('assets/optimized/manifest.json','utf8'));
const app=readFileSync('app.js','utf8');
const hero=app.slice(app.indexOf('<section class="hero">'),app.indexOf('</section>${border}',app.indexOf('<section class="hero">'))+10)
 .replace(/\$\{photo\("([^"]+)"\)\}/g,(_match,url)=>`src="${photos[url]?.src||url}" srcset="${photos[url]?.srcset||''}" sizes="(max-width:680px) 80vw, 45vw"`);
writeFileSync('dist/shell.html',html);
writeFileSync('dist/index.html',html.replace(/<section class="storefront-loading"[\s\S]*?<\/section>/,hero+'<section class="catalog-placeholder" aria-label="Menu loading"><p class="catalog-loading" role="status">Loading today\'s menu… You can explore the menu or call us while it loads.</p><div class="food-grid" aria-hidden="true"><div></div><div></div><div></div></div></section>'));

// Keep the tiny theme/shell independent; consolidate the remaining ordered files.
// Content hashes prevent browsers reusing stale code after a deployment.
mkdirSync('dist/assets/bundles',{recursive:true});
const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)];
const scripts=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].filter(m=>m[1]!=='/client/shell.js');
const bundle=(matches,extension)=>{const content=matches.map(m=>readFileSync(m[1].slice(1),'utf8')).join(extension==='js'?'\n;\n':'\n');const name=`storefront-${createHash('sha256').update(content).digest('hex').slice(0,16)}.${extension}`;writeFileSync('dist/assets/bundles/'+name,content);return '/assets/bundles/'+name;};
const css=bundle(styles,'css'),js=bundle(scripts,'js');
for(const path of ['index.html','shell.html','404.html','menu/index.html','about/index.html','gallery/index.html']){
 let page=readFileSync('dist/'+path,'utf8');
 for(const [i,match] of styles.entries())page=page.replace(match[0],i===0?`<link rel="stylesheet" href="${css}">`:'');
 for(const [i,match] of scripts.entries())page=page.replace(match[0],i===0?`<script src="${js}" defer></script>`:'');
 writeFileSync('dist/'+path,page);
}
console.log('Bundled storefront CSS and JavaScript with content-versioned URLs.');

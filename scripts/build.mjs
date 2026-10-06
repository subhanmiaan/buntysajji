import {readFileSync,writeFileSync,mkdirSync,existsSync,cpSync} from 'node:fs';
const html=readFileSync('index.html','utf8');
for(const [route,title,description] of [['menu','Our Menu','Explore sajji, karahi, BBQ, platters, burgers and more.'],['about','Our Story','Desi food, good company and a full table. Discover BuntySajji.'],['gallery','Original Menu Gallery','Browse the supplied BuntySajji menu sheets and prices.']]){mkdirSync(route,{recursive:true});writeFileSync(route+'/index.html',html.replace(/<title>.*?<\/title>/,`<title>${title} — BuntySajji</title>`).replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${description}">`));}
writeFileSync('404.html',html.replace(/<title>.*?<\/title>/,'<title>Page not found — BuntySajji</title>'));
for(const asset of ['logo','sajji','karahi','platters','burgers'])if(!existsSync('assets/'+asset+'.jpg'))throw new Error('Missing '+asset);
console.log('Built home, menu, about, gallery and 404. All local assets verified.');
const data=readFileSync('menu-data.js','utf8');
for(const image of [...data.matchAll(/'([a-z]+(?:-[a-z]+)*)'/g)].map(m=>m[1]).filter(n=>['sajji','bbq','fish','kabab','chicken-karahi','beef-karahi','handi','qeema','masala','naan','wings','nuggets','roll','burger','drinks','salad','raita','couple-platter','family-platter','friends-platter'].includes(n)))if(!existsSync(`assets/food/${image}.webp`))throw new Error('Missing food photo: '+image);
for(let i=1;i<=6;i++)if(!existsSync(`assets/menu-${i}.jpg`))throw new Error('Missing menu sheet '+i);
console.log('Verified food photography and all six supplied menu sheets.');
mkdirSync('dist',{recursive:true});
for(const file of ['index.html','404.html','admin.html','app.js','menu-data.js','style.css','enhancements.css','punjabi-theme.css','system.css','assets','client','menu','about','gallery'])cpSync(file,`dist/${file}`,{recursive:true});
console.log('Built dist/ for the Node server. Secrets, migrations and server code are outside the public directory.');

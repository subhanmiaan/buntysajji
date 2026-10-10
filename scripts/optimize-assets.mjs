import sharp from 'sharp';
import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
mkdirSync('assets/optimized',{recursive:true});
const map={},jobs=[];let before=0,after=0;
for(const dir of ['food','food-ai'])for(const name of readdirSync('assets/'+dir).filter(n=>n.endsWith('.webp'))){jobs.push(async()=>{
 const path=`assets/${dir}/${name}`,bytes=readFileSync(path),hash=createHash('sha256').update(bytes).digest('hex').slice(0,10),slug=name.slice(0,-5),small=`/assets/optimized/${dir}-${slug}-${hash}-480.webp`,large=small.replace('-480.webp','-960.webp');
 for(const [url,width] of [[small,480],[large,960]])if(!existsSync('.'+url))await sharp(bytes).resize({width,withoutEnlargement:true}).webp({quality:68,effort:5}).toFile('.'+url);
 map['/'+path]={src:small,srcset:`${small} 480w, ${large} 960w`};before+=bytes.length;after+=statSync('.'+small).size;
});}
for(let i=0;i<jobs.length;i+=6)await Promise.all(jobs.slice(i,i+6).map(job=>job()));
for(const item of JSON.parse(readFileSync('docs/food-image-uploads.json','utf8'))){const name=item.url.split('/').pop(),local=map['/assets/food-ai/'+name];if(local)map[item.url]=local;}
writeFileSync('client/images.js',`'use strict';\nwindow.FoodImages=${JSON.stringify(map)};\n`);
writeFileSync('assets/optimized/manifest.json',JSON.stringify(map));
console.log(JSON.stringify({images:jobs.length,sourceBytes:before,mobileBytes:after,reductionPercent:Math.round((1-after/before)*100)}));

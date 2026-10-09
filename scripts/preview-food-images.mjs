import sharp from 'sharp';
import {readFileSync,writeFileSync} from 'node:fs';
const items=JSON.parse(readFileSync('docs/food-image-manifest.json','utf8')).filter(i=>i.status==='generated');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
for(let start=0;start<items.length;start+=20){const group=items.slice(start,start+20),layers=[];for(let i=0;i<group.length;i++){const x=(i%4)*300,y=Math.floor(i/4)*270;layers.push({input:await sharp(group[i].asset.slice(1)).resize(300,230,{fit:'contain',background:'white'}).toBuffer(),left:x,top:y});layers.push({input:Buffer.from(`<svg width="300" height="40"><rect width="300" height="40" fill="white"/><text x="8" y="15" font-family="Arial" font-size="10" fill="black">${escape(group[i].name)}</text></svg>`),left:x,top:y+230});}await sharp({create:{width:1200,height:Math.ceil(group.length/4)*270,channels:3,background:'white'}}).composite(layers).jpeg({quality:90}).toFile(`tmp/food-ai-sheet-${start/20+1}.jpg`);}
writeFileSync('tmp/food-preview-items.json',JSON.stringify(items.map(i=>({name:i.name,slug:i.slug})),null,2));
console.log(`Previewed ${items.length} generated images.`);

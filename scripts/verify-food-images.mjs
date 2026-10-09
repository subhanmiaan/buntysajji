import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const sandbox={window:{}};
vm.runInNewContext(readFileSync('menu-data.js','utf8'),sandbox);
const items=sandbox.window.previewMenu;
const manifest=JSON.parse(readFileSync('docs/food-image-manifest.json','utf8'));
assert.equal(manifest.length,items.length,'Every menu item needs a manifest entry');
assert.equal(new Set(manifest.map(x=>x.slug)).size,items.length,'Image paths must be unique');
for(const item of items){
 const image=manifest.find(x=>x.name===item.name);
 assert.ok(image,`Missing image entry: ${item.name}`);
 assert.equal(image.status,'generated',`Image not finished: ${item.name}`);
 assert.equal(image.asset,`/assets/food-ai/${item.image}.webp`);
 const meta=await sharp(image.asset.slice(1)).metadata();
 assert.equal(meta.format,'webp');
 assert.ok(Math.min(meta.width,meta.height)>=1000,`Low resolution: ${item.name}`);
}
console.log(`${items.length} distinct dish images verified locally at 1000px or higher.`);
if(process.argv.includes('--live')){
 const response=await fetch('https://buntysajji.vercel.app/api/catalog');
 assert.ok(response.ok,'Live catalog failed');
 const catalog=await response.json();
 for(let i=0;i<manifest.length;i+=4){
  await Promise.all(manifest.slice(i,i+4).map(async image=>{
   const item=catalog.items.find(x=>x.name===image.name);
   assert.ok(item,`Live dish missing: ${image.name}`);
   assert.ok(item.image_url.endsWith(`/menu/ai-v1/${image.slug}.webp`),`Old live image: ${image.name}`);
   const photo=await fetch(item.image_url);
   assert.ok(photo.ok,`Live image failed: ${image.name}`);
   const meta=await sharp(Buffer.from(await photo.arrayBuffer())).metadata();
   assert.ok(Math.min(meta.width,meta.height)>=1000,`Live image too small: ${image.name}`);
  }));
 }
 console.log(`${manifest.length} live catalog mappings and full-size photo downloads verified.`);
}

import 'dotenv/config';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const manifest=JSON.parse(readFileSync('docs/food-image-manifest.json','utf8'));
const logFile='docs/food-image-uploads.json';
const uploaded=existsSync(logFile)?JSON.parse(readFileSync(logFile,'utf8')):[];
const selected=new Set(process.argv.slice(2));
for(const item of manifest.filter(x=>x.status==='generated'&&(!selected.size||selected.has(x.slug)))){
 if(uploaded.some(x=>x.name===item.name))continue;
 const original=await db.from('menu_items').select('id,image_url').eq('name',item.name).single();if(original.error)throw original.error;
 const path=`menu/ai-v1/${item.slug}.webp`;
 const upload=await db.storage.from('food-images').upload(path,readFileSync(item.asset.slice(1)),{contentType:'image/webp',cacheControl:'31536000',upsert:true});if(upload.error)throw upload.error;
 const url=db.storage.from('food-images').getPublicUrl(path).data.publicUrl;
 const saved=await db.from('menu_items').update({image_url:url}).eq('id',original.data.id).select('id');if(saved.error||saved.data.length!==1)throw saved.error||Error('Image update failed');
 uploaded.push({name:item.name,id:original.data.id,url,previous_image_url:original.data.image_url});
 writeFileSync(logFile,JSON.stringify(uploaded,null,2));console.log(`Published image: ${item.name}`);
}
console.log(`${uploaded.length} product images published to Supabase Storage and the live catalogue.`);

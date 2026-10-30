import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';

export const locations=JSON.parse(readFileSync(new URL('./data/delivery-locations.json',import.meta.url),'utf8'));
export function missingLocations(existing){
 const normalize=name=>name.trim().toLowerCase();
 if(locations.length!==53||new Set(locations.map(normalize)).size!==53)throw new Error('Expected 53 distinct approved locations.');
 const names=new Set(existing.map(row=>normalize(row.name)));
 return locations.filter(name=>!names.has(normalize(name))).map(name=>({name,delivery_fee:0,minimum_order:100,estimated_minutes:45,active:true}));
}
async function main(){
 const {SUPABASE_URL: url}=process.env,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('Server database configuration is required.');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:existing,error}=await db.from('delivery_zones').select('id,name,delivery_fee,minimum_order,estimated_minutes,active');
 if(error)throw new Error('Cannot read delivery zones.');
 const baseline=existing.find(row=>row.id==='e83c79cd-0a20-4c1e-b6d2-4d82b53fcba3');
 if(!baseline||baseline.name!=='ShahabPura Road'||Number(baseline.delivery_fee)!==0||Number(baseline.minimum_order)!==100||baseline.estimated_minutes!==45)throw new Error('The approved existing delivery zone does not match this database.');
 const pending=missingLocations(existing);
 console.log(JSON.stringify({action:process.argv.includes('--apply')?'apply':'dry-run',existing:existing.length,adding:pending.length,delivery_fee:0,minimum_order:100,estimated_minutes:45}));
 if(!process.argv.includes('--apply')||!pending.length)return;
 const result=await db.from('delivery_zones').insert(pending).select('name');
 if(result.error)throw new Error('Delivery location insert failed; existing zones were not updated.');
 if(result.data.length!==pending.length)throw new Error('Unexpected inserted location count.');
 console.log(`Imported ${result.data.length} delivery locations. Existing zones preserved.`);
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))main().catch(error=>{console.error(error.message);process.exitCode=1;});

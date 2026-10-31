import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
export const rates=JSON.parse(readFileSync(new URL('./data/delivery-rates-2026-10-31.json',import.meta.url),'utf8'));
export function rateUpdates(existing){
 if(Object.keys(rates).length!==54||Object.values(rates).some(rate=>!Number.isInteger(rate)||rate<=0))throw new Error('Expected 54 valid delivery rates.');
 const result=Object.entries(rates).map(([name,delivery_fee])=>{
  const matches=existing.filter(row=>row.name.toLowerCase()===name.toLowerCase()||(name==='Ugoki Morr'&&row.name==='Ugoki Road'));
  if(matches.length>1)throw new Error('Ambiguous delivery zone: '+name);
  const row=matches[0];
  if(!row&&name!=='Shikarpur')throw new Error('Missing existing zone: '+name);
  return {id:row?.id||randomUUID(),name,delivery_fee,minimum_order:row?.minimum_order??100,estimated_minutes:row?.estimated_minutes??45,active:row?.active??true};
 });
 const legacy=existing.find(row=>row.id==='e83c79cd-0a20-4c1e-b6d2-4d82b53fcba3'&&row.name==='ShahabPura Road');
 if(!legacy)throw new Error('Database does not match the existing restaurant zone.');
 result.push({id:legacy.id,name:legacy.name,delivery_fee:rates.Shahabpura,minimum_order:legacy.minimum_order,estimated_minutes:legacy.estimated_minutes,active:legacy.active});
 return result;
}
async function main(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('Server database configuration is required.');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.from('delivery_zones').select('id,name,delivery_fee,minimum_order,estimated_minutes,active');
 if(error)throw new Error('Cannot read delivery zones.');
 const rows=rateUpdates(data);
 console.log(JSON.stringify({action:process.argv.includes('--apply')?'apply':'dry-run',zones:rows.length,currency:'PKR'}));
 if(!process.argv.includes('--apply'))return;
 const result=await db.from('delivery_zones').upsert(rows,{onConflict:'id'}).select('id');
 if(result.error||result.data.length!==rows.length)throw new Error('Delivery rate update failed.');
 console.log('Applied 54 requested rates plus the existing ShahabPura Road alias.');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))main().catch(error=>{console.error(error.message);process.exitCode=1;});

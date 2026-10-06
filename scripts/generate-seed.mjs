import {readFileSync,writeFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
const items=runInNewContext(readFileSync('menu-data.js','utf8')+';items;',{window:{}});
const uuid=s=>{const h=createHash('sha256').update('bunty-sajji:'+s).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const q=s=>"'"+String(s).replaceAll("'","''")+"'";
const sql=['-- Imported from the supplied menu. Re-running does not overwrite admin edits.','begin;'];
for(const [i,name] of [...new Set(items.map(i=>i.category))].entries())sql.push(`insert into public.categories(id,name,sort_order) values(${q(uuid('category:'+name))},${q(name)},${i}) on conflict(id) do nothing;`);
for(const item of items){const id=uuid('item:'+item.name);sql.push(`insert into public.menu_items(id,category_id,name,description,image_url,available,featured,sort_order) values(${q(id)},${q(uuid('category:'+item.category))},${q(item.name)},${q(item.description)},${q('/assets/food/'+item.image+'.webp')},${item.variants.some(v=>v[1]!==null)},${['Chicken Sajji','Chicken Karahi','Family Platter'].includes(item.name)},${item.id}) on conflict(id) do nothing;`);for(const [name,price] of item.variants)sql.push(`insert into public.menu_item_variants(id,menu_item_id,name,price,available) values(${q(uuid(item.name+':'+name))},${q(id)},${q(name)},${price??0},${price!==null}) on conflict(id) do nothing;`);}
sql.push('commit;');writeFileSync('supabase/seed.sql',sql.join('\n')+'\n');console.log(`Generated ${items.length} menu items. Missing-price dishes remain unavailable.`);

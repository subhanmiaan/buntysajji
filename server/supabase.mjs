import {createClient} from '@supabase/supabase-js';
export class AppError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export function unwrap({data,error}){if(error){const clientError=['P0001','23503','23505','23514','22P02','42501'].includes(error.code);throw new AppError(clientError?error.message:'Database request failed. Please try again.',error.code==='42501'?403:clientError?400:502);}return data;}
export function createSupabaseServices(env){
 const url=env.SUPABASE_URL,publicKey=env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY,secret=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!publicKey||!secret)return null;
 const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
 const publicClient=()=>createClient(url,publicKey,options);
 const service=createClient(url,secret,options);
 const userClient=token=>createClient(url,publicKey,{...options,global:{headers:{Authorization:`Bearer ${token}`}}});
 const auth={
  async login(email,password){const client=publicClient();const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw new AppError('Email or password is incorrect.',401);return data.session;},
  async verify(access,refresh){let token=access,session=null;let result=access?await publicClient().auth.getUser(access):{error:true};if(result.error&&refresh){const renewed=await publicClient().auth.refreshSession({refresh_token:refresh});if(!renewed.error){session=renewed.data.session;token=session.access_token;result=await publicClient().auth.getUser(token);}}if(result.error||!result.data?.user)throw new AppError('Please sign in again.',401);const client=userClient(token);const profile=unwrap(await client.from('admin_profiles').select('user_id,role,active').eq('user_id',result.data.user.id).maybeSingle());if(!profile?.active)throw new AppError('This account does not have administrator access.',403);return {user:result.data.user,profile,token,session};},
  async logout(access){if(access)await service.auth.admin.signOut(access,'local');}
 };
 return {auth,repository:()=>new SupabaseRepository(service,publicClient()),adminRepository:token=>new SupabaseRepository(userClient(token),userClient(token)),async upload(token,file){const client=userClient(token);const path=`menu/${crypto.randomUUID()}.webp`;unwrap(await client.storage.from('food-images').upload(path,file,{contentType:'image/webp',upsert:false}));return client.storage.from('food-images').getPublicUrl(path).data.publicUrl;}};
}
export class SupabaseRepository {
 constructor(client,reader){this.db=client;this.reader=reader;}
 async orderAttempt(hash){return unwrap(await this.db.rpc('record_order_attempt',{p_network:hash}));}
 async createGuardedOrder(payload,tokenHash,fingerprint,network){return unwrap(await this.db.rpc('create_guarded_order',{p_payload:payload,p_tracking_hash:tokenHash,p_fingerprint:fingerprint,p_network:network}));}
 async deals(){const now=new Date().toISOString();return unwrap(await this.db.from('promotions').select('id,name,description,discount_type,discount_value,minimum_order,maximum_discount,starts_at,ends_at,usage_limit,used_count').eq('kind','deal').eq('active',true).lte('starts_at',now).gt('ends_at',now).order('ends_at')).filter(p=>p.usage_limit===null||p.used_count<p.usage_limit).map(({usage_limit:_limit,used_count:_used,...p})=>p);}
 async catalog(){const [categories,items,settings,zones]=await Promise.all([this.reader.from('categories').select('*').order('sort_order').order('name'),this.reader.from('menu_items').select('*,variants:menu_item_variants(*),addons:menu_item_addons(*)').order('sort_order').order('name'),this.reader.from('restaurant_settings').select('*').eq('id',1).single(),this.reader.from('delivery_zones').select('*').order('name')]);const dishes=unwrap(items).map(item=>({...item,variants:item.variants.sort((a,b)=>Number(a.price)-Number(b.price)||a.name.localeCompare(b.name)),addons:item.addons.sort((a,b)=>a.name.localeCompare(b.name))}));return {categories:unwrap(categories),items:dishes,settings:unwrap(settings),zones:unwrap(zones)};}
 async list(table){return unwrap(await this.db.from(table).select('*').order(table==='categories'?'sort_order':'created_at',{ascending:table==='categories'}));}
 async save(table,id,data){return unwrap(await (id?this.db.from(table).update(data).eq('id',id):this.db.from(table).insert(data)).select().single());}
 async remove(table,id){const rows=unwrap(await this.db.from(table).delete().eq('id',id).select('id'));if(!rows.length)throw new AppError('Record not found.',404);}
 async saveMenu(data){return unwrap(await this.db.rpc('save_menu_item',{p_item:data}));}
 async quote(payload){return unwrap(await this.db.rpc('quote_order',{p_payload:payload}));}
 async createOrder(payload,tokenHash,fingerprint){return unwrap(await this.db.rpc('create_order',{p_payload:payload,p_tracking_hash:tokenHash,p_fingerprint:fingerprint}));}
 async orders({page=1,status='',search=''}={}){let query=this.db.from('orders').select('id,order_number,customer_name,phone,fulfillment,status,payment_status,total,created_at,pickup_at,address,zone_name,items:order_items(item_name,variant_name,quantity)',{count:'exact'}).order('created_at',{ascending:status==='active'||status==='new'}).order('id');if(status==='active')query=query.not('status','in','(completed,cancelled)');else if(status)query=query.eq('status',status);if(search)query=query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,phone.ilike.%${search}%`);const result=await query.range((page-1)*25,page*25-1);const orders=unwrap(result);return {orders,total:result.count,page,page_size:25};}
 async openOrderCount(){const result=await this.db.from('orders').select('id',{head:true,count:'exact'}).not('status','in','(completed,cancelled)');unwrap(result);return result.count;}
 async order(id){return unwrap(await this.db.from('orders').select('*,items:order_items(*,addons:order_item_addons(*)),history:order_status_history(*)').eq('id',id).maybeSingle());}
 async track(number,hash){const data=unwrap(await this.db.from('orders').select('*,items:order_items(*,addons:order_item_addons(*)),history:order_status_history(status,created_at)').eq('order_number',number).eq('tracking_token_hash',hash).maybeSingle());if(data){delete data.tracking_token_hash;delete data.request_fingerprint;delete data.request_key;}return data;}
 async status(id,status){return unwrap(await this.db.rpc('set_order_status',{p_order_id:id,p_status:status}));}
}

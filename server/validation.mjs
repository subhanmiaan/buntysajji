import {z} from 'zod';
const text=(max=160)=>z.string().trim().max(max);
const money=z.number().finite().min(0).max(1000000).multipleOf(.01);
const id=z.string().uuid();
const optionalText=(max=500)=>text(max).default('');
const imageUrl=z.string().max(2000).refine(v=>v===''||/^\/assets\/[a-zA-Z0-9/_.-]+$/.test(v)||/^https:\/\//.test(v),'Use a local asset or HTTPS image URL');
export const cartSchema=z.object({
 voucher_code:z.string().trim().toUpperCase().max(40).regex(/^[A-Z0-9_-]*$/).default(''),
 items:z.array(z.object({menu_item_id:id,variant_id:id,quantity:z.number().int().min(1).max(99),addon_ids:z.array(id).max(20).refine(a=>new Set(a).size===a.length,'Duplicate add-ons').default([])}).strict()).min(1).max(50),
 fulfillment:z.enum(['delivery','takeaway']),zone_id:id.nullable().default(null),
 pickup_mode:z.enum(['asap','scheduled']).default('asap'),pickup_at:z.string().datetime({offset:true}).nullable().default(null)
}).strict();
export const orderSchema=cartSchema.extend({
 customer_name:text(100).min(2),phone:z.string().trim().regex(/^\+?[0-9 ()-]{7,25}$/,'Enter a valid phone number'),
 address:optionalText(500),landmark:optionalText(200),instructions:optionalText(1000),
 request_key:id,tracking_token:z.string().regex(/^[a-f0-9]{64}$/),expected_total:money
}).superRefine((v,c)=>{if(v.fulfillment==='delivery'&&(!v.zone_id||v.address.length<5))c.addIssue({code:'custom',message:'Delivery address and area are required'});if(v.fulfillment==='takeaway'&&v.pickup_mode==='scheduled'&&!v.pickup_at)c.addIssue({code:'custom',message:'Choose a pickup time'});});
export const categorySchema=z.object({name:text(80).min(1),sort_order:z.number().int().min(0).max(9999).default(0),active:z.boolean()}).strict();
export const zoneSchema=z.object({name:text(100).min(1),delivery_fee:money,minimum_order:money,estimated_minutes:z.number().int().min(5).max(1440),active:z.boolean()}).strict();
const option=z.object({id:id.optional(),name:text(100).min(1),price:money,available:z.boolean().default(true)}).strict();
export const menuSchema=z.object({id:id.optional(),name:text(160).min(1),category_id:id,description:optionalText(1500),image_url:imageUrl,available:z.boolean(),featured:z.boolean(),sort_order:z.number().int().min(0).max(9999).default(0),variants:z.array(option).min(1).max(20),addons:z.array(option).max(30)}).strict();
const social=z.union([z.literal(''),z.string().url().startsWith('https://')]).default('');
export const settingsSchema=z.object({name:text(160).min(1),phone:text(30).min(7),whatsapp:optionalText(30),whatsapp2:optionalText(30),email:z.union([z.literal(''),z.string().email().max(254)]).default(''),address:text(500).min(5),opening_hours:text(1000).min(1),minimum_preparation_minutes:z.number().int().min(5).max(240),delivery_enabled:z.boolean(),takeaway_enabled:z.boolean(),instagram:social,facebook:social,tiktok:social,youtube:social}).strict();
export const loginSchema=z.object({email:z.string().email().max(254),password:z.string().min(1).max(200)}).strict();
export const statusSchema=z.object({status:z.enum(['confirmed','preparing','ready_for_pickup','out_for_delivery','completed','cancelled'])}).strict();
export {id};
export const homepageSchema=z.object({
 default_theme:z.enum(['dark','light']).default('dark'),animations:z.boolean().default(true),
 announcement:text(180).default('Fresh from the fire. Made for your mehfil.'),
 hero_title:text(70).min(1),hero_subtitle:text(220).min(1),hero_image:imageUrl,
 button_label:text(40).min(1),show_deals:z.boolean(),show_story:z.boolean(),show_featured:z.boolean(),
 featured_count:z.number().int().min(3).max(12)
}).strict();
export const promotionSchema=z.object({
 name:text(100).min(1),description:optionalText(400),kind:z.enum(['deal','voucher']),
 code:z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,40}$/).nullable(),
 discount_type:z.enum(['percent','fixed']),discount_value:money.refine(v=>v>0,'Discount must be positive'),
 minimum_order:money,maximum_discount:money.refine(v=>v>0,'Maximum saving must be positive').nullable(),
 starts_at:z.string().datetime({offset:true}),ends_at:z.string().datetime({offset:true}),
 usage_limit:z.number().int().min(1).max(1000000).nullable(),active:z.boolean()
}).strict().superRefine((v,c)=>{
 if(new Date(v.ends_at)<=new Date(v.starts_at))c.addIssue({code:'custom',message:'End time must follow start time'});
 if(v.kind==='voucher'&&!v.code)c.addIssue({code:'custom',message:'Voucher code is required'});
 if(v.kind==='deal'&&v.code)c.addIssue({code:'custom',message:'Automatic deals do not use codes'});
 if(v.discount_type==='percent'&&v.discount_value>100)c.addIssue({code:'custom',message:'Percentage cannot exceed 100'});
});

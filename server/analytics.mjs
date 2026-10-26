import {z} from 'zod';
const eventSchema=z.object({event:z.enum(['menu_click','whatsapp_click','add_to_cart','checkout_started','checkout_abandoned','order_completed'])}).strict();
export function recordEvent(body,log=console.info){
 const result=eventSchema.safeParse(body);
 if(!result.success)return false;
 log(JSON.stringify({type:'storefront_event',event:result.data.event,at:new Date().toISOString()}));
 return true;
}

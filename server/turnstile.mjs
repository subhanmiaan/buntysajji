import {AppError} from './supabase.mjs';

export function turnstile(env,{fetcher=fetch}={}){
 const siteKey=env.TURNSTILE_SITE_KEY?.trim(),secret=env.TURNSTILE_SECRET_KEY?.trim();
 const enabled=Boolean(siteKey&&secret);
 const officialTestKey=env.NODE_ENV==='test'&&siteKey==='1x00000000000000000000AA'&&secret==='1x0000000000000000000000000000000AA';
 return {
  enabled,siteKey:enabled?siteKey:null,
  async verify(token){
   if(!enabled)return;
   if(typeof token!=='string'||!token||token.length>2048)throw new AppError('Complete the security check before placing your order.',400);
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
   try{
    const response=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret,response:token}),signal:controller.signal});
    if(!response.ok)throw new Error('Turnstile unavailable');
    const result=await response.json();
    if(!result.success||(!officialTestKey&&result.action!=='order'))throw new AppError('Security check expired or failed. Please try it again.',400);
   }catch(error){if(error instanceof AppError)throw error;throw new AppError('The security check is temporarily unavailable. Please call or WhatsApp the restaurant.',503);}
   finally{clearTimeout(timer);}
  }
 };
}

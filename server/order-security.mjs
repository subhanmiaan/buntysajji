import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {isIP} from 'node:net';
import {ipKeyGenerator} from 'express-rate-limit';
import {AppError} from './supabase.mjs';

export function orderSecurity(env){
 const secret=env.ORDER_SECURITY_SECRET||env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;
 const sign=value=>createHmac('sha256',secret).update('bunty-checkout-v1:'+value).digest('hex');
 return {
  issue(){if(!secret)throw new AppError('Checkout security is not configured.',503);const value=Date.now()+'.'+randomBytes(24).toString('hex');return value+'.'+sign(value);},
  verify(token){if(!secret||typeof token!=='string'||!/^\d{13}\.[a-f0-9]{48}\.[a-f0-9]{64}$/.test(token))throw new AppError('Please refresh checkout before placing your order.',403);
   const [timestamp,nonce,signature]=token.split('.'),age=Date.now()-Number(timestamp);
   if(age<2000||age>2*3600000||!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(sign(timestamp+'.'+nonce),'hex')))throw new AppError('Please wait a moment or refresh checkout, then try again.',403);
  },
  network(req){const ip=env.VERCEL==='1'?req.get('x-vercel-forwarded-for')?.split(',')[0]?.trim():req.ip;
   if(!ip||!isIP(ip))throw new AppError('Unable to verify this connection. Please try again.',503);
   // Group IPv6 privacy addresses into a /56; never store raw network addresses.
   return sign('network:'+ipKeyGenerator(ip,56));
  }
 };
}

import 'dotenv/config';
import {createApp} from './app.mjs';
import {createSupabaseServices} from './supabase.mjs';
const services=createSupabaseServices(process.env);
if(process.env.NODE_ENV==='production'&&(!services||!process.env.APP_URL?.startsWith('https://')))throw new Error('Production requires Supabase keys and an HTTPS APP_URL. See .env.example.');
const port=Number(process.env.PORT)||3000;
createApp({services}).listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Bunty Sajji: http://localhost:${port}${services?'':' (Supabase setup required for ordering)'}`));

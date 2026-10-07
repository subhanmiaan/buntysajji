import express from 'express';
import {createApp} from './server/app.mjs';
import {createSupabaseServices} from './server/supabase.mjs';

// Vercel entry point. Local development uses server/index.mjs.
const app=express();
app.use(createApp({services:createSupabaseServices(process.env)}));
export default app;

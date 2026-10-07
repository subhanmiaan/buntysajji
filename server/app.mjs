import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import multer from 'multer';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {AppError} from './supabase.mjs';
import {cartSchema,orderSchema,menuSchema,categorySchema,zoneSchema,settingsSchema,loginSchema,statusSchema,id as idSchema} from './validation.mjs';

const digest=value=>createHash('sha256').update(value).digest('hex');
export function createApp({services,env=process.env,publicDir=resolve('dist')}={}){
 const app=express(),production=env.NODE_ENV==='production';
 app.disable('x-powered-by');if(env.TRUST_PROXY_HOPS)app.set('trust proxy',Number(env.TRUST_PROXY_HOPS));
 app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'",'https://fonts.googleapis.com'],fontSrc:["'self'",'https://fonts.gstatic.com'],imgSrc:["'self'",'data:','https:'],connectSrc:["'self'"],upgradeInsecureRequests:production?[]:null}},referrerPolicy:{policy:'no-referrer'}}));
 app.use(express.json({limit:'100kb'}),cookieParser());
 app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');if(!['GET','HEAD','OPTIONS'].includes(req.method)){const expected=env.APP_URL?new URL(env.APP_URL).origin:`${req.protocol}://${req.get('host')}`;if(req.get('origin')!==expected)return res.status(403).json({error:'Request origin is not allowed.'});}next();});
 const limit=(max,windowMs)=>rateLimit({windowMs,limit:max,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Too many requests. Please try again shortly.'}});
 app.get('/api/health',(_req,res)=>res.json({ok:true,configured:Boolean(services)}));
 app.use('/api',(_req,_res,next)=>services?next():next(new AppError('Ordering is not configured. Add the Supabase environment variables and run the database migrations.',503)));
 const repo=()=>services.repository();
 const cookieOptions={httpOnly:true,secure:production,sameSite:'strict',path:'/'};
 function setSession(res,session){res.cookie('bs_access',session.access_token,{...cookieOptions,maxAge:session.expires_in*1000});res.cookie('bs_refresh',session.refresh_token,{...cookieOptions,maxAge:7*86400000});}
 function clearSession(res){res.clearCookie('bs_access',cookieOptions);res.clearCookie('bs_refresh',cookieOptions);}
 const requireAdmin=async(req,res,next)=>{try{const verified=await services.auth.verify(req.cookies.bs_access,req.cookies.bs_refresh);if(verified.session)setSession(res,verified.session);req.admin=verified;req.repository=services.adminRepository(verified.token);next();}catch(error){if(error.status===401)clearSession(res);next(error);}};
 app.post('/api/auth/login',limit(10,15*60000),async(req,res)=>{const input=loginSchema.parse(req.body);const session=await services.auth.login(input.email,input.password);try{const verified=await services.auth.verify(session.access_token,session.refresh_token);setSession(res,session);res.json({email:verified.user.email,role:verified.profile.role});}catch(e){await services.auth.logout(session.access_token);throw e;}});
 app.post('/api/auth/logout',async(req,res)=>{await services.auth.logout(req.cookies.bs_access);clearSession(res);res.json({ok:true});});
 app.get('/api/auth/me',requireAdmin,(req,res)=>res.json({email:req.admin.user.email,role:req.admin.profile.role}));
 app.get('/api/catalog',async(_req,res)=>res.json(await repo().catalog()));
 app.post('/api/quote',limit(90,60000),async(req,res)=>res.json(await repo().quote(cartSchema.parse(req.body))));
 app.post('/api/orders',limit(10,15*60000),async(req,res)=>{const input=orderSchema.parse(req.body);const {tracking_token,...payload}=input;const result=await repo().createOrder(payload,digest(tracking_token),digest(JSON.stringify(payload)));res.status(201).json(result);});
 app.get('/api/orders/:number',limit(120,60000),async(req,res)=>{if(!/^BS-\d{4,}$/.test(req.params.number))throw new AppError('Order not found.',404);const token=(req.get('authorization')||'').replace(/^Bearer /,'');if(!/^[a-f0-9]{64}$/.test(token))throw new AppError('A private tracking link is required.',401);const result=await repo().track(req.params.number,digest(token));if(!result)throw new AppError('Order not found or tracking link is invalid.',404);res.json(result);});
 app.use('/api/admin',requireAdmin);
 app.get('/api/admin/catalog',async(req,res)=>res.json(await req.repository.catalog()));
 app.get('/api/admin/orders',async(req,res)=>{const page=Number(req.query.page||1),status=req.query.status||'',search=req.query.search||'';if(!Number.isInteger(page)||page<1||page>100000||typeof search!=='string'||search.length>100||!/^[\p{L}\p{N} +'-]*$/u.test(search)||!['','new','confirmed','preparing','ready_for_pickup','out_for_delivery','completed','cancelled'].includes(status))throw new AppError('Invalid order filter. Use a name, phone or order number.');res.json(await req.repository.orders({page,status,search}));});
 app.get('/api/admin/order-summary',async(req,res)=>res.json({open_orders:await req.repository.openOrderCount()}));
 app.get('/api/admin/orders/:id',async(req,res)=>{const record=await req.repository.order(idSchema.parse(req.params.id));if(!record)throw new AppError('Order not found.',404);delete record.tracking_token_hash;delete record.request_fingerprint;res.json(record);});
 app.patch('/api/admin/orders/:id/status',async(req,res)=>res.json(await req.repository.status(idSchema.parse(req.params.id),statusSchema.parse(req.body).status)));
 app.post('/api/admin/menu',async(req,res)=>res.json(await req.repository.saveMenu(menuSchema.parse(req.body))));
 app.delete('/api/admin/menu/:id',async(req,res)=>{await req.repository.remove('menu_items',idSchema.parse(req.params.id));res.json({ok:true});});
 for(const [route,table,schema] of [['categories','categories',categorySchema],['delivery-zones','delivery_zones',zoneSchema]]){
  app.get(`/api/admin/${route}`,async(req,res)=>res.json(await req.repository.list(table)));
  app.post(`/api/admin/${route}`,async(req,res)=>res.json(await req.repository.save(table,null,schema.parse(req.body))));
  app.put(`/api/admin/${route}/:id`,async(req,res)=>res.json(await req.repository.save(table,idSchema.parse(req.params.id),schema.parse(req.body))));
  app.delete(`/api/admin/${route}/:id`,async(req,res)=>{await req.repository.remove(table,idSchema.parse(req.params.id));res.json({ok:true});});
 }
 app.put('/api/admin/settings',async(req,res)=>res.json(await req.repository.save('restaurant_settings',1,settingsSchema.parse(req.body))));
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
 app.post('/api/admin/upload',upload.single('image'),async(req,res)=>{if(!req.file)throw new AppError('Choose a photo.');if(!['image/jpeg','image/png','image/webp'].includes(req.file.mimetype))throw new AppError('Upload a JPEG, PNG or WebP image.');let bytes;try{bytes=await sharp(req.file.buffer,{limitInputPixels:24000000}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();}catch{throw new AppError('The file is not a valid supported image.');}res.json({url:await services.upload(req.admin.token,bytes)});});
 app.use('/api',(_req,res)=>res.status(404).json({error:'Endpoint not found.'}));
 app.use('/admin',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
 app.get('/admin/login',(_req,res)=>res.sendFile(resolve(publicDir,'admin.html')));
 // Check authentication before sending any protected admin page, not just its API.
 app.get(['/admin','/admin/','/admin/orders','/admin/menu','/admin/categories','/admin/delivery-zones','/admin/settings'],async(req,res)=>{if(!services)return res.redirect('/admin/login');try{const session=await services.auth.verify(req.cookies.bs_access,req.cookies.bs_refresh);if(session.session)setSession(res,session.session);res.sendFile(resolve(publicDir,'admin.html'));}catch{return res.redirect('/admin/login');}});
 app.get(['/checkout','/checkout/','/order/:number'],(_req,res)=>{res.set('Cache-Control','no-store');res.sendFile(resolve(publicDir,'index.html'));});
 app.get('/admin.html',(_req,res)=>res.redirect('/admin'));
 app.get(['/', '/menu', '/menu/', '/about', '/about/', '/gallery', '/gallery/'],(_req,res)=>res.sendFile(resolve(publicDir,'index.html')));
 app.use(express.static(publicDir,{dotfiles:'ignore',maxAge:0}));
 app.use((_req,res)=>res.status(404).sendFile(resolve(publicDir,'404.html')));
 app.use((error,_req,res,_next)=>{if(error.name==='ZodError')return res.status(400).json({error:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')});if(error.code==='LIMIT_FILE_SIZE')return res.status(400).json({error:'Photo must be under 5 MB.'});if(error.type==='entity.parse.failed')return res.status(400).json({error:'Invalid JSON.'});if(!error.status)console.error('Request failed:',error.name,error.code||'');res.status(error.status||500).json({error:error.status?error.message:'Something went wrong. Please try again.'});});
 return app;
}

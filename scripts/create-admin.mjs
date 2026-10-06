import 'dotenv/config';
import {createClient} from '@supabase/supabase-js';
import {stdin,stdout} from 'node:process';
const email=process.argv[2];
if(!email||!email.includes('@'))throw new Error('Usage: npm run admin:create -- owner@example.com');
const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!secret)throw new Error('Fill SUPABASE_SECRET_KEY in .env first.');
async function passwordPrompt(){if(process.env.ADMIN_PASSWORD)return process.env.ADMIN_PASSWORD;if(!stdin.isTTY)throw new Error('Use an interactive terminal or set ADMIN_PASSWORD temporarily.');stdout.write('New admin password (hidden; at least 12 characters): ');stdin.setRawMode(true);stdin.resume();return new Promise(resolve=>{let password='';const read=buffer=>{for(const c of buffer.toString()){if(c==='\u0003'){stdin.setRawMode(false);process.exit(1);}if(c==='\r'||c==='\n'){stdin.off('data',read);stdin.setRawMode(false);stdin.pause();stdout.write('\n');resolve(password);return;}if(c==='\u007f'||c==='\b')password=password.slice(0,-1);else password+=c;}};stdin.on('data',read);});}
const password=await passwordPrompt();if(password.length<12)throw new Error('Use a password of at least 12 characters.');
const db=createClient(process.env.SUPABASE_URL,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true});
if(error)throw new Error(error.message+' If the account already exists, assign its UUID an active admin profile using the SQL in README.md.');
const saved=await db.from('admin_profiles').insert({user_id:data.user.id,role:'owner',active:true});
if(saved.error)throw new Error('Auth user created, but role assignment failed. Assign the profile using the SQL setup instructions.');
console.log(`Admin created for ${email}. Sign in at /admin/login. No password was saved in this project.`);

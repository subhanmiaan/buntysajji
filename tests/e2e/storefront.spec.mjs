import 'dotenv/config';
import {test,expect as baseExpect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
const expect=baseExpect.configure({timeout:90000});
test.skip(!secret,'Supabase credentials are required.');
test('homepage controls, theme persistence, scheduled deals and voucher checkout',async({page,browser})=>{
 page.setDefaultTimeout(45000);
 page.setDefaultNavigationTimeout(60000);
 const db=createClient(process.env.SUPABASE_URL,secret,{auth:{persistSession:false,autoRefreshToken:false}}),stamp=Date.now(),name=`Storefront QA ${stamp}`,email=`storefront-${stamp}@example.invalid`,password=randomBytes(24).toString('base64url'),code=`QA${stamp}`;
 let userId,homepage;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const context=await browser.newContext({baseURL:'http://127.0.0.1:3100'}),shop=await context.newPage();shop.on('pageerror',e=>errors.push(e.message));
 try{
  const auth=await db.auth.admin.createUser({email,password,email_confirm:true});if(auth.error)throw auth.error;userId=auth.data.user.id;
  const profile=await db.from('admin_profiles').insert({user_id:userId,role:'admin',active:true});if(profile.error)throw profile.error;
  homepage=(await db.from('restaurant_settings').select('homepage').eq('id',1).single()).data.homepage;
  await page.goto('/admin/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'SIGN IN',exact:true}).click();await expect(page).toHaveURL(/\/admin\/orders$/);
  await page.getByRole('link',{name:'Homepage',exact:true}).click();await page.getByLabel('Announcement (leave blank to hide)').fill(name);await page.getByRole('button',{name:'SAVE HOMEPAGE'}).click();await expect(page.locator('#admin-message')).toContainText('Saved successfully');
  await shop.goto('/');await expect(shop.locator('.announcement')).toHaveText(name);await expect(shop.locator('header .brand-wordmark')).toHaveAttribute('alt','Bunty سجی');await expect(shop.locator('html')).toHaveAttribute('data-theme','dark');
  await shop.getByRole('button',{name:'Switch to light theme'}).click();await shop.reload();await expect(shop.locator('html')).toHaveAttribute('data-theme','light');await shop.getByRole('button',{name:'Switch to dark theme'}).click();
  await expect(shop.locator('.hero')).toBeVisible();await expect(shop.locator('.announcement')).toHaveText(name);
  await shop.setViewportSize({width:1440,height:1000});await shop.screenshot({path:'test-results/storefront-desktop-dark.png',fullPage:true});
  await shop.setViewportSize({width:390,height:844});expect(await shop.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await shop.screenshot({path:'test-results/storefront-mobile-dark.png',fullPage:true});
  await shop.emulateMedia({reducedMotion:'reduce'});expect(await shop.locator('.hero-dish').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await page.getByRole('link',{name:'Deals & vouchers'}).click();await page.getByRole('button',{name:'CREATE OFFER / VOUCHER'}).click();await page.getByLabel('Offer name',{exact:true}).fill(name);await page.getByLabel('Offer type').selectOption('voucher');await page.getByLabel('Voucher code',{exact:true}).fill(code);await page.getByLabel('Discount value',{exact:true}).fill('10');await page.getByLabel('Total redemptions allowed (blank = unlimited)').fill('2');await page.getByLabel('Enable this offer during its scheduled dates').check();await page.getByRole('button',{name:'SAVE OFFER'}).click();await expect(page.locator('.promotion-list')).toContainText(code);
  await page.screenshot({path:'test-results/storefront-admin-promotions.png',fullPage:true});
  await shop.goto('/menu/');await shop.locator('[data-add]:not([disabled])').first().click();await shop.goto('/checkout');await shop.getByLabel('Takeaway',{exact:false}).check();await shop.getByLabel('Voucher code (optional)').fill(code);await shop.getByRole('button',{name:'APPLY',exact:true}).click();await expect(shop.locator('#checkout-totals .discount-line')).toContainText(name);
  await shop.getByLabel('Voucher code (optional)').fill('NOT-A-REAL-VOUCHER');await shop.getByRole('button',{name:'APPLY',exact:true}).click();await expect(shop.locator('#checkout-error')).toContainText('Voucher');await expect(shop.locator('#place-order')).toBeDisabled();
  await shop.getByLabel('Voucher code (optional)').fill('');await shop.getByRole('button',{name:'APPLY',exact:true}).click();await expect(shop.locator('#place-order')).toBeEnabled();await expect(shop.locator('#checkout-totals .discount-line')).toHaveCount(0);
  // Scheduled automatic offers can be managed without changing today's public prices.
  await page.getByRole('button',{name:'CREATE OFFER / VOUCHER'}).click();await page.getByLabel('Offer name',{exact:true}).fill(name+' future');await page.getByLabel('Starts',{exact:true}).fill('2099-01-01T12:00');await page.getByLabel('Ends',{exact:true}).fill('2099-01-02T12:00');await page.getByLabel('Enable this offer during its scheduled dates').check();await page.getByRole('button',{name:'SAVE OFFER'}).click();await expect(page.locator('.promotion-row').filter({hasText:name+' future'})).toContainText('Scheduled');
  const publicDeals=await shop.request.get('/api/deals');expect((await publicDeals.json()).some(p=>p.name.startsWith(name))).toBe(false);
  const future=page.locator('.promotion-row').filter({hasText:name+' future'});await future.getByRole('button',{name:'Edit offer'}).click();await page.getByLabel('Enable this offer during its scheduled dates').uncheck();await page.getByRole('button',{name:'SAVE OFFER'}).click();await expect(page.locator('.promotion-row').filter({hasText:name+' future'})).toContainText('Paused');
  await shop.route('**/api/deals',route=>route.fulfill({json:[{id:'visual-preview',name:'Family feast',description:'Bring everyone to the table.',discount_type:'percent',discount_value:15,minimum_order:1500,maximum_discount:500,ends_at:new Date(Date.now()+3600000).toISOString()}]}));
  await shop.goto('/');await expect(shop.locator('.deal-card')).toContainText('Family feast');await expect(shop.locator('[data-countdown]')).toContainText('left');await shop.screenshot({path:'test-results/storefront-mobile-deals.png',fullPage:true});
  await shop.getByRole('button',{name:'Switch to light theme'}).click();await shop.screenshot({path:'test-results/storefront-mobile-light.png',fullPage:true});
  await page.getByRole('link',{name:'Order protection',exact:true}).click();
  await page.getByLabel('Mobile number',{exact:true}).fill('03991234567');await page.getByLabel('Reason',{exact:true}).fill(name);await page.getByRole('button',{name:'BLOCK NUMBER',exact:true}).click();
  const blocked=page.locator('.promotion-row').filter({hasText:name});await expect(blocked).toContainText('923991234567');await blocked.getByRole('button',{name:'Unblock',exact:true}).click();await expect(blocked).toHaveCount(0);
  expect(errors).toEqual([]);
 }finally{
  await context.close();
  const check=async p=>{const r=await p;if(r.error)throw r.error;};
  await check(db.from('promotions').delete().like('name',name+'%'));
  await check(db.from('blocked_phones').delete().eq('reason',name));
  if(homepage)await check(db.from('restaurant_settings').update({homepage}).eq('id',1));
  if(userId)await check(db.auth.admin.deleteUser(userId));
 }
});

import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test('delivery and pickup complete through the real API and isolated SQL functions',async({page,request})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const fulfillment of ['delivery','takeaway']){
  await page.goto('/menu/?fulfillment='+fulfillment);
  await page.locator('#search').fill('Test Sajji');
  const card=page.locator('#menu-grid .food-card').first();
  await card.getByRole('checkbox').check();await card.locator('[data-add]').click();
  await page.locator('[data-bag]').click();await expect(page.locator('#bag-dialog')).toBeVisible();
  await page.getByRole('button',{name:'Increase quantity',exact:true}).click();
  await expect(page.locator('#bag-content .total')).toContainText('1,100');
  const wa=new URL(await page.getByRole('link',{name:'SEND BAG ON WHATSAPP'}).getAttribute('href'));
  expect(wa.searchParams.get('text')).toContain('2 × Test Sajji');expect(wa.searchParams.get('text')).toContain('Extra raita');
  await page.getByRole('link',{name:'CONTINUE TO CHECKOUT'}).click();
  await expect(page.locator(`[name=fulfillment][value=${fulfillment}]`)).toBeChecked();
  await page.getByLabel('Full name',{exact:true}).fill('Audit Customer');
  await page.getByLabel('Phone number',{exact:true}).fill(fulfillment==='delivery'?'03001112222':'03003334444');
  await page.getByLabel('Delivery or pickup instructions').fill('Test instructions');
  if(fulfillment==='delivery'){
   await page.getByLabel('Delivery area',{exact:true}).selectOption({label:'Test Area · Rs. 100'});
   await page.getByLabel('Full delivery address',{exact:true}).fill('123 Test Street');
   await expect(page.locator('#zone-information')).toContainText('Minimum Rs. 600');
  }
  await expect(page.locator('#place-order')).toBeEnabled();
  await expect(page.locator('#checkout-totals .grand-total')).toContainText(fulfillment==='delivery'?'1,200':'1,100');
  await page.locator('#place-order').click();await expect(page).toHaveURL(/\/order\/BS-\d+#/);
  await expect(page.locator('#tracking-content')).toContainText('Test Sajji');
  await expect(page.locator('.whatsapp-confirm')).toContainText('saved but remains pending');
  const confirmation=new URL(await page.locator('.whatsapp-confirm-button').getAttribute('href'));
  expect(confirmation.searchParams.get('text')).toContain('2 × Test Sajji');expect(confirmation.searchParams.get('text')).toContain('Notes: Test instructions');
  expect((await request.get(new URL(page.url()).pathname.replace('/order/','/api/orders/'))).status()).toBe(401);
  await expect(page.locator('#bag-count')).toHaveText('0');
 }
 expect(errors).toEqual([]);
});

test('bag removal, persistence, portions and malformed catalog recovery',async({page})=>{
 await page.goto('/menu/');await page.locator('#search').fill('Test Sajji');
 const card=page.locator('#menu-grid .food-card').first();await card.locator('select').selectOption({label:'Full · Rs. 900'});await expect(card.locator('[data-price]')).toHaveText('Rs. 900');await card.locator('[data-add]').click();await page.reload();
 await page.locator('[data-bag]').click();await expect(page.locator('#bag-content')).toContainText('Full · Rs. 900');
 await page.getByRole('button',{name:'Remove',exact:true}).click();await expect(page.locator('#bag-content')).toContainText('Your bag is empty');await page.getByRole('button',{name:'Close bag'}).click();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/catalog',route=>route.fulfill({json:{items:[{}]}}));await page.reload();
 await expect(page.locator('[data-retry]')).toBeVisible();await expect(page.locator('#menu-grid .food-card').first()).toBeVisible();expect(await page.locator('[data-add]:enabled').count()).toBe(0);
 await page.unroute('**/api/catalog');await page.locator('[data-retry]').click();await expect(page.locator('[data-add]:enabled').first()).toBeVisible();expect(errors).toEqual([]);
});

test('public links, mobile themes, keyboard controls and metadata',async({page,request})=>{
 await page.goto('/');await expect(page.locator('.signature-price')).toContainText('Chicken Sajji');
 await expect(page.locator('a[href="/admin"]')).toHaveCount(0);await expect(page.locator('.visit-details')).toContainText('Alternate WhatsApp');
 await expect(page.locator('[data-whatsapp-order]')).toHaveAttribute('href',/wa.me\/923353141888\?text=/);
 await expect(page.locator('[data-fulfillment=delivery]')).toBeVisible();await expect(page.locator('[data-fulfillment=takeaway]')).toBeVisible();
 for(const theme of ['dark','light']){
  if(theme==='light')await page.locator('[data-theme-toggle]').click();
  for(const width of [360,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`test-results/audit-mobile-${theme}.png`,fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/audit-desktop.png',fullPage:true});
 await page.locator('[data-bag]').focus();await page.keyboard.press('Enter');await expect(page.locator('#bag-dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#bag-dialog')).not.toBeVisible();
 expect((await request.get('/admin',{maxRedirects:0})).status()).toBe(302);
 expect((await request.get('/api/admin/catalog')).status()).toBe(401);
 const data=await page.locator('script[type="application/ld+json"]').textContent();expect(JSON.parse(data)['@type']).toBe('Restaurant');
});

test('admin dining and genuine review settings persist and render safely',async({page,context,request})=>{
 await context.addCookies([{name:'bs_access',value:'isolated-admin',domain:'127.0.0.1',path:'/'}]);
 const original=(await (await request.get('/api/catalog')).json()).settings.homepage;
 try{
  await page.goto('/admin/homepage');await page.getByLabel('Publish confirmed dining and event facilities').check();
  await page.getByLabel('Dining section title',{exact:true}).fill('Test family seating');
  await page.getByLabel('Confirmed facilities and booking details').fill('Test-only confirmed facilities. Call for availability.');
  await page.getByLabel('Capacity / seating details (optional)').fill('Test capacity: 20 guests');
  for(const target of ['hero','dining']){await page.locator('#'+target+'-upload').setInputFiles({name:'real-photo.webp',mimeType:'image/webp',buffer:readFileSync('assets/logo-128.webp')});await expect(page.locator('#'+target+'-upload-status')).toContainText('Uploaded.');}
  await page.getByLabel('Publish this verified customer review').check();await page.getByLabel('Customer review quote').fill('A test quote <script>alert(1)</script>');await page.getByLabel('Review customer name').fill('Test customer');await page.getByLabel('Public review source URL').fill('https://example.com/verified-review');
  await page.getByRole('button',{name:'SAVE HOMEPAGE'}).click();await expect(page.locator('#admin-message')).toHaveText('Saved successfully.');
  await page.reload();await expect(page.getByLabel('Dining section title',{exact:true})).toHaveValue('Test family seating');
  await page.goto('/');await expect(page.locator('#dining h2')).toHaveText('Test family seating');await expect(page.locator('#dining')).toContainText('20 guests');await expect(page.locator('.customer-review blockquote')).toContainText('<script>alert(1)</script>');await expect(page.locator('.customer-review script')).toHaveCount(0);await expect(page.locator('.dining-photo')).toHaveAttribute('src','/assets/audit-upload.webp');await expect(page.locator('.hero-dish')).toHaveAttribute('src','/assets/audit-upload.webp');
 }finally{await request.put('/api/admin/homepage',{headers:{Origin:'http://127.0.0.1:3100'},data:original});}
});

test('analytics accepts only anonymous events and respects browser privacy signals',async({page,request})=>{
 const headers={Origin:'http://127.0.0.1:3100'};
 expect((await request.post('/api/events',{headers,data:{event:'add_to_cart'}})).status()).toBe(204);
 expect((await request.post('/api/events',{headers,data:{event:'order_completed',phone:'03001234567'}})).status()).toBe(400);
 await page.addInitScript(()=>Object.defineProperty(navigator,'doNotTrack',{get:()=> '1'}));
 const events=[];page.on('request',req=>{if(req.url().endsWith('/api/events'))events.push(req.url());});
 await page.goto('/');await page.locator('.hero-buttons a[href="/menu/"]').click();await expect(page.locator('#search')).toBeVisible();expect(events).toEqual([]);
});

test('lost order response retries the same request without duplicating the order',async({page})=>{
 await page.goto('/menu/?fulfillment=takeaway');await page.locator('#search').fill('Test Sajji');await page.locator('#menu-grid [data-add]').click();await page.goto('/checkout');
 await page.getByLabel('Full name',{exact:true}).fill('Retry Customer');await page.getByLabel('Phone number',{exact:true}).fill('03005556666');
 let first=true,placed,keys=[];
 await page.route('**/api/orders',async route=>{
  keys.push(route.request().postDataJSON().request_key);
  if(first){first=false;const result=await route.fetch();expect(result.status()).toBe(201);placed=await result.json();await route.abort('connectionreset');}else await route.continue();
 });
 await expect(page.locator('#place-order')).toBeEnabled();await page.locator('#place-order').click();await expect(page.locator('#checkout-error')).not.toBeEmpty();
 await page.locator('#place-order').click();await expect(page).toHaveURL(new RegExp('/order/'+placed.order_number+'#'));
 expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);await expect(page.locator('#tracking-content')).toContainText('Test Sajji');
});

test('unavailable fulfillment and price revalidation keep checkout safe',async({page})=>{
 await page.route('**/api/catalog',async route=>{const data=await (await route.fetch()).json();data.settings.delivery_enabled=false;await route.fulfill({json:data});});
 await page.goto('/menu/?fulfillment=delivery');await expect(page.locator('.order-options')).toContainText('Online delivery is currently unavailable');
 await page.locator('#search').fill('Test Sajji');await page.locator('#menu-grid [data-add]').click();await page.goto('/checkout');
 await expect(page.locator('[name=fulfillment][value=delivery]')).toBeDisabled();await expect(page.locator('[name=fulfillment][value=takeaway]')).toBeChecked();
 await page.getByLabel('Full name',{exact:true}).fill('Price Customer');await page.getByLabel('Phone number',{exact:true}).fill('03007778888');
 await page.route('**/api/orders',route=>route.fulfill({status:400,json:{error:'Prices changed. Review your order.'}}));
 await expect(page.locator('#place-order')).toBeEnabled();await page.locator('#place-order').click();await expect(page.locator('#checkout-error')).toContainText('Review the updated total');await expect(page.locator('#place-order')).toBeEnabled();await expect(page.locator('#checkout-totals')).toContainText('Rs. 500');
});

test('a hung catalog stops loading and preserves the saved bag',async({page})=>{
 await page.goto('/menu/');await page.locator('#search').fill('Test Sajji');await page.locator('#menu-grid [data-add]').click();
 await page.route('**/api/catalog',()=>{});await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('[data-retry]')).toBeVisible({timeout:12000});await expect(page.locator('#bag-count')).toHaveText('1');await expect(page.locator('#menu-grid .food-card').first()).toBeVisible();
 await page.unroute('**/api/catalog');await page.locator('[data-retry]').click();await expect(page.locator('[data-add]:enabled').first()).toBeVisible();await expect(page.locator('#bag-count')).toHaveText('1');
});

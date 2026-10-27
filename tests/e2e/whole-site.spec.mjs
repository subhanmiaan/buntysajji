import {test,expect} from '@playwright/test';

test('all public routes remain usable across narrow, tablet and desktop themes',async({page,request})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const path of ['/','/menu/','/about/','/gallery/','/checkout','/not-a-page']){
  await page.goto(path);await page.waitForFunction(()=>window.publicReady===true);
  for(const theme of ['dark','light']){
   if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('[data-theme-toggle]').click();
   for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${path} ${theme} ${width}`).toBe(true);}
  }
  await expect(page.locator('#main h1')).toBeVisible();
 }
 for(const path of ['/.env','/server/app.mjs','/tests/audit-server.mjs','/supabase/seed.sql'])expect((await request.get(path)).status()).toBe(404);
 expect(errors).toEqual([]);
});

test('all admin pages render and login/logout protect the session',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/admin/login');await page.getByLabel('Email',{exact:true}).fill('audit@example.invalid');await page.getByLabel('Password',{exact:true}).fill('wrong');await page.getByRole('button',{name:'SIGN IN'}).click();await expect(page.locator('#login-error')).toContainText('incorrect');
 await page.getByLabel('Password',{exact:true}).fill('isolated-test-password');await page.getByRole('button',{name:'SIGN IN'}).click();await expect(page).toHaveURL(/admin\/orders$/);
 for(const path of ['/admin','/admin/menu','/admin/categories','/admin/delivery-zones','/admin/settings','/admin/homepage','/admin/promotions','/admin/security','/admin/orders']){
  await page.goto(path);await expect(page.locator('#admin-content')).not.toBeEmpty();await expect(page.locator('#admin-message')).not.toHaveClass('form-error');
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${path} ${width}`).toBe(true);}
 }
 await page.getByRole('button',{name:'LOG OUT'}).click();await expect(page).toHaveURL(/admin\/login$/);await page.goto('/admin/homepage');await expect(page).toHaveURL(/admin\/login$/);expect(errors).toEqual([]);
});

test('admin category, dish, portion and delivery zone CRUD reaches the public menu',async({page,context,browser})=>{
 await context.addCookies([{name:'bs_access',value:'isolated-admin',domain:'127.0.0.1',path:'/'}]);page.on('dialog',dialog=>dialog.accept());
 await page.goto('/admin/categories');await page.getByRole('button',{name:'ADD CATEGORY'}).click();await page.getByLabel('Name',{exact:true}).fill('Regression Kitchen');await page.getByRole('button',{name:'SAVE CATEGORY'}).click();await expect(page.locator('.admin-table')).toContainText('Regression Kitchen');
 await page.goto('/admin/menu');await page.getByRole('button',{name:'ADD FOOD ITEM'}).click();await page.getByLabel('Dish name').fill('Regression Dish');await page.getByLabel('Category',{exact:true}).selectOption({label:'Regression Kitchen'});await page.locator('#variant-list [data-option-name]').fill('Full');await page.locator('#variant-list [data-option-price]').fill('650');await page.getByRole('button',{name:'SAVE DISH'}).click();await expect(page.locator('.admin-table')).toContainText('Regression Dish');
 const row=page.locator('tr').filter({hasText:'Regression Dish'});await row.getByRole('button',{name:'Edit',exact:true}).click();await page.locator('#variant-list [data-option-price]').fill('700');await page.getByRole('button',{name:'SAVE DISH'}).click();await expect(row).toContainText('700');
 const shop=await browser.newPage();await shop.goto('http://127.0.0.1:3100/menu/');await shop.locator('#search').fill('Regression Dish');await expect(shop.locator('#menu-grid [data-price]')).toHaveText('Rs. 700');await shop.close();
 await row.getByRole('button',{name:'Delete',exact:true}).click();await expect(page.locator('.admin-table')).not.toContainText('Regression Dish');await page.goto('/admin/categories');await page.locator('tr').filter({hasText:'Regression Kitchen'}).getByRole('button',{name:'Delete',exact:true}).click();await expect(page.locator('.admin-table')).not.toContainText('Regression Kitchen');
 await page.goto('/admin/delivery-zones');await page.getByRole('button',{name:'ADD DELIVERY ZONE'}).click();await page.getByLabel('Name',{exact:true}).fill('Regression Zone');await page.getByLabel('Delivery fee (Rs.)').fill('125');await page.getByRole('button',{name:'SAVE ZONE'}).click();await expect(page.locator('.admin-table')).toContainText('Regression Zone');await page.locator('tr').filter({hasText:'Regression Zone'}).getByRole('button',{name:'Delete',exact:true}).click();await expect(page.locator('.admin-table')).not.toContainText('Regression Zone');
});

test('admin order desk advances a saved order and records payment',async({page,context})=>{
 const request=context.request;
 await context.addCookies([{name:'bs_access',value:'isolated-admin',domain:'127.0.0.1',path:'/'}]);
 const catalog=await (await request.get('/api/catalog')).json(),item=catalog.items.find(i=>i.name==='Test Sajji');await request.get('/api/checkout-session');await page.waitForTimeout(2100);
 const response=await request.post('/api/orders',{headers:{Origin:'http://127.0.0.1:3100'},data:{items:[{menu_item_id:item.id,variant_id:item.variants[0].id,quantity:1,addon_ids:[]}],fulfillment:'takeaway',customer_name:'Desk regression',phone:'03991234567',expected_total:500,request_key:crypto.randomUUID(),tracking_token:'f'.repeat(64)}});expect(response.status()).toBe(201);const created=await response.json();const order=(await (await request.get('/api/admin/orders')).json()).orders.find(o=>o.order_number===created.order_number);
 await page.goto('/admin/orders');await page.locator('#order-search').fill(order.order_number);await page.locator('.order-ticket').filter({hasText:order.order_number}).getByRole('button',{name:'View order'}).click();
 for(const status of ['confirmed','preparing',order.fulfillment==='delivery'?'out_for_delivery':'ready_for_pickup','completed']){await page.locator('#order-dialog [data-desk-advance]').click();await expect(page.locator('.detail-status')).toContainText(status.replaceAll('_',' '));}
 await expect(page.locator('#order-detail')).toContainText('Cash collected');
 const record=await (await request.get('/api/admin/orders/'+order.id)).json();expect(record.payment_status).toBe('paid');expect(record.history).toHaveLength(5);
});

test('admin voucher is applied by checkout and can be removed',async({page,context,browser})=>{
 await context.addCookies([{name:'bs_access',value:'isolated-admin',domain:'127.0.0.1',path:'/'}]);page.on('dialog',d=>d.accept());
 await page.goto('/admin/promotions');await page.getByRole('button',{name:'CREATE OFFER / VOUCHER'}).click();await page.getByLabel('Offer name',{exact:true}).fill('Regression Voucher');await page.getByLabel('Offer type').selectOption('voucher');await page.getByLabel('Voucher code',{exact:true}).fill('REGRESSION10');await page.getByLabel('Enable this offer during its scheduled dates').check();await page.getByRole('button',{name:'SAVE OFFER'}).click();await expect(page.locator('.promotion-list')).toContainText('REGRESSION10');
 const shop=await browser.newPage();await shop.goto('http://127.0.0.1:3100/menu/?fulfillment=takeaway');await shop.locator('#search').fill('Test Sajji');await shop.locator('#menu-grid [data-add]').click();await shop.goto('http://127.0.0.1:3100/checkout');await shop.getByLabel('Voucher code (optional)').fill('REGRESSION10');await shop.getByRole('button',{name:'APPLY',exact:true}).click();await expect(shop.locator('#checkout-totals .grand-total')).toContainText('450');await shop.close();
 await page.locator('.promotion-row').filter({hasText:'Regression Voucher'}).getByRole('button',{name:'Delete',exact:true}).click();await expect(page.locator('.promotion-list')).not.toContainText('REGRESSION10');
});

test('updated phone settings agree with the visible contact buttons',async({page})=>{
 await page.route('**/api/catalog',async route=>{const data=await (await route.fetch()).json();data.settings.phone='052 1234 567';data.settings.whatsapp2='';await route.fulfill({json:data});});await page.goto('/');await page.waitForFunction(()=>window.publicReady);
 const links=page.locator('a[href^="tel:"]');for(const link of await links.all()){await expect(link).toHaveAttribute('href','tel:0521234567');await expect(link).toContainText('052 1234 567');}
 await expect(page.locator('a[href="https://wa.me/"]')).toHaveCount(0);await expect(page.locator('.footer-contact')).toContainText('052 1234 567');
});

test('checkout totals refresh when quantities change through the header bag',async({page})=>{
 await page.goto('/menu/?fulfillment=takeaway');await page.locator('#search').fill('Test Sajji');await page.locator('#menu-grid [data-add]').click();await page.goto('/checkout');await expect(page.locator('#checkout-totals .grand-total')).toContainText('500');
 await page.locator('[data-bag]').click();await page.locator('#bag-dialog [data-delta="1"]').click();await page.getByRole('button',{name:'Close bag'}).click();
 await expect(page.locator('#checkout-totals .grand-total')).toContainText('1,000');await expect(page.locator('#checkout-lines .quantity span')).toHaveText('2');
});

test('malformed and forged API requests are rejected without server failures',async({request})=>{
 const headers={Origin:'http://127.0.0.1:3100'};
 for(const body of [null,[],{}, {items:[]},{items:[{quantity:-1}]},{fulfillment:'card'},{items:'wrong'},{__proto__:{admin:true}}, {items:Array(51).fill({})}]){
  const response=await request.post('/api/quote',{headers,data:body??'null'});expect(response.status()).toBeGreaterThanOrEqual(400);expect(response.status()).toBeLessThan(500);
 }
 expect((await request.post('/api/quote',{headers:{Origin:'https://untrusted.example'},data:{}})).status()).toBe(403);
 for(const path of ['/api/admin/catalog','/api/admin/orders','/api/admin/promotions','/api/admin/blocked-phones'])expect((await request.get(path)).status()).toBe(401);
 expect((await request.get('/api/orders/BS-1001',{headers:{Authorization:'Bearer invalid'}})).status()).toBe(401);
});

test('checkout rejects past pickup times and accepts a valid Pakistan-time schedule',async({page})=>{
 await page.goto('/menu/?fulfillment=takeaway');await page.locator('#search').fill('Test Sajji');await page.locator('#menu-grid [data-add]').click();await page.goto('/checkout');
 await page.getByLabel('Pickup timing',{exact:true}).selectOption('scheduled');await page.locator('[name=pickup_at]').fill('2000-01-01T12:00');await page.locator('[name=pickup_at]').blur();await expect(page.locator('#checkout-error')).toContainText('Pickup');await expect(page.locator('#place-order')).toBeDisabled();
 const future=new Date(Date.now()+7*3600000).toISOString().slice(0,16);await page.locator('[name=pickup_at]').fill(future);await page.locator('[name=pickup_at]').blur();await expect(page.locator('#place-order')).toBeEnabled();await expect(page.locator('#checkout-totals')).toContainText('scheduled pickup selected');
});

test('cart works in memory when browser storage is unavailable',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('Storage unavailable');};Storage.prototype.setItem=()=>{throw new Error('Storage unavailable');};});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/menu/');await page.locator('#search').fill('Test Sajji');await page.locator('#menu-grid [data-add]').click();await page.locator('[data-bag]').click();await expect(page.locator('#bag-content')).toContainText('Test Sajji');await expect(page.locator('#bag-count')).toHaveText('1');expect(errors).toEqual([]);
});

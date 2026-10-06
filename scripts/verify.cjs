const {chromium}=require('C:/Users/MMP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith('http://localhost'))errors.push(r.url()+' '+r.status());});
 await page.goto('http://localhost:3000');await page.locator('.hero-dish').waitFor();await page.screenshot({path:'tmp/home-desktop.png',fullPage:true});
 assert.equal(await page.locator('.hero-dish').evaluate(i=>i.complete&&i.naturalWidth>0),true);
 await page.goto('http://localhost:3000/menu/');assert.ok(await page.locator('.food-card').count()>100);
 await page.locator('#search').fill('Chicken Sajji');assert.equal(await page.locator('.food-card').count(),2);
 await page.locator('[data-variant="0"]').selectOption('2');assert.match(await page.locator('.food-card').first().locator('[data-price]').innerText(),/1,890/);
 await page.locator('[data-add="0"]').click();await page.locator('[data-bag]').click();assert.match(await page.locator('.total').innerText(),/1,890/);
 await page.locator('[data-delta="1"]').click();assert.match(await page.locator('.total').innerText(),/3,780/);
 await page.locator('#review-order').click();assert.equal(await page.locator('#order-summary a').getAttribute('href'),'tel:+92523242312');await page.locator('#bag-dialog [data-close]').click();
 await page.locator('#search').fill('');await page.getByRole('button',{name:'Fish',exact:true}).click();assert.equal(await page.locator('.food-card').count(),4);assert.equal(await page.locator('[data-add]').count(),0);
 await page.getByRole('button',{name:'All',exact:true}).click();await page.locator('#search').fill('nonexistent dish');assert.equal(await page.locator('.no-results').count(),1);
 await page.locator('#search').fill('');await page.getByRole('button',{name:'Platters',exact:true}).click();await page.screenshot({path:'tmp/menu-desktop.png',fullPage:true});
 for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.goto('http://localhost:3000/menu/');await page.locator('.mobile-toggle').click();assert.equal(await page.locator('nav').isVisible(),true);await page.locator('.mobile-toggle').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`tmp/menu-mobile-${width}.png`});}
 await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:3000');await page.screenshot({path:'tmp/home-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.goto('http://localhost:3000/gallery/');assert.equal(await page.locator('.gallery-card').count(),6);await page.locator('.gallery-card').nth(1).click();assert.equal(await page.locator('#image-dialog').isVisible(),true);await page.locator('#full-image').evaluate(i=>i.decode());await page.keyboard.press('Escape');
 await page.goto('http://localhost:3000/about/');assert.ok(await page.locator('#visit').innerText().then(x=>x.includes('(052) 3242312')));
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.button').first().evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.deepEqual(errors,[]);console.log('PASS: home, 100+ menu items, search, filters, selected prices, bag totals, phone ordering, six-sheet gallery, mobile navigation, 320/390px overflow, reduced motion, no runtime or local asset errors.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

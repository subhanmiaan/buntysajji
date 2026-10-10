import {test,expect} from '@playwright/test';
test('homepage and header work before a delayed catalog; image failure has a fallback',async({page})=>{
 let release;const hold=new Promise(resolve=>{release=resolve;});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/catalog',async route=>{await hold;await route.fulfill({status:503,json:{error:'Connection unavailable'}});});
 await page.route('**/assets/optimized/*',route=>route.abort());
 await page.goto('/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.hero h1')).toBeVisible();await expect(page.locator('.brand-wordmark').first()).toBeVisible();
 for(const width of [360,390,768,938,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('[data-bag]')).toBeInViewport();await expect(page.locator('[data-theme-toggle]')).toBeInViewport();}
 await page.setViewportSize({width:938,height:900});await page.getByRole('button',{name:'Toggle navigation'}).click();await expect(page.locator('header nav')).toBeVisible();
 await page.getByRole('button',{name:'Your bag'}).click();await expect(page.locator('#bag-dialog')).toBeVisible();await page.getByRole('button',{name:'Close bag'}).click();
 await expect(page.locator('.hero-dish')).toHaveClass(/image-fallback/);await page.screenshot({path:'test-results/loading-tablet.png'});
 release();await expect(page.locator('[data-retry]')).toBeVisible();expect(errors).toEqual([]);
});

test('slow connection shows the homepage without waiting for the API',async({page})=>{
 const cdp=await page.context().newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:400,downloadThroughput:150*1024,uploadThroughput:50*1024});
 await page.route('**/api/catalog',route=>route.fulfill({status:503,json:{error:'Offline test'}}));
 await page.setViewportSize({width:390,height:844});await page.goto('/',{waitUntil:'domcontentloaded'});await expect(page.locator('.hero')).toBeVisible();await expect(page.locator('.brand-wordmark').first()).toBeVisible();await page.screenshot({path:'test-results/slow-mobile.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const externalFonts=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('fonts.googleapis')||r.name.includes('fonts.gstatic')).length);expect(externalFonts).toBe(0);
});

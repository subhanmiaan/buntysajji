import {test,expect} from '@playwright/test';
test('public pages have distinct titles and no browser security-policy errors',async({page,request})=>{
 const errors=[];page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});page.on('pageerror',error=>errors.push(error.message));
 const titles=new Set();
 for(const path of ['/','/menu/','/about/','/gallery/','/checkout']){
  await page.goto(path);await page.waitForFunction(()=>window.publicReady===true);titles.add(await page.title());
 }
 expect(titles.size).toBe(5);expect(errors).toEqual([]);
 await page.goto('/gallery/');await expect(page.locator('button.gallery-card').first()).toBeVisible();
 await expect(page.locator('.gallery-card img').first()).toHaveAttribute('src',/menu-1-preview.webp$/);
 await page.locator('button.gallery-card').first().click();await expect(page.locator('#image-dialog')).toBeVisible();await expect(page.locator('#full-image')).toHaveAttribute('src','/assets/menu-1.jpg');
 expect((await request.get('/robots.txt')).status()).toBe(200);
 const sitemap=await request.get('/sitemap.xml');expect(sitemap.headers()['content-type']).toContain('application/xml');expect(await sitemap.text()).toContain('/gallery/');expect(await sitemap.text()).not.toContain('/checkout');
 expect((await request.get('/checkout')).headers()['x-robots-tag']).toContain('noindex');
});

import {test,expect} from '@playwright/test';
test('Urdu persists across pages, translates live controls and restores English',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.locator('[data-language-toggle]').click();
 await expect(page.locator('html')).toHaveAttribute('lang','ur');await expect(page.locator('html')).toHaveAttribute('dir','rtl');
 await expect(page.locator('header nav a').first()).toHaveText('صفحۂ اول');
 for(const path of ['/menu/','/about/','/gallery/','/checkout']){
  await page.goto(path);await expect(page.locator('html')).toHaveAttribute('lang','ur');
  await expect(page.locator('#main h1')).not.toContainText(/CHECKOUT|PICK YOUR|ROOTED|CLOSER LOOK/);
  for(const width of [360,390,938,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('[data-language-toggle]')).toBeInViewport();}
 }
 await page.goto('/menu/');await expect(page.locator('#search')).toHaveAttribute('placeholder','اپنی پسند کا کھانا تلاش کریں…');
 await page.locator('#search').fill('چکن');await expect(page.locator('#menu-grid .food-card h3').first()).toContainText('چکن');
 await page.locator('[data-language-toggle]').click();await expect(page.locator('html')).toHaveAttribute('dir','ltr');await expect(page.locator('#search')).toHaveAttribute('placeholder','Search your cravings…');
 await expect(page.locator('#menu-grid .food-card h3').first()).toContainText('Chicken');
 await page.locator('[data-add]:not([disabled])').first().click();await page.goto('/checkout');
 await page.locator('[name=customer_name]').fill('Language test');await page.locator('[data-language-toggle]').click();
 await expect(page.locator('#place-order')).toHaveText('آرڈر بھیجیں');await expect(page.getByLabel('پورا نام',{exact:true})).toHaveValue('Language test');
 await page.locator('[data-language-toggle]').click();await expect(page.getByLabel('Full name',{exact:true})).toHaveValue('Language test');
 expect(errors).toEqual([]);
});

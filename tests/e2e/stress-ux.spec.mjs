import {test,expect} from '@playwright/test';

test('selected add-ons and portions display the same price as the bag',async({page})=>{
 await page.goto('/menu/');await page.locator('#search').fill('Test Sajji');const card=page.locator('#menu-grid .food-card');
 await card.locator('[data-addon]').check();await expect(card.locator('[data-price]')).toHaveText('Rs. 550');
 await card.locator('[data-variant]').selectOption('1');await expect(card.locator('[data-price]')).toHaveText('Rs. 950');
 await card.locator('[data-add]').click();await page.locator('[data-bag]').click();await expect(page.locator('#bag-content .total')).toContainText('950');
});

test('corrupt cart rows do not discard valid saved items',async({page,request})=>{
 const c=await(await request.get('/api/catalog')).json(),item=c.items.find(i=>i.name==='Test Sajji');
 await page.addInitScript(item=>localStorage.setItem('bunty-cart-v3',JSON.stringify([null,17,{addon_ids:null},{menu_item_id:item.id,variant_id:item.variants[0].id,quantity:2,addon_ids:[]} ])),item);
 await page.goto('/menu/');await expect(page.locator('#bag-count')).toHaveText('2');await page.locator('[data-bag]').click();await expect(page.locator('#bag-content')).toContainText('Test Sajji');
});

test('menu search tolerates extra spaces and clears category filters',async({page})=>{
 await page.goto('/menu/?category=BBQ');await page.locator('#search').fill('unmatched-query');await expect(page.locator('.no-results')).toBeVisible();
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();await expect(page.locator('[data-category="All"]')).toHaveAttribute('aria-pressed','true');await expect(page).not.toHaveURL(/category=/);
 await page.locator('#search').fill('  Test    Sajji  ');await expect(page.locator('#menu-grid .food-card')).toHaveCount(1);
});

test('delivery search handles long lists without changing the selected charge',async({page})=>{
 await page.route('**/api/catalog',async route=>{const c=await(await route.fetch()).json(),zone=c.zones[0];c.zones=[zone,...Array.from({length:54},(_,i)=>({...zone,id:crypto.randomUUID(),name:'Neighbourhood '+i}))];await route.fulfill({json:c});});
 await page.goto('/');await page.locator('#coverage-search').fill('Neighbourhood 53');await expect(page.locator('#coverage-list li:visible')).toHaveCount(1);await page.locator('#coverage-search').fill('not-listed');await expect(page.locator('#coverage-empty')).toBeVisible();
 await page.goto('/menu/?fulfillment=delivery');await page.locator('#search').fill('Test Sajji');await page.locator('#menu-grid [data-add]').click();await page.locator('#menu-grid [data-add]').click();await page.goto('/checkout');
 await page.locator('#zone-search').fill('Test Area');await page.locator('[name=zone_id]').selectOption({label:'Test Area · Rs. 100'});await expect(page.locator('#checkout-totals .grand-total')).toContainText('1,100');const selected=await page.locator('[name=zone_id]').inputValue();
 await page.locator('#zone-search').fill('nothing-here');await expect(page.locator('#zone-search-status')).toContainText('No matching areas');await expect(page.locator('[name=zone_id]')).toHaveValue(selected);await expect(page.locator('#checkout-totals .grand-total')).toContainText('1,100');
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});

test('late quote responses cannot overwrite the latest cart total',async({page})=>{
 await page.goto('/menu/?fulfillment=takeaway');await page.locator('#search').fill('Test Sajji');await page.locator('#menu-grid [data-add]').click();await page.goto('/checkout');await expect(page.locator('#checkout-totals .grand-total')).toContainText('500');
 let delayed;await page.route('**/api/quote',async route=>{const body=route.request().postDataJSON();const response=await route.fetch();if(body.items[0].quantity===2)await new Promise(resolve=>{delayed=resolve;});await route.fulfill({response});});
 await page.locator('[data-check-qty][data-delta="1"]').click();await expect.poll(()=>Boolean(delayed)).toBe(true);await page.locator('[data-check-qty][data-delta="1"]').click();await expect(page.locator('#checkout-totals .grand-total')).toContainText('1,500');delayed();await page.waitForTimeout(250);await expect(page.locator('#checkout-totals .grand-total')).toContainText('1,500');
});

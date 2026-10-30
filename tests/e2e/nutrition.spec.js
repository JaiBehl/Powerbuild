import {test,expect} from '@playwright/test';
import {seed,openTab,card,readDb} from '../fixtures.js';
test('activity and manual calories are isolated by date across reload',async({page})=>{
 await seed(page);await openTab(page,'Calorie tracker');
 const log=card(page,'Food & meal log'),activity=card(page,'Daily activity'),target=card(page,'Daily calorie target');
 await log.getByLabel('Log date',{exact:true}).fill('2026-10-29');
 await activity.getByLabel('Miles walked',{exact:true}).fill('2');
 await target.getByLabel('Daily calorie goal source').selectOption('custom');await target.getByLabel('My daily calorie goal (kcal)').fill('2000');
 await log.getByLabel('Log date',{exact:true}).fill('2026-10-30');await activity.getByLabel('Miles walked',{exact:true}).fill('8');
 await target.getByLabel('Daily calorie goal source').selectOption('custom');await target.getByLabel('My daily calorie goal (kcal)').fill('3000');
 await page.reload();await openTab(page,'Calorie tracker');await card(page,'Food & meal log').getByLabel('Log date',{exact:true}).fill('2026-10-29');
 await expect(card(page,'Daily activity').getByLabel('Miles walked',{exact:true})).toHaveValue('2');
 await expect(card(page,'Daily calorie target').getByLabel('My daily calorie goal (kcal)')).toHaveValue('2000');
 expect((await readDb(page)).calorieSettings.milesWalked).toBe(4);
});

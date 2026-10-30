import {test,expect} from '@playwright/test';
import {seed,openTab,card,readDb} from '../fixtures.js';
test('activity and manual calories are isolated by date across reload',async({page})=>{
 await seed(page);await openTab(page,'Calorie tracker');
 const log=card(page,'Food & meal log'),activity=card(page,'Daily activity'),target=card(page,'Daily calorie target');
 await log.getByLabel('Food log date',{exact:true}).fill('2026-10-29');
 await activity.getByLabel('Miles walked').focus();await activity.getByLabel('Miles walked').press('Home');for(let i=0;i<8;i++)await activity.getByLabel('Miles walked').press('ArrowRight');
 await target.getByLabel('Daily calorie goal source').selectOption('custom');await target.getByLabel('My daily calorie goal (kcal)').fill('2000');
 await log.getByLabel('Food log date',{exact:true}).fill('2026-10-30');await activity.getByLabel('Miles walked').focus();await activity.getByLabel('Miles walked').press('Home');for(let i=0;i<32;i++)await activity.getByLabel('Miles walked').press('ArrowRight');
 await target.getByLabel('Daily calorie goal source').selectOption('custom');await target.getByLabel('My daily calorie goal (kcal)').fill('3000');
 await page.reload();await openTab(page,'Calorie tracker');await card(page,'Food & meal log').getByLabel('Food log date',{exact:true}).fill('2026-10-29');
 await expect(card(page,'Daily activity').getByLabel('Miles walked')).toHaveValue('2');
 await expect(card(page,'Daily calorie target').getByLabel('My daily calorie goal (kcal)')).toHaveValue('2000');
 expect((await readDb(page)).calorieSettings.milesWalked).toBe(4);
});

test('manual weight can reconnect to new Progress weigh-ins',async({page})=>{
 const {makeDb}=await import('../fixtures.js');
 await seed(page,makeDb({calorieSettings:{bodyWeight:200},weights:[{date:'2026-10-30',weight:180}]}));
 await openTab(page,'Calorie tracker');await card(page,'Food & meal log').getByLabel('Food log date',{exact:true}).fill('2026-10-30');
 const baseline=card(page,'Baseline maintenance');
 await expect(baseline.getByLabel('Weight (lb)',{exact:true})).toHaveValue('200');
 await baseline.getByLabel('Weight source',{exact:true}).selectOption('auto');
 await expect(baseline.getByLabel('Weight (lb)',{exact:true})).toHaveValue('180');
 await openTab(page,'Progress');await page.getByLabel('Bodyweight entry date').fill('2026-10-30');await page.getByPlaceholder('Weight (lb)').fill('185');await page.getByRole('button',{name:'Save weight',exact:true}).click();
 await openTab(page,'Calorie tracker');await expect(card(page,'Baseline maintenance').getByLabel('Weight (lb)',{exact:true})).toHaveValue('185');
 await expect(card(page,'Baseline maintenance').getByLabel('Weight (lb)',{exact:true})).toBeDisabled();
});

test('clearing a goal deadline leaves maintenance available and displays guidance',async({page})=>{
 await seed(page);await openTab(page,'Calorie tracker');await card(page,'Bodyweight goal').getByLabel('Goal deadline',{exact:true}).fill('');
 await expect(card(page,'Daily calorie target')).toContainText('Choose a valid goal deadline');await expect(card(page,'Daily calorie target')).toContainText('2,887');await expect(page.getByRole('heading',{level:1})).toBeVisible();
});

test('changing starting defaults does not rewrite an already recorded date',async({page})=>{
 await seed(page);await openTab(page,'Calorie tracker');await card(page,'Food & meal log').getByLabel('Food log date',{exact:true}).fill('2026-10-29');const slider=card(page,'Daily activity').getByLabel('Miles walked');await slider.focus();await slider.press('ArrowRight');
 await openTab(page,'Settings & backup');await page.getByLabel('Default starting weight (lb)',{exact:true}).fill('200');await openTab(page,'Calorie tracker');await expect(card(page,'Baseline maintenance').getByLabel('Weight (lb)',{exact:true})).toHaveValue('180');
 await card(page,'Food & meal log').getByLabel('Food log date',{exact:true}).fill('2026-10-30');await expect(card(page,'Baseline maintenance').getByLabel('Weight (lb)',{exact:true})).toHaveValue('200');
});

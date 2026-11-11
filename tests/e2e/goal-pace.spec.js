import {test,expect} from '@playwright/test';
import {seed,makeDb,card,openTab,DAY} from '../fixtures.js';
test('bodyweight goal shows signed weekly pace, updates with weigh-ins and converts to kg',async({page})=>{
 const db=makeDb({weights:[{date:DAY,weight:180}]});db.settings.targetWeight=182;db.settings.weightDeadline='2026-11-13';await seed(page,db);await openTab(page,'Calorie tracker');await page.getByLabel('Calculator date',{exact:true}).fill(DAY);let goal=card(page,'Bodyweight goal');await expect(goal.getByLabel('Weekly goal pace',{exact:true})).toContainText('+1.00 lb/week');
 await goal.getByLabel('Goal weight (lb)',{exact:true}).fill('178');await expect(goal.getByLabel('Weekly goal pace',{exact:true})).toContainText('-1.00 lb/week');
 await goal.getByLabel('Goal weight (lb)',{exact:true}).fill('180');await expect(goal.getByLabel('Weekly goal pace',{exact:true})).toContainText('0.00 lb/week');
 await goal.getByLabel('Goal weight (lb)',{exact:true}).fill('184');await openTab(page,'Progress');await page.getByLabel('Bodyweight entry date').fill(DAY);await page.getByPlaceholder('Weight (lb)').fill('182');await page.getByRole('button',{name:'Save weight',exact:true}).click();await openTab(page,'Calorie tracker');goal=card(page,'Bodyweight goal');await expect(goal.getByLabel('Weekly goal pace',{exact:true})).toContainText('+1.00 lb/week');
 await openTab(page,'Settings & backup');await page.getByLabel('Weight unit').selectOption('kg');await openTab(page,'Calorie tracker');goal=card(page,'Bodyweight goal');await expect(goal.getByLabel('Weekly goal pace',{exact:true})).toContainText('+0.45 kg/week');
 await goal.getByRole('button',{name:'Minimize Bodyweight goal',exact:true}).click();await expect(goal.locator('.calorie-section-stat')).toContainText('+0.45 kg/week');await expect(goal.locator('.calorie-section-stat')).toBeVisible();
});
test('weekly goal pace handles invalid and expired deadlines and fits a phone',async({page})=>{
 await page.setViewportSize({width:390,height:844});const db=makeDb({weights:[{date:DAY,weight:180}]});db.settings.targetWeight=182;db.settings.weightDeadline='2026-11-13';await seed(page,db);await openTab(page,'Calorie tracker');await page.getByLabel('Calculator date',{exact:true}).fill(DAY);const goal=card(page,'Bodyweight goal');await expect(goal.getByLabel('Weekly goal pace',{exact:true})).toContainText('+1.00 lb/week');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
 for(const value of ['',DAY,'2026-10-29']){await goal.getByLabel('Goal deadline',{exact:true}).fill(value);await expect(goal.getByLabel('Weekly goal pace',{exact:true})).toContainText('Choose a future deadline');await expect(goal.locator('.calorie-section-stat')).not.toContainText('/week');await expect(goal).not.toContainText('NaN');}
});

test('pausing bodyweight goals hides automatic calorie targets and preserves macro goals on a phone',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const db=makeDb({weights:[{date:DAY,weight:180}]});
 db.settings.targetWeight=182;
 db.settings.weightDeadline='2026-11-13';
 await seed(page,db);
 await openTab(page,'Calorie tracker');
 const goal=card(page,'Bodyweight goal'),calories=card(page,'Daily calorie target'),food=card(page,'Food & meal log');
 const macroSummary=card(page,'Macro targets').locator('.calorie-section-stat');
 const switcher=goal.getByRole('checkbox',{name:'Enable bodyweight goal'});
 const chooseDate=()=>page.getByLabel('Calculator date',{exact:true}).fill(DAY);
 await chooseDate();
 await expect(goal.getByLabel('Weekly goal pace',{exact:true})).toHaveText('+1.00 lb/week');
 const originalMacros=await macroSummary.innerText();
 await switcher.uncheck();
 await expect(goal.locator('.calorie-section-stat')).toHaveText('Off');
 await expect(goal.getByLabel('Weekly goal pace',{exact:true})).toHaveCount(0);
 await expect(page.locator('.goalpill')).toHaveCount(0);
 await expect(calories).toContainText('No calorie goal');
 await expect(food.getByText('CALORIES EATEN',{exact:true})).toBeVisible();
 await expect(food.getByText('CALORIES REMAINING',{exact:true})).toHaveCount(0);
 await expect(food.getByText('CALORIES OVER GOAL',{exact:true})).toHaveCount(0);
 await expect(macroSummary).toHaveText(originalMacros);
 await page.reload();
 await openTab(page,'Calorie tracker');
 await chooseDate();
 await expect(switcher).not.toBeChecked();
 await expect(macroSummary).toHaveText(originalMacros);
 await switcher.check();
 await expect(goal.getByLabel('Goal weight (lb)',{exact:true})).toHaveValue('182');
 await expect(goal.getByLabel('Goal deadline',{exact:true})).toHaveValue('2026-11-13');
 await expect(goal.getByLabel('Weekly goal pace',{exact:true})).toHaveText('+1.00 lb/week');
 await page.setViewportSize({width:1200,height:900});
 await expect(page.locator('.goalpill')).toBeVisible();
 await expect(macroSummary).toHaveText(originalMacros);
});

import {test,expect} from '@playwright/test';
import {seed,makeDb,makeSession,openTab,card,DAY,readDb} from '../fixtures.js';
test('editing recorded RPE updates predictions while preserving actual singles',async({page})=>{
  const s=makeSession();s.exercises[0].sets[0]={weight:200,reps:5,rpe:10,done:true};s.exercises[0].sets[1]={weight:225,reps:1,rpe:10,done:true};
  await seed(page,makeDb({sessions:[s],strengthGoals:[{id:'g',exercise:'bench',targetWeight:315,deadline:'2027-10-12'}]}));
  await page.getByLabel('Workout date').fill(DAY);let row=card(page,'Barbell bench press').locator('.setrow').nth(1);
  await row.getByRole('spinbutton').nth(2).fill('8');await openTab(page,'Progress');
  const records=card(page,'Personal records');await records.getByLabel('Records through date').fill(DAY);
  await expect(records.getByRole('row').filter({hasText:'Estimated 1RM (RPE-aware)'})).toContainText('239.5 lb');
  await expect(records).toContainText('5 reps @ RPE 8 · 2 RIR');
  await expect(records.getByRole('row').filter({hasText:'Achieved single'})).toContainText('225 lb');
  await expect(card(page,'Strength goals')).toContainText('239.5 lb');
  await page.reload();await openTab(page,'Progress');await expect(card(page,'Personal records')).toContainText('239.5 lb');
  expect((await readDb(page)).sessions[0].exercises[0].sets[1].weight).toBe(225);
});
test('unknown effort is labelled and easy or high-rep sets retain rep records',async({page})=>{
  const s=makeSession();s.exercises[0].sets=[{weight:200,reps:5,done:true},{weight:300,reps:5,rpe:6,done:true},{weight:200,reps:15,rpe:10,done:true}];
  await seed(page,makeDb({sessions:[s]}));await openTab(page,'Progress');
  const records=card(page,'Personal records');await records.getByLabel('Records through date').fill(DAY);
  const prediction=records.getByRole('row').filter({hasText:'Estimated 1RM (RPE-aware)'});
  await expect(prediction).toContainText('227.5 lb');await expect(prediction).toContainText('RPE missing · assumes failure');
  await expect(records.getByRole('row').filter({hasText:/^5/})).toContainText('300 lb');
});
test('maintenance formula and known-total override work without double-counting activity',async({page})=>{
  await seed(page);await openTab(page,'Calorie tracker');const baseline=card(page,'Baseline maintenance'),target=card(page,'Daily calorie target');
  await expect(target.locator('.metric').filter({hasText:'EST. MAINTENANCE'})).toContainText('3,166');
  await baseline.getByLabel('Resting metabolism formula').selectOption('mifflin');await expect(baseline).toContainText('Mifflin–St Jeor');
  await baseline.getByLabel('Baseline source').selectOption('custom');await baseline.getByLabel('Custom baseline (kcal)').fill('2300');
  await expect(target.locator('.metric').filter({hasText:'EST. MAINTENANCE'})).toContainText('2,936');
  await target.getByLabel('Maintenance source').selectOption('custom');await target.getByLabel('Known total maintenance (kcal/day)').fill('3000');
  await expect(target.locator('.metric').filter({hasText:'EST. MAINTENANCE'})).toContainText('3,000');
  const cardio=card(page,'Custom cardio');await cardio.getByLabel('Exercise',{exact:true}).fill('Synthetic bike');await cardio.getByLabel('Duration (min)',{exact:true}).fill('20');await cardio.getByLabel('Calories burned',{exact:true}).fill('100');await cardio.getByRole('button',{name:'Add cardio',exact:true}).click();
  await expect(target.locator('.metric').filter({hasText:'EST. MAINTENANCE'})).toContainText('3,000');
  await target.getByLabel('Known total maintenance (kcal/day)').fill('0');await expect(target).toContainText('Enter a positive known maintenance');await expect(target.getByLabel('Maintenance source')).toHaveValue('custom');
});
test('pace intensity and maintenance overrides persist only on their selected date',async({page})=>{
  await seed(page);await openTab(page,'Calorie tracker');await card(page,'Food & meal log').getByLabel('Food log date').fill('2026-10-29');
  await card(page,'Daily activity').getByLabel('Walking pace (minutes per mile)').fill('20');await card(page,'Daily activity').getByLabel('Average lifting intensity').selectOption('6');
  await card(page,'Daily calorie target').getByLabel('Maintenance source').selectOption('custom');await card(page,'Daily calorie target').getByLabel('Known total maintenance (kcal/day)').fill('3200');
  await page.reload();await openTab(page,'Calorie tracker');await card(page,'Food & meal log').getByLabel('Food log date').fill('2026-10-29');
  await expect(card(page,'Daily activity').getByLabel('Walking pace (minutes per mile)')).toHaveValue('20');await expect(card(page,'Daily activity').getByLabel('Average lifting intensity')).toHaveValue('6');
  await card(page,'Food & meal log').getByLabel('Food log date').fill(DAY);await expect(card(page,'Daily activity').getByLabel('Walking pace (minutes per mile)')).toHaveValue('22.5');await expect(card(page,'Daily calorie target').getByLabel('Maintenance source')).toHaveValue('estimate');
});
test('adult formula limits are visible and new controls fit a phone viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});await seed(page,makeDb({calorieSettings:{age:17}}));await openTab(page,'Calorie tracker');
  await expect(card(page,'Baseline maintenance')).toContainText('not validated for people under 18');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);
  await card(page,'Daily activity').getByLabel('Lifted today?').selectOption('no');await expect(card(page,'Daily activity').getByLabel('Average lifting intensity')).toBeDisabled();
});

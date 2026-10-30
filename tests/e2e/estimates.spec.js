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

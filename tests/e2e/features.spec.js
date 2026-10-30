import {test,expect} from '@playwright/test';
import {seed,makeDb,makeSession,readDb,card,DAY,openTab} from '../fixtures.js';
test('previous performance appears beside current sets without pre-filling them',async({page})=>{
 const old=makeSession('Push B','2026-10-29');old.finished=true;old.exercises.find(e=>e.name==='Touch-and-go bench press').sets[0]={weight:180,reps:5,rpe:8,done:true};
 await seed(page,makeDb({sessions:[old,makeSession()]}));await page.getByLabel('Workout date').fill(DAY);
 await expect(card(page,'Barbell bench press')).toContainText('2026-10-29');await expect(card(page,'Barbell bench press')).toContainText('180 lb × 5 @ 8 RPE');
 expect((await readDb(page)).sessions.find(s=>s.date===DAY).exercises[0].sets[0].weight).toBe('');
});
test('goal add, edit and remove remain functional',async({page})=>{
 await seed(page);await openTab(page,'Settings & backup');let goals=card(page,'Strength goals');
 await goals.getByLabel('Exercise',{exact:true}).fill('Barbell back squat');await goals.getByLabel('Goal weight (lb)',{exact:true}).fill('225');await goals.getByLabel('Goal date',{exact:true}).fill('2027-10-12');await goals.getByRole('button',{name:'Add strength goal',exact:true}).click();
 await goals.locator('.goal-editor-list').getByLabel('Goal weight (lb)',{exact:true}).fill('250');await openTab(page,'Progress');await expect(card(page,'Strength goals')).toContainText('250 lb');
 await openTab(page,'Settings & backup');await card(page,'Strength goals').getByTitle('Remove strength goal',{exact:true}).click();await expect.poll(async()=> (await readDb(page)).strengthGoals.length).toBe(0);
});
test('kg display conversion preserves canonical pounds',async({page})=>{
 const s=makeSession();s.exercises[0].sets[0]={weight:225,reps:1,done:true};await seed(page,makeDb({sessions:[s]}));await openTab(page,'Settings & backup');await page.getByLabel('Weight unit').selectOption('kg');await openTab(page,'Train');await page.getByLabel('Workout date').fill(DAY);
 await expect(card(page,'Barbell bench press').getByRole('spinbutton').first()).toHaveValue('102.1');expect((await readDb(page)).sessions[0].exercises[0].sets[0].weight).toBe(225);
});
test('food and custom cardio retain each other on a date',async({page})=>{
 await seed(page);await openTab(page,'Calorie tracker');const log=card(page,'Food & meal log');await log.getByLabel('Food / meal name',{exact:true}).fill('Synthetic lunch');await log.getByLabel('Calories (kcal) per serving',{exact:true}).fill('200');await log.getByRole('button',{name:'Add food to daily totals',exact:true}).click();
 const cardio=card(page,'Custom cardio');await cardio.getByLabel('Exercise',{exact:true}).fill('Synthetic bike');await cardio.getByLabel('Duration (min)',{exact:true}).fill('20');await cardio.getByLabel('Calories burned',{exact:true}).fill('100');await cardio.getByRole('button',{name:'Add cardio',exact:true}).click();
 await expect.poll(async()=> (await readDb(page)).calories[0].cardio.length).toBe(1);const db=await readDb(page);expect(db.calories[0].items[0].calories).toBe(200);expect(db.calories[0].cardio[0].calories).toBe(100);
});
async function downloadedText(download){const stream=await download.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks).toString();}
test('JSON backup and converted sets CSV contain active profile data',async({page})=>{
 const s=makeSession();s.exercises[0].sets[0]={weight:225,reps:1,rpe:8,done:true,tag:'Top'};await seed(page,makeDb({sessions:[s]}));await openTab(page,'Settings & backup');
 let wait=page.waitForEvent('download');await page.getByRole('button',{name:'Export profile backup',exact:true}).click();let file=await wait;const db=JSON.parse(await downloadedText(file));expect(db.sessions[0].exercises[0].sets[0].weight).toBe(225);
 await page.getByLabel('Weight unit').selectOption('kg');wait=page.waitForEvent('download');await page.getByRole('button',{name:'Export sets CSV',exact:true}).click();file=await wait;const csv=await downloadedText(file);expect(csv).toContain('Weight (kg)');expect(csv).toContain('102.06');expect(csv).toContain('Barbell bench press');
});

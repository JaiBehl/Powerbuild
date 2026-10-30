import {test,expect} from '@playwright/test';
import {seed,makeDb,makeSession,readDb,card,DAY} from '../fixtures.js';
test('session-only removal preserves template and survives reload',async({page})=>{
 const s=makeSession();await seed(page,makeDb({sessions:[s]}));await page.getByLabel('Workout date').fill(DAY);
 page.once('dialog',dialog=>dialog.accept());
 await card(page,'Barbell bench press').getByTitle('Remove exercise',{exact:true}).click();
 await expect.poll(async()=> (await readDb(page)).sessions[0].exercises.length).toBe(5);
 expect((await readDb(page)).templates['Push A'][0][0]).toBe('Barbell bench press');
 await page.reload();await page.getByLabel('Workout date').fill(DAY);await expect(page.getByRole('heading',{name:'Barbell bench press',exact:true})).toHaveCount(0);
});
test('future edit on reordered legacy workout matches the right exercise',async({page})=>{
 const s=makeSession();s.exercises.reverse();s.exercises.forEach(e=>delete e.templateId);
 await seed(page,makeDb({sessions:[s]}));await page.getByLabel('Workout date').fill(DAY);
 await page.getByLabel('Apply exercise changes to future sessions',{exact:true}).check();
 const values=['Updated supported press','6–8','2 RIR'];page.on('dialog',dialog=>dialog.accept(values.shift()));
 await card(page,'Supported seated barbell OHP').getByTitle('Edit exercise',{exact:true}).click();
 await expect.poll(async()=> (await readDb(page)).templates['Push A'][1][0]).toBe('Updated supported press');
 expect((await readDb(page)).templates['Push A'][0][0]).toBe('Barbell bench press');
});

test('ambiguous template edits show an error without crashing or changing data',async({page})=>{
 const s=makeSession();s.exercises.forEach(e=>delete e.templateId);const db=makeDb({sessions:[s]});db.templates['Push A'].push([...db.templates['Push A'][0]]);
 await seed(page,db);await page.getByLabel('Workout date').fill(DAY);await page.getByLabel('Apply exercise changes to future sessions',{exact:true}).check();
 const values=['Unsafe rename','5','2 RIR'];page.on('dialog',dialog=>dialog.accept(values.shift()));
 await card(page,'Barbell bench press').getByTitle('Edit exercise',{exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('not uniquely linked');
 expect((await readDb(page)).templates['Push A'][0][0]).toBe('Barbell bench press');
});

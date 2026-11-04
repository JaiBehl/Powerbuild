import {test,expect} from '@playwright/test';
import {validateProfileDb} from '../../src/backupSafety.js';
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
 const exercise=card(page,'Supported seated barbell OHP');
 await exercise.getByTitle('Edit exercise',{exact:true}).click();
 await exercise.getByLabel('Edit exercise name').fill('Updated supported press');
 await exercise.getByLabel('Edit exercise rep range').fill('6–8');
 await exercise.getByLabel('Edit exercise target').fill('2 RIR');
 await exercise.getByRole('button',{name:'Save exercise',exact:true}).click();
 await expect.poll(async()=> (await readDb(page)).templates['Push A'][1][0]).toBe('Updated supported press');
 expect((await readDb(page)).templates['Push A'][0][0]).toBe('Barbell bench press');
});

test('ambiguous template edits show an error without crashing or changing data',async({page})=>{
 const s=makeSession();s.exercises.forEach(e=>delete e.templateId);const db=makeDb({sessions:[s]});db.templates['Push A'].push([...db.templates['Push A'][0]]);
 await seed(page,db);await page.getByLabel('Workout date').fill(DAY);await page.getByLabel('Apply exercise changes to future sessions',{exact:true}).check();
 const exercise=card(page,'Barbell bench press');
 await exercise.getByTitle('Edit exercise',{exact:true}).click();
 await exercise.getByLabel('Edit exercise name').fill('Unsafe rename');
 await exercise.getByLabel('Edit exercise rep range').fill('5');
 await exercise.getByRole('button',{name:'Save exercise',exact:true}).click();
 await expect(exercise.getByRole('alert')).toContainText('not uniquely linked');
 expect((await readDb(page)).templates['Push A'][0][0]).toBe('Barbell bench press');
});

test('permission to edit future templates resets when switching workouts',async({page})=>{
 await seed(page,makeDb({sessions:[makeSession(),makeSession('Push B','2026-10-31')]}));await page.getByLabel('Workout date').fill(DAY);await page.getByLabel('Apply exercise changes to future sessions',{exact:true}).check();await page.getByLabel('Workout date').fill('2026-10-31');await expect(page.getByLabel('Apply exercise changes to future sessions',{exact:true})).not.toBeChecked();
});

test('an unlinked active exercise can be removed explicitly when future-template removal is blocked',async({page})=>{const s=makeSession();s.exercises[0].name='Synthetic session-only lift';delete s.exercises[0].templateId;const db=makeDb({sessions:[s]});await seed(page,db);await page.getByLabel('Workout date').fill(DAY);await page.getByLabel('Apply exercise changes to future sessions',{exact:true}).check();page.once('dialog',d=>d.accept());await card(page,'Synthetic session-only lift').getByTitle('Remove exercise',{exact:true}).click();await expect(page.getByRole('button',{name:'Remove from this session only',exact:true})).toBeVisible();expect((await readDb(page)).sessions[0].exercises.length).toBe(6);await page.getByRole('button',{name:'Remove from this session only',exact:true}).click();await expect(card(page,'Synthetic session-only lift')).toHaveCount(0);expect((await readDb(page)).templates['Push A'][0][0]).toBe('Barbell bench press');await page.reload();await page.getByLabel('Workout date').fill(DAY);await expect(card(page,'Synthetic session-only lift')).toHaveCount(0);});


test('negative set numbers cannot invalidate a saved profile backup',async({page})=>{
 const session=makeSession();
 session.exercises[0].sets[0]={weight:185,reps:'6',rpe:'8',done:true,tag:'Top'};
 await seed(page,makeDb({sessions:[session]}));
 await page.getByLabel('Workout date').fill(DAY);
 const bench=card(page,'Barbell bench press');
 const fields=bench.locator('.setrow').nth(1).getByRole('spinbutton');
 for(let i=0;i<3;i++)await fields.nth(i).fill('-5');
 const backup=await readDb(page);
 expect(backup.sessions[0].exercises[0].sets[0]).toEqual(session.exercises[0].sets[0]);
 expect(()=>validateProfileDb(backup)).not.toThrow();
 await fields.nth(0).fill('0');
 await fields.nth(1).fill('');
 await expect.poll(async()=> (await readDb(page)).sessions[0].exercises[0].sets[0])
  .toMatchObject({weight:0,reps:'',rpe:'8',done:true,tag:'Top'});
});

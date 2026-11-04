import {test,expect} from '@playwright/test';
import {seed,makeDb,makeSession,readDb,card,DAY} from '../fixtures.js';

const visibleOrder=page=>page.locator('section.train-exercise-section .calorie-section-heading h2').allTextContents();

test('move exercise up/down in active workout without losing logged sets or changing template',async({page})=>{
 const first=makeSession(),other=makeSession('Push A','2026-10-31');
 first.exercises[0].sets[0]={weight:185,reps:6,rpe:8,done:true,tag:'Top'};
 await seed(page,makeDb({sessions:[first,other]}));
 await page.getByLabel('Workout date').fill(DAY);
 const bench=card(page,'Barbell bench press');
 const initial=await visibleOrder(page);
 await expect(bench.getByRole('button',{name:'Move Barbell bench press up'})).toBeDisabled();
 await bench.getByRole('button',{name:'Move Barbell bench press down'}).click();
 const after=await visibleOrder(page);
 expect(after.slice(0,2)).toEqual([initial[1],initial[0]]);
 await expect(bench.getByLabel('Weight set 1 (lb)')).toHaveValue('185');
 expect((await readDb(page)).sessions[0].exercises[1].sets[0]).toEqual({weight:185,reps:6,rpe:8,done:true,tag:'Top'});
 expect((await readDb(page)).templates['Push A'][0][0]).toBe('Barbell bench press');
 expect((await readDb(page)).sessions[1].exercises[0].name).toBe('Barbell bench press');
 await page.reload();
 await page.getByLabel('Workout date').fill(DAY);
 expect((await visibleOrder(page)).slice(0,2)).toEqual([initial[1],initial[0]]);
 await card(page,'Barbell bench press').getByRole('button',{name:'Move Barbell bench press up'}).click();
 expect((await visibleOrder(page)).slice(0,2)).toEqual(initial.slice(0,2));
});

test('exercise order controls work while cards are minimized on phone and may update future templates explicitly',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const current=makeSession(),historical=makeSession('Push A','2026-10-29');
 await seed(page,makeDb({sessions:[historical,current]}));
 await page.getByLabel('Workout date').fill(DAY);
 const bench=card(page,'Barbell bench press');
 await bench.getByRole('button',{name:'Minimize Barbell bench press',exact:true}).click();
 await expect(bench.getByRole('button',{name:'Expand Barbell bench press',exact:true})).toBeVisible();
 await bench.getByRole('button',{name:'Move Barbell bench press down'}).click();
 await expect(bench.getByRole('button',{name:'Expand Barbell bench press',exact:true})).toBeVisible();
 let db=await readDb(page);
 expect(db.sessions.find(s=>s.id===current.id).exercises[1].name).toBe('Barbell bench press');
 expect(db.templates['Push A'][0][0]).toBe('Barbell bench press');
 await page.getByLabel('Apply exercise changes to future sessions',{exact:true}).check();
 await bench.getByRole('button',{name:'Move Barbell bench press down'}).click();
 db=await readDb(page);
 expect(db.templates['Push A'][0][0]).toBe('Supported seated barbell OHP');
 expect(db.templates['Push A'][1][0]).toBe('Incline machine or DB press');
 expect(db.templates['Push A'][2][0]).toBe('Barbell bench press');
 expect(db.sessions.find(s=>s.id===historical.id).exercises[0].name).toBe('Barbell bench press');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});

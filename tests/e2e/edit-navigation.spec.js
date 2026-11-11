import {test,expect} from '@playwright/test';
import {seed,makeDb,makeSession,readDb,openTab,card,DAY} from '../fixtures.js';

test('Edit workout and saved exercise jump to the appropriate editor and reopen a minimized editor',async({page})=>{
  await seed(page);
  await openTab(page,'Library');
  let editor=card(page,'Workout editor');
  await editor.getByRole('button',{name:'Minimize Workout editor',exact:true}).click();
  await expect(editor.getByRole('button',{name:'Expand Workout editor',exact:true})).toBeVisible();
  await card(page,'Workout library').getByRole('button',{name:'Edit workout Push A',exact:true}).click();
  await expect(editor.getByRole('button',{name:'Minimize Workout editor',exact:true})).toBeVisible();
  await expect(editor.getByLabel('Workout name',{exact:true})).toBeFocused();
  await expect(editor.getByLabel('Workout name',{exact:true})).toHaveValue('Push A');

  const exercise=card(page,'Exercise editor');
  await exercise.getByRole('button',{name:'Minimize Exercise editor',exact:true}).click();
  await card(page,'Exercise library').getByRole('button',{name:'Edit saved exercise Barbell bench press',exact:true}).click();
  await expect(exercise.getByRole('button',{name:'Minimize Exercise editor',exact:true})).toBeVisible();
  await expect(exercise.getByLabel('Exercise name',{exact:true})).toBeFocused();
  await expect(exercise.getByLabel('Exercise name',{exact:true})).toHaveValue('Barbell bench press');
  expect((await readDb(page)).sessions).toEqual([]);
});

test('loading a saved schedule opens its minimized editor and focuses it',async({page})=>{
  await seed(page);
  await openTab(page,'Split');
  const editor=card(page,'Split editor');
  await editor.getByLabel('Split name',{exact:true}).fill('My existing schedule');
  await editor.getByRole('button',{name:'Save entire split',exact:true}).click();
  await editor.getByRole('button',{name:'Minimize Split editor',exact:true}).click();
  await card(page,'Saved splits').getByRole('button',{name:'Load split My existing schedule',exact:true}).click();
  await expect(editor.getByRole('button',{name:'Minimize Split editor',exact:true})).toBeVisible();
  await expect(editor.getByLabel('Split name',{exact:true})).toBeVisible();
  await expect.poll(async()=>editor.evaluate(node=>{const r=node.getBoundingClientRect();return r.top>=-30&&r.top<window.innerHeight*.8;})).toBe(true);
  await expect(editor.getByLabel('Split name',{exact:true})).toHaveValue('My existing schedule');
});

test('inline Train exercise edit focuses the pencil editor without changing sets',async({page})=>{
  const workout=makeSession();
  workout.exercises[0].sets[0]={weight:185,reps:6,rpe:8,done:true,tag:'Top'};
  await seed(page,makeDb({sessions:[workout]}));
  await page.getByLabel('Workout date').fill(DAY);
  const bench=card(page,'Barbell bench press');
  await bench.getByTitle('Edit exercise',{exact:true}).click();
  await expect(bench.getByLabel('Edit exercise name',{exact:true})).toBeFocused();
  await expect(bench.getByLabel('Edit exercise name',{exact:true})).toHaveValue('Barbell bench press');
  await bench.getByRole('button',{name:'Cancel',exact:true}).click();
  expect((await readDb(page)).sessions[0].exercises[0].sets[0].weight).toBe(185);
});

test('Edit food and Edit saved food focus the correct form on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const food={id:'logged-item',name:'Synthetic banana',meal:'Snacks',calories:105,protein:1,carbs:27,fat:0.5};
  const saved={...food,id:'saved-item'};
  await seed(page,makeDb({calories:[{date:DAY,items:[food],cardio:[]}],savedFoods:[saved]}));
  await openTab(page,'Calorie tracker');
  await card(page,'Food & meal log').getByLabel('Food log date',{exact:true}).fill(DAY);
  const logged=card(page,'Food & meal log');
  await logged.getByRole('button',{name:'Edit Synthetic banana',exact:true}).click();
  await expect(logged.locator('.food-edit-box input').first()).toBeFocused();
  await expect(logged.locator('.food-edit-box input').first()).toHaveValue('Synthetic banana');
  await logged.getByRole('button',{name:'Cancel',exact:true}).click();
  const library=card(page,'Saved Foods');
  await library.getByRole('button',{name:'Edit saved Synthetic banana',exact:true}).click();
  await expect(library.locator('.saved-food-edit input').first()).toBeFocused();
  await expect(library.locator('.saved-food-edit input').first()).toHaveValue('Synthetic banana');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});

import {test,expect} from '@playwright/test';
import {seed,makeDb,makeSession,readDb,openTab,card,DAY} from '../fixtures.js';
test('all five tabs render and notes survive refresh',async({page})=>{
 await seed(page,makeDb({sessions:[makeSession()]}));
 await page.getByLabel('Workout date').fill(DAY);
 await page.getByPlaceholder('Sleep, fatigue, technique, soreness, sticking points...').fill('Synthetic recovery note');
 await expect.poll(async()=> (await readDb(page)).sessions[0].notes).toBe('Synthetic recovery note');
 await page.reload();await page.getByLabel('Workout date').fill(DAY);
 await expect(page.getByPlaceholder('Sleep, fatigue, technique, soreness, sticking points...')).toHaveValue('Synthetic recovery note');
 for(const name of ['Schedule','Progress','Calorie tracker','Settings & backup','Train']){await openTab(page,name);await expect(page.getByRole('heading',{level:1})).toBeVisible();}
});
test('food fractions update totals and saved food is reusable',async({page})=>{
 await seed(page);await openTab(page,'Calorie tracker');
 const log=card(page,'Food & meal log');
 await log.getByLabel('Food / meal name',{exact:true}).fill('Synthetic oats');
 await log.getByLabel('Calories (kcal) per serving',{exact:true}).fill('200');
 await log.getByLabel('Protein (g) per serving',{exact:true}).fill('10');
 await log.getByRole('button',{name:'½×',exact:true}).click();
 await log.getByRole('button',{name:'Save to Saved Foods',exact:true}).click();
 await log.getByRole('button',{name:'Add food to daily totals',exact:true}).click();
 await expect.poll(async()=> (await readDb(page)).calories[0].items[0].calories).toBe(100);
 await expect(card(page,'Saved Foods')).toContainText('Synthetic oats');
 await card(page,'Saved Foods').getByRole('button',{name:'Add to log',exact:true}).click();
 await expect.poll(async()=> (await readDb(page)).calories[0].items.length).toBe(2);
});
test('collapse keeps description and form draft',async({page})=>{
 await seed(page);await openTab(page,'Calorie tracker');
 const log=card(page,'Food & meal log');
 await log.getByLabel('Food / meal name',{exact:true}).fill('Unsaved draft');
 await log.getByRole('button',{name:'Minimize Food & meal log',exact:true}).click();
 await expect(log).toContainText('Log foods and servings individually');
 await expect(log.getByLabel('Food / meal name',{exact:true})).toBeHidden();
 await log.getByRole('button',{name:'Expand Food & meal log',exact:true}).click();
 await expect(log.getByLabel('Food / meal name',{exact:true})).toHaveValue('Unsaved draft');
});
test('profiles isolate existing workouts',async({page})=>{
 await seed(page,makeDb({sessions:[makeSession()]}));
 await page.locator('.profile-current').click();await page.getByPlaceholder('New profile name').fill('Guest test');await page.getByTitle('Create profile').click();
 await expect(page.locator('.profile-current')).toContainText('Guest test');
 await openTab(page,'Progress');await expect(card(page,'Workout history')).toContainText('No workouts logged yet');
 await page.locator('.profile-current').click();await page.locator('.profile-select').filter({hasText:'Test profile'}).click();
 await openTab(page,'Progress');await expect(card(page,'Workout history')).toContainText('Push A');
});

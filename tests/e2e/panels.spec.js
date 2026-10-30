import {test,expect} from '@playwright/test';import {seed,makeDb,makeSession,openTab,card} from '../fixtures.js';
test('collapsed panels survive tab changes and reload with descriptions and counts',async({page})=>{
 await seed(page,makeDb({sessions:[makeSession()]}));await openTab(page,'Progress');let history=card(page,'Workout history');
 await history.getByRole('button',{name:'Minimize Workout history',exact:true}).click();await expect(history).toContainText('Find every saved workout');await expect(history).toContainText('1 total workouts');await openTab(page,'Train');await openTab(page,'Progress');await expect(card(page,'Workout history').getByRole('button',{name:'Expand Workout history',exact:true})).toBeVisible();
 await page.reload();await openTab(page,'Progress');await expect(card(page,'Workout history').getByRole('button',{name:'Expand Workout history',exact:true})).toBeVisible();
});
test('another profile does not inherit collapsed panels',async({page})=>{
 await seed(page);await openTab(page,'Calorie tracker');await card(page,'Food & meal log').getByRole('button',{name:'Minimize Food & meal log',exact:true}).click();
 await page.locator('.profile-current').click();await page.getByPlaceholder('New profile name').fill('Separate view');await page.getByTitle('Create profile').click();await openTab(page,'Calorie tracker');await expect(card(page,'Food & meal log').getByRole('button',{name:'Minimize Food & meal log',exact:true})).toBeVisible();
});
test('all tabs remain usable at phone width without page-wide overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await seed(page,makeDb({sessions:[makeSession()]}));
 for(const tab of ['Train','Schedule','Progress','Calorie tracker','Settings & backup']){await openTab(page,tab);await expect(page.getByRole('heading',{level:1})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);}
});

import {test,expect} from '@playwright/test';
import {card,makeDb,makeSession,openTab,seed} from '../fixtures.js';

test('Progress chart ranges include the last day of a shorter cutoff month',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const dates=['2026-02-27','2026-02-28','2026-08-31'];
 const sessions=dates.map((date,index)=>{
  const session=makeSession('Push A',date);
  session.exercises[0].sets[0]={weight:200+index*5,reps:1,done:true};
  return session;
 });
 await seed(page,makeDb({sessions,weights:dates.map((date,index)=>({date,weight:180+index}))}));
 await openTab(page,'Progress');
 const strength=card(page,'Estimated 1RM trend'),bodyweight=card(page,'Bodyweight trend');
 await strength.getByLabel('Select exercise to chart').selectOption('Touch-and-go bench press');
 await expect(strength.locator('.trend-caption')).toContainText('2 logged dates');
 await expect(strength.getByRole('button',{name:'Open workout 2026-02-28',exact:true})).toBeVisible();
 await expect(strength.getByRole('button',{name:'Open workout 2026-02-27',exact:true})).toHaveCount(0);
 await expect(bodyweight.locator('.trend-caption')).toContainText('2 recorded dates');
 await strength.getByRole('button',{name:'All',exact:true}).click();
 await expect(strength.locator('.trend-caption')).toContainText('3 logged dates');
 await expect(bodyweight.locator('.trend-caption')).toContainText('2 recorded dates');
 await bodyweight.getByRole('button',{name:'All',exact:true}).click();
 await expect(bodyweight.locator('.trend-caption')).toContainText('3 recorded dates');
});

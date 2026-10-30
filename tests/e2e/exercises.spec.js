import {test,expect} from '@playwright/test';
import {seed,makeDb,makeSession,openTab,card} from '../fixtures.js';
test('bench history and goal use one series across standard names',async({page})=>{
 const a=makeSession('Push A','2026-10-29'),b=makeSession('Push B','2026-10-30');a.exercises[0].sets[0]={weight:180,reps:5,done:true};b.exercises.find(e=>e.name==='Touch-and-go bench press').sets[0]={weight:190,reps:5,done:true};
 await seed(page,makeDb({sessions:[a,b],strengthGoals:[{id:'goal',exercise:'Touch-and-go bench press',targetWeight:315,deadline:'2027-10-12'}]}));await openTab(page,'Progress');
 await expect(card(page,'Estimated 1RM trend')).toContainText('2 logged dates');
 await expect(card(page,'Strength goals')).toContainText('221.7 lb');
});
test('custom exercise links persist and remove without changing original logs',async({page})=>{
 await seed(page);await openTab(page,'Settings & backup');
 const aliases=card(page,'Exercise names & aliases');
 await aliases.getByLabel('Exercise alias',{exact:true}).fill('DB press');await aliases.getByLabel('Canonical exercise name',{exact:true}).fill('Dumbbell bench press');await aliases.getByRole('button',{name:'Save exercise link',exact:true}).click();
 await page.reload();await openTab(page,'Settings & backup');await expect(card(page,'Exercise names & aliases')).toContainText('db press → Dumbbell bench press');
 await card(page,'Exercise names & aliases').getByLabel('Remove link db press',{exact:true}).click();await expect(card(page,'Exercise names & aliases')).toContainText('0 custom links');
});

test('a 225 single is recorded as 225 rather than 232.5 in goals',async({page})=>{
 const s=makeSession();s.exercises[0].sets[0]={weight:225,reps:1,done:true};
 await seed(page,makeDb({sessions:[s],strengthGoals:[{id:'bench-goal',exercise:'Touch-and-go bench press',targetWeight:315,deadline:'2027-10-12'}]}));await openTab(page,'Progress');
 await expect(card(page,'Strength goals')).toContainText('225 lb');await expect(card(page,'Strength goals')).not.toContainText('232.5');
 await expect(card(page,'Estimated 1RM trend')).toContainText('Singles use the actual logged load');
});

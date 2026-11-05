import {test,expect} from '@playwright/test';
import {validateProfileDb} from '../../src/backupSafety.js';
import {seed,makeDb,makeSession,readDb,card,DAY,openTab} from '../fixtures.js';

for(const width of [1280,390])test(`cardio edits keep backups valid at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});
 const otherDay={date:'2026-10-29',items:[],cardio:[{id:'other-cardio',name:'Synthetic walk',durationMinutes:30,calories:90}]};
 const food={id:'food',name:'Synthetic lunch',calories:200,protein:10,carbs:20,fat:5};
 const entry={id:'cardio',name:'Synthetic bike',durationMinutes:20,calories:100};
 await seed(page,makeDb({sessions:[makeSession()],calories:[otherDay,{date:DAY,items:[food],cardio:[entry]}]}));
 await openTab(page,'Calorie tracker');await page.getByLabel('Calculator date',{exact:true}).fill(DAY);
 const cardio=card(page,'Custom cardio');const row=cardio.locator('.cardio-row');
 for(const label of ['Duration (min)','Calories burned'])await row.getByLabel(label,{exact:true}).fill('-5');
 let db=await readDb(page);
 expect(db.calories.find(d=>d.date===DAY).cardio).toEqual([entry]);
 expect(()=>validateProfileDb(db)).not.toThrow();
 await row.getByLabel('Duration (min)',{exact:true}).fill('0');
 await row.getByLabel('Calories burned',{exact:true}).fill('');
 await expect.poll(async()=> (await readDb(page)).calories.find(d=>d.date===DAY).cardio[0]).toMatchObject({durationMinutes:0,calories:''});
 await row.getByLabel('Duration (min)',{exact:true}).fill('25');
 await row.getByLabel('Calories burned',{exact:true}).fill('125');
 await page.reload();await openTab(page,'Calorie tracker');await page.getByLabel('Calculator date',{exact:true}).fill(DAY);
 await expect(card(page,'Custom cardio').locator('.cardio-row').getByLabel('Calories burned',{exact:true})).toHaveValue('125');
 db=await readDb(page);
 expect(()=>validateProfileDb(db)).not.toThrow();
 expect(db.calories.find(d=>d.date==='2026-10-29')).toMatchObject(otherDay);
 expect(db.calories.find(d=>d.date===DAY).items).toEqual([food]);
 expect(db.sessions).toHaveLength(1);
});

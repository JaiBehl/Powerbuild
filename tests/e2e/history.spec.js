import {test,expect} from '@playwright/test';
import {seed,openTab,card,readDb} from '../fixtures.js';
test('historical preview is non-mutating and explicit corrections replace owned sets',async({page})=>{
 await seed(page);await openTab(page,'Settings & backup');const panel=card(page,'Import Apple Notes workout history');
 const data={format:'powerbuild-historical-import-v1',metadata:{importId:'ui-batch'},sessions:[{id:'history',date:'2026-01-01',finished:true,exercises:[{id:'bench',name:'Bench',sets:[{weight:100,reps:5.9,done:true}]}]}],weights:[]};
 const upload=()=>panel.getByLabel('Historical JSON file',{exact:true}).setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
 await upload();expect((await readDb(page)).sessions.length).toBe(0);await expect(panel).toContainText('Add workout');
 page.once('dialog',dialog=>dialog.accept());await panel.getByRole('button',{name:'Apply previewed import',exact:true}).click();
 await expect.poll(async()=> (await readDb(page)).sessions[0].exercises[0].sets[0].reps).toBe(5);
 data.sessions[0].exercises[0].sets[0].reps=8;await upload();await panel.getByLabel('Import mode',{exact:true}).selectOption('correct');await expect(panel).toContainText('Correct exercise');
 page.once('dialog',dialog=>dialog.accept());await panel.getByRole('button',{name:'Apply previewed import',exact:true}).click();
 await expect.poll(async()=> (await readDb(page)).sessions[0].exercises[0].sets[0].reps).toBe(8);
 const recoveries=await page.evaluate(()=>JSON.parse(localStorage.getItem('powerbuild-recovery-v1:profile:test')));expect(recoveries[0].data.sessions[0].exercises[0].sets[0].reps).toBe(5);
});

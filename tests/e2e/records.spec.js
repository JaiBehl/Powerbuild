import {test,expect} from '@playwright/test';
import {seed,makeDb,makeSession,card,openTab,DAY} from '../fixtures.js';
const liftSession=(date,weight,reps=1)=>{const s=makeSession('Push A',date);s.exercises[0].sets[0]={weight,reps,done:true,rpe:8};return s;};
test('absolute PRs display logged, interpolated and unavailable bodyweights in lb and kg',async({page})=>{
 await seed(page,makeDb({sessions:[liftSession('2026-01-01',225),liftSession('2026-10-06',210,5),liftSession('2026-05-01',100,12)],weights:[{date:'2026-01-01',weight:200},{date:'2026-10-01',weight:180},{date:'2026-10-11',weight:190}]}));
 await openTab(page,'Progress');let records=card(page,'Absolute strength records');await records.getByLabel('Records through date',{exact:true}).fill(DAY);
 const singles=records.getByRole('row').filter({hasText:'Achieved single'});await expect(singles).toContainText('225 lb');await expect(singles).toContainText('BW 200 lb · logged 2026-01-01');
 await expect(records.getByRole('row').filter({hasText:'Estimated 1RM (RPE-aware)'})).toContainText('Est. BW 185 lb · interpolated 2026-10-01 → 2026-10-11');
 await expect(records.getByRole('row').filter({has:page.getByRole('rowheader',{name:'12',exact:true})})).toContainText('BW unavailable');
 await openTab(page,'Settings & backup');await page.getByLabel('Weight unit').selectOption('kg');await openTab(page,'Progress');records=card(page,'Absolute strength records');
 await expect(records.getByRole('row').filter({hasText:'Achieved single'})).toContainText('BW 90.7 kg');
 await expect(records.getByRole('row').filter({hasText:'Estimated 1RM (RPE-aware)'})).toContainText('Est. BW 83.9 kg');
 await page.reload();await openTab(page,'Progress');await expect(card(page,'Absolute strength records')).toContainText('BW 90.7 kg');
});
test('historical PR bodyweight recalculates when a weigh-in is corrected',async({page})=>{
 await seed(page,makeDb({sessions:[liftSession(DAY,225)],weights:[{date:DAY,weight:180}]}));await openTab(page,'Progress');const records=card(page,'Absolute strength records');await records.getByLabel('Records through date',{exact:true}).fill(DAY);await expect(records).toContainText('BW 180 lb · logged');
 const weighIn=card(page,'Bodyweight log');await weighIn.getByRole('spinbutton').fill('175');await weighIn.getByRole('button',{name:'Save weight',exact:true}).click();await expect(records).toContainText('BW 175 lb · logged');await expect(card(page,'Relative strength records')).toContainText('1.286× BW');
});
test('relative PRs choose independent winners and keep ratios invariant in kg',async({page})=>{
 const old=liftSession('2026-01-01',225),recent=liftSession('2026-10-01',215);old.exercises[0].sets[1]={weight:200,reps:5,rpe:8,done:true};recent.exercises[0].sets[1]={weight:190,reps:5,rpe:8,done:true};
 await seed(page,makeDb({sessions:[old,recent],weights:[{date:'2026-01-01',weight:200},{date:'2026-10-01',weight:170}]}));await openTab(page,'Progress');
 let relative=card(page,'Relative strength records');await relative.getByLabel('Relative records through date').fill(DAY);
 const singles=relative.getByRole('row').filter({hasText:'Achieved single ÷ BW'});await expect(singles).toContainText('1.265× BW');await expect(singles).toContainText('Lifted 215 lb');await expect(singles).toContainText('BW 170 lb');await expect(card(page,'Absolute strength records').getByRole('row').filter({hasText:'Achieved single'})).toContainText('225 lb');
 await expect(relative.getByRole('row').filter({hasText:'Estimated 1RM ÷ BW (RPE-aware)'})).toContainText('1 rep @ RPE 8 · 2 RIR');
 const fiveRep=relative.getByRole('table',{name:'Relative rep records',exact:true}).getByRole('row').filter({has:page.getByRole('rowheader',{name:'5',exact:true})});await expect(fiveRep).toContainText('1.118× BW');await expect(fiveRep).toContainText('Lifted 190 lb');
 await openTab(page,'Settings & backup');await page.getByLabel('Weight unit').selectOption('kg');await openTab(page,'Progress');relative=card(page,'Relative strength records');await expect(relative.getByRole('row').filter({hasText:'Achieved single ÷ BW'})).toContainText('1.265× BW');await expect(relative).toContainText('BW 77.1 kg');
});
test('relative records share movement/date controls and remember their independent collapsed state',async({page})=>{
 const old=liftSession('2026-10-01',225),squat=liftSession(DAY,315);squat.exercises[0].name='Barbell back squat';
 await seed(page,makeDb({sessions:[old,squat],weights:[{date:'2026-10-01',weight:180},{date:DAY,weight:180}]}));await openTab(page,'Progress');let relative=card(page,'Relative strength records');await relative.getByLabel('Relative records through date').fill(DAY);
 await relative.getByLabel('Exercise for relative records').selectOption('Barbell back squat');await expect(relative).toContainText('1.750× BW');await expect(card(page,'Absolute strength records').getByLabel('Exercise for records',{exact:true})).toHaveValue('Barbell back squat');
 await relative.getByLabel('Relative records through date').fill('2026-10-01');await expect(relative).toContainText('0 sets with bodyweight');await expect(card(page,'Absolute strength records').getByLabel('Records through date',{exact:true})).toHaveValue('2026-10-01');
 await relative.getByRole('button',{name:'Minimize Relative strength records',exact:true}).click();await expect(relative).toContainText('Best lift-to-bodyweight ratios');await expect(card(page,'Absolute strength records').getByRole('button',{name:'Minimize Absolute strength records',exact:true})).toBeVisible();
 await page.reload();await openTab(page,'Progress');await expect(card(page,'Relative strength records').getByRole('button',{name:'Expand Relative strength records',exact:true})).toBeVisible();
});
test('relative rankings visibly flag nearest bodyweight estimates and omit lifts without weight history',async({page})=>{
 await page.setViewportSize({width:390,height:844});await seed(page,makeDb({sessions:[liftSession('2026-01-01',500),liftSession('2026-10-01',225)],weights:[{date:'2026-10-03',weight:180}]}));await openTab(page,'Progress');const relative=card(page,'Relative strength records');await relative.getByLabel('Relative records through date').fill(DAY);
 await expect(relative).toContainText('1.250× BW');await expect(relative).toContainText('Est. BW 180 lb · nearest 2026-10-03 (2 days away)');await expect(relative).toContainText('1 set without nearby weigh-ins is excluded');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
 await relative.getByLabel('Relative records through date').fill('2026-01-01');await expect(relative).toContainText('No record with bodyweight');await expect(card(page,'Absolute strength records')).toContainText('500 lb');
});
test('bodyweight and assisted movements explain why relative rankings are unavailable',async({page})=>{
 const s=liftSession(DAY,45);s.exercises[0].name='Weighted pull-up';await seed(page,makeDb({sessions:[s],weights:[{date:DAY,weight:180}]}));await openTab(page,'Progress');const relative=card(page,'Relative strength records');await relative.getByLabel('Exercise for relative records').selectOption('Weighted pull-up');await expect(relative).toContainText('logged added load or assistance is not total resistance');await expect(card(page,'Absolute strength records')).toContainText('45 lb');
});
test('absolute winners show their own BW percentages for singles, estimates and reps in either unit',async({page})=>{
 await page.setViewportSize({width:390,height:844});const old=liftSession('2026-01-01',230),recent=liftSession('2026-10-29',225);old.exercises[0].sets[0].rpe=10;recent.exercises[0].sets[0].rpe=10;recent.exercises[0].sets[1]={weight:200,reps:5,rpe:10,done:true};
 await seed(page,makeDb({sessions:[old,recent],weights:[{date:'2026-01-01',weight:200},{date:'2026-10-28',weight:178},{date:DAY,weight:182}]}));await openTab(page,'Progress');let records=card(page,'Absolute strength records');await records.getByLabel('Records through date').fill(DAY);
 await expect(page.getByRole('heading',{name:'Personal records',exact:true})).toHaveCount(0);
 const singles=records.getByRole('row').filter({hasText:'Achieved single'});await expect(singles.getByRole('cell').nth(0)).toContainText('230 lb');await expect(singles.getByRole('cell').nth(0)).toContainText('115.0% BW');await expect(singles.getByRole('cell').nth(1)).toContainText('Est. 125.0% BW');
 await expect(records.getByRole('row').filter({hasText:'Estimated 1RM (RPE-aware)'})).toContainText('Est. 126.4% BW');
 await expect(records.getByRole('row').filter({has:page.getByRole('rowheader',{name:'5',exact:true})})).toContainText('Est. 111.1% BW');
 const layout=await page.evaluate(()=>({width:window.innerWidth,scroll:document.documentElement.scrollWidth,nodes:[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,cls:e.className?.baseVal??e.className,text:e.textContent?.slice(0,70),x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width,overflow:getComputedStyle(e).overflowX})).filter(e=>e.right>window.innerWidth+1).slice(0,40)}));
 if(layout.scroll>layout.width+1)console.log('Phone overflow diagnostics:',JSON.stringify(layout));
 expect(layout.scroll<=layout.width+1).toBe(true);
 const chart=page.locator('.trend-chart').first();await chart.hover({position:{x:120,y:100}});await expect(chart.locator('.recharts-tooltip-wrapper')).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
 await openTab(page,'Settings & backup');await page.getByLabel('Weight unit').selectOption('kg');await openTab(page,'Progress');records=card(page,'Absolute strength records');await expect(records).toContainText('115.0% BW');await expect(records).toContainText('Est. 125.0% BW');await expect(records).toContainText('Est. 126.4% BW');
});
test('renaming absolute records preserves the old saved collapse preference',async({page})=>{
 await page.addInitScript(()=>{const key=JSON.stringify(['test','progress','Personal records']);if(!localStorage.getItem('powerbuild-panel-state-v1'))localStorage.setItem('powerbuild-panel-state-v1',JSON.stringify({[key]:true}));});
 await seed(page);await openTab(page,'Progress');let records=card(page,'Absolute strength records');await expect(records.getByRole('button',{name:'Expand Absolute strength records',exact:true})).toBeVisible();await expect(records).toContainText('bodyweight percentages');
 await records.getByRole('button',{name:'Expand Absolute strength records',exact:true}).click();await expect(records.getByLabel('Exercise for records',{exact:true})).toBeVisible();await records.getByRole('button',{name:'Minimize Absolute strength records',exact:true}).click();
 await page.reload();await openTab(page,'Progress');await expect(card(page,'Absolute strength records').getByRole('button',{name:'Expand Absolute strength records',exact:true})).toBeVisible();
});

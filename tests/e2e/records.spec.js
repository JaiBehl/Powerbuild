import {test,expect} from '@playwright/test';
import {seed,makeDb,makeSession,card,openTab,DAY} from '../fixtures.js';
const liftSession=(date,weight,reps=1)=>{const s=makeSession('Push A',date);s.exercises[0].sets[0]={weight,reps,done:true,rpe:8};return s;};
test('absolute PRs display logged, interpolated and unavailable bodyweights in lb and kg',async({page})=>{
 await seed(page,makeDb({sessions:[liftSession('2026-01-01',225),liftSession('2026-10-06',210,5),liftSession('2026-05-01',100,12)],weights:[{date:'2026-01-01',weight:200},{date:'2026-10-01',weight:180},{date:'2026-10-11',weight:190}]}));
 await openTab(page,'Progress');let records=card(page,'Personal records');await records.getByLabel('Records through date',{exact:true}).fill(DAY);
 const singles=records.getByRole('row').filter({hasText:'Achieved single'});await expect(singles).toContainText('225 lb');await expect(singles).toContainText('BW 200 lb · logged 2026-01-01');
 await expect(records.getByRole('row').filter({hasText:'Estimated 1RM (RPE-aware)'})).toContainText('Est. BW 185 lb · interpolated 2026-10-01 → 2026-10-11');
 await expect(records.getByRole('row').filter({hasText:/^12/})).toContainText('BW unavailable');
 await openTab(page,'Settings & backup');await page.getByLabel('Weight unit').selectOption('kg');await openTab(page,'Progress');records=card(page,'Personal records');
 await expect(records.getByRole('row').filter({hasText:'Achieved single'})).toContainText('BW 90.7 kg');
 await expect(records.getByRole('row').filter({hasText:'Estimated 1RM (RPE-aware)'})).toContainText('Est. BW 83.9 kg');
 await page.reload();await openTab(page,'Progress');await expect(card(page,'Personal records')).toContainText('BW 90.7 kg');
});
test('historical PR bodyweight recalculates when a weigh-in is corrected',async({page})=>{
 await seed(page,makeDb({sessions:[liftSession(DAY,225)],weights:[{date:DAY,weight:180}]}));await openTab(page,'Progress');const records=card(page,'Personal records');await records.getByLabel('Records through date',{exact:true}).fill(DAY);await expect(records).toContainText('BW 180 lb · logged');
 const weighIn=card(page,'Bodyweight log');await weighIn.getByRole('spinbutton').fill('175');await weighIn.getByRole('button',{name:'Save weight',exact:true}).click();await expect(records).toContainText('BW 175 lb · logged');
});

import {test,expect} from '@playwright/test';import {seed,makeDb,makeSession,readDb,card,DAY,openTab} from '../fixtures.js';
test('workout deletion can be undone and recovery copies remain after reload',async({page})=>{
 await seed(page,makeDb({sessions:[makeSession()]}));await page.getByLabel('Workout date').fill(DAY);page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Delete workout',exact:true}).click();await expect.poll(async()=> (await readDb(page)).sessions.length).toBe(0);
 await page.getByRole('button',{name:'Undo last change',exact:true}).click();await expect.poll(async()=> (await readDb(page)).sessions.length).toBe(1);
 await page.reload();await openTab(page,'Settings & backup');await expect(card(page,'Recovery copies')).toContainText('Before removing profile data');
});
test('reset and recovery restore only affect the active profile',async({page})=>{
 await seed(page,makeDb({sessions:[makeSession()]}));await openTab(page,'Settings & backup');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Reset profile',exact:true}).click();await expect.poll(async()=> (await readDb(page)).sessions.length).toBe(0);
 const recovery=card(page,'Recovery copies');page.once('dialog',d=>d.accept());await recovery.getByRole('button',{name:'Restore profile copy',exact:true}).first().click();await expect.poll(async()=> (await readDb(page)).sessions.length).toBe(1);
});
test('malformed backup import leaves existing data intact',async({page})=>{
 await seed(page,makeDb({sessions:[makeSession()]}));await openTab(page,'Settings & backup');const backups=card(page,'Backups & exports');const bad=makeDb({sessions:[{date:DAY,exercises:'bad'}]});
 await backups.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await expect(backups).toContainText('must be an array');expect((await readDb(page)).sessions[0].type).toBe('Push A');
});
test('failed recovery storage blocks destructive deletion',async({page})=>{
 await seed(page,makeDb({sessions:[makeSession()]}));await page.getByLabel('Workout date').fill(DAY);await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('powerbuild-recovery-v1:'))throw new DOMException('Quota','QuotaExceededError');return original.call(this,k,v);};});
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Delete workout',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Could not save a recovery copy');expect((await readDb(page)).sessions.length).toBe(1);
});
test('ordinary storage failure shows an error while current edits remain exportable',async({page})=>{
 await seed(page,makeDb({sessions:[makeSession()]}));await page.getByLabel('Workout date').fill(DAY);await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('powerbuild-tracker-v1:profile:'))throw new DOMException('Quota','QuotaExceededError');return original.call(this,k,v);};});
 await page.getByPlaceholder('Sleep, fatigue, technique, soreness, sticking points...').fill('Still in memory');
 await expect(page.getByRole('alert')).toContainText('could not be saved');await expect(page.getByPlaceholder('Sleep, fatigue, technique, soreness, sticking points...')).toHaveValue('Still in memory');const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export current profile',exact:true}).click();expect((await download).suggestedFilename()).toContain('backup.json');
});

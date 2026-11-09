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

test('portable all-profile backup round trips through the recovery interface',async({page})=>{
 await seed(page,makeDb({sessions:[makeSession()]}));await openTab(page,'Settings & backup');const panel=card(page,'Recovery copies');
 const wait=page.waitForEvent('download');await panel.getByRole('button',{name:'Export all profiles',exact:true}).click();const download=await wait,stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);const backup=Buffer.concat(chunks);const data=JSON.parse(backup.toString());expect(data.profileData.test.sessions.length).toBe(1);
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Reset profile',exact:true}).click();await expect.poll(async()=> (await readDb(page)).sessions.length).toBe(0);
 page.once('dialog',d=>d.accept());await panel.getByLabel('All-profile backup JSON',{exact:true}).setInputFiles({name:'all-profiles.json',mimeType:'application/json',buffer:backup});await expect.poll(async()=> (await readDb(page)).sessions.length).toBe(1);
});
test('invalid all-profile JSON cannot replace existing profiles',async({page})=>{
 await seed(page,makeDb({sessions:[makeSession()]}));await openTab(page,'Settings & backup');const panel=card(page,'Recovery copies');page.once('dialog',d=>d.accept());
 await panel.getByLabel('All-profile backup JSON',{exact:true}).setInputFiles({name:'bad-account.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({profileState:{profiles:[{id:'missing'}]},profileData:{}}))});
 await expect(panel).toContainText('Existing profiles were left unchanged');expect((await readDb(page)).sessions.length).toBe(1);
});

test('quota failure during all-profile import preserves both original profiles on disk',async({page})=>{
 const session=makeSession();
 session.notes='a'.repeat(1000);
 await seed(page,makeDb({sessions:[session]}));
 await page.evaluate(()=>{
  const key='powerbuild-profiles-v1',meta=JSON.parse(localStorage.getItem(key));
  const second=JSON.parse(localStorage.getItem('powerbuild-tracker-v1:profile:test'));
  second.sessions[0].notes='';
  localStorage.setItem('powerbuild-tracker-v1:profile:other',JSON.stringify(second));
  meta.profiles.push({id:'other',name:'Other profile',createdAt:'2026-01-01'});
  localStorage.setItem(key,JSON.stringify(meta));
 });
 await page.reload();
 await openTab(page,'Settings & backup');
 const before=await page.evaluate(()=>{
  const keys=['powerbuild-tracker-v1:profile:test','powerbuild-tracker-v1:profile:other','powerbuild-profiles-v1'];
  const original=Storage.prototype.setItem,read=()=>keys.map(k=>localStorage.getItem(k));
  const saved=read(),limit=saved.reduce((sum,v)=>sum+v.length,0);
  window.workspaceWrites=[];
  Storage.prototype.setItem=function(k,v){
   if(this!==localStorage||!keys.includes(k))return original.call(this,k,v);
   const size=read().reduce((sum,item)=>sum+item.length,0);
   if(size-this.getItem(k).length+v.length>limit)throw new DOMException('Synthetic quota','QuotaExceededError');
   original.call(this,k,v);
   window.workspaceWrites.push(k);
  };
  return saved;
 });
 const [first,second,meta]=before.map(JSON.parse);
 second.sessions[0].notes=first.sessions[0].notes;
 first.sessions[0].notes='';
 meta.profiles[0].name+=' renamed';
 const incoming={profileState:meta,profileData:{test:first,other:second}};
 const recovery=card(page,'Recovery copies');
 page.once('dialog',d=>d.accept());
 await recovery.getByLabel('All-profile backup JSON',{exact:true}).setInputFiles({name:'synthetic-workspace.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))});
 await expect(recovery.getByRole('status')).toContainText('Could not save all profiles');
 const after=await page.evaluate(()=>({
  stored:['powerbuild-tracker-v1:profile:test','powerbuild-tracker-v1:profile:other','powerbuild-profiles-v1'].map(k=>localStorage.getItem(k)),
  writes:window.workspaceWrites,
  recovery:JSON.parse(localStorage.getItem('powerbuild-recovery-v1:workspace'))[0].data,
 }));
 expect(after.writes.slice(0,2)).toEqual(['powerbuild-tracker-v1:profile:test','powerbuild-tracker-v1:profile:other']);
 expect(after.stored).toEqual(before);
 expect(after.recovery.profileData.test.sessions[0].notes).toBe(session.notes);
 await page.reload();
 expect((await readDb(page)).sessions[0].notes).toBe(session.notes);
});

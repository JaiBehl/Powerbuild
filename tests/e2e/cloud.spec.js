import {deleteWorkoutDefinition} from '../../src/libraryDeletion.js';
import {test,expect} from '@playwright/test';
import {seed,readDb} from '../fixtures.js';
import {fakeBackend,login,syncActive,saveWeight} from '../cloud-fixtures.js';
test.setTimeout(60000);
test('two devices combine separate edits through revision conflicts',async({browser})=>{
 const backend=fakeBackend(),a=await browser.newContext(),b=await browser.newContext();await backend.install(a);await backend.install(b);
 try{
 const p=await a.newPage(),q=await b.newPage();await seed(p);await login(p);await p.getByRole('button',{name:'Upload this device',exact:true}).click();await syncActive(p);
 await seed(q);await login(q);await syncActive(q);
 backend.hold=true;await saveWeight(p,'2026-10-29',180);await saveWeight(q,'2026-10-30',185);
 await expect.poll(()=>backend.pending.length,{timeout:10000}).toBe(2);backend.release();
 await expect.poll(()=>backend.row.payload.profileData.test.weights.length,{timeout:20000}).toBe(2);
 await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await q.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect.poll(async()=> (await readDb(p)).weights.length,{timeout:15000}).toBe(2);await expect.poll(async()=> (await readDb(q)).weights.length,{timeout:15000}).toBe(2);
 }finally{backend.release();await a.close();await b.close();}
});
test('same-value conflict preserves copies before using cloud',async({page,context})=>{
 const backend=fakeBackend();await backend.install(context);await seed(page);await login(page);await page.getByRole('button',{name:'Upload this device',exact:true}).click();await syncActive(page);
 await saveWeight(page,'2026-10-30',180);await expect.poll(()=>backend.row.payload.profileData.test.weights[0]?.weight).toBe(180);await syncActive(page);
 backend.row=structuredClone(backend.row);backend.row.payload.profileData.test.weights[0].weight=190;backend.row.revision++;
 await saveWeight(page,'2026-10-30',185);await expect(page.getByRole('button',{name:'Use cloud data',exact:true})).toBeVisible({timeout:15000});
 await expect(page.getByRole('button',{name:'Download this device copy',exact:true})).toBeVisible();await page.getByRole('button',{name:'Use cloud data',exact:true}).click();await syncActive(page);
 await expect.poll(async()=> (await readDb(page)).weights[0].weight).toBe(190);
 const copies=await accountRecoveryCopies(page,backend.uid);
 expect(copies.some(p=>p.data.profileData.test.weights[0]?.weight===185)).toBe(true);expect(copies.some(p=>p.data.profileData.test.weights[0]?.weight===190)).toBe(true);
});
async function accountRecoveryCopies(page,uid){
 return page.evaluate(async id=>{
  const {loadAccountSync}=await import('/src/accountSyncStorage.js');
  return (await loadAccountSync(id)).recoveries;
 },uid);
}

test('phone sync migrates legacy copies and combines edits despite localStorage quota',async({page,context})=>{
 const backend=fakeBackend();await backend.install(context);
 await page.setViewportSize({width:390,height:844});
 await seed(page);
 const base=await page.evaluate(()=>{
  const profileState=JSON.parse(localStorage.getItem('powerbuild-profiles-v1'));
  const profileData={test:JSON.parse(localStorage.getItem('powerbuild-tracker-v1:profile:test'))};
  return {profileState,profileData};
 });
 const remote=structuredClone(base);
 remote.profileData.test.weights=[{date:'2026-10-29',weight:180}];
 backend.row={payload:remote,revision:2};
 await page.evaluate(({id,base})=>{
  localStorage.setItem('powerbuild-cloud-last-v1:'+id,JSON.stringify(base));
  localStorage.setItem('powerbuild-recovery-v1:account:'+id,JSON.stringify([
   {id:'legacy',label:'Existing recovery',createdAt:'2026-10-29T00:00:00Z',data:base},
  ]));
 },{id:backend.uid,base});
 await saveWeight(page,'2026-10-30',185);
 await page.addInitScript(()=>{
  const setItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
   if(this===localStorage&&/^powerbuild-(cloud-last-v1:|recovery-v1:account:)/.test(key)){
    throw new DOMException('The quota has been exceeded.','QuotaExceededError');
   }
   setItem.call(this,key,value);
  };
 });
 await page.reload();await login(page);await syncActive(page);
 await expect.poll(()=>backend.row.payload.profileData.test.weights.length).toBe(2);
 expect((await readDb(page)).weights.map(entry=>entry.weight).sort()).toEqual([180,185]);
 expect(await page.evaluate(id=>[
  localStorage.getItem('powerbuild-cloud-last-v1:'+id),
  localStorage.getItem('powerbuild-recovery-v1:account:'+id),
 ],backend.uid)).toEqual([null,null]);
 await page.reload();await syncActive(page);
 await page.getByRole('button',{name:'Account recovery copies (3)',exact:true}).click();
 await expect(page.getByText('Existing recovery',{exact:false})).toBeVisible();
 expect((await readDb(page)).weights.map(entry=>entry.weight).sort()).toEqual([180,185]);
});

test('failed recovery storage keeps the device and cloud copies intact',async({page,context})=>{
 const backend=fakeBackend();await backend.install(context);
 await seed(page);await login(page);
 await page.getByRole('button',{name:'Upload this device',exact:true}).click();await syncActive(page);
 const remote=structuredClone(backend.row);
 remote.payload.profileData.test.weights=[{date:'2026-10-29',weight:180}];
 remote.revision++;backend.row=remote;
 await page.evaluate(()=>{
  const put=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(value,key){
   if(this.transaction.db.name==='powerbuild-cloud-sync'&&String(key).startsWith('recovery:')){
    this.transaction.abort();return;
   }
   return put.call(this,value,key);
  };
  document.dispatchEvent(new Event('visibilitychange'));
 });
 await expect(page.locator('.cloud-error')).toContainText('Could not save account recovery copies');
 await expect(page.getByRole('button',{name:'Download this device copy',exact:true})).toBeVisible();
 expect((await readDb(page)).weights).toEqual([]);
 expect(backend.row).toEqual(remote);
});

test('offline edits survive reload and upload on retry; sign-out preserves local data',async({page,context})=>{
 const backend=fakeBackend();await backend.install(context);await seed(page);await login(page);await page.getByRole('button',{name:'Upload this device',exact:true}).click();await syncActive(page);
 backend.offline=true;await saveWeight(page,'2026-10-30',185);await expect(page.getByRole('button',{name:'Retry sync',exact:true})).toBeVisible({timeout:15000});await page.reload();
 await expect.poll(async()=> (await readDb(page)).weights[0].weight).toBe(185);
 await expect(page.getByRole('button',{name:'Retry sync',exact:true})).toBeVisible({timeout:15000});backend.offline=false;await page.getByRole('button',{name:'Retry sync',exact:true}).click();await expect.poll(()=>backend.row.payload.profileData.test.weights[0]?.weight,{timeout:20000}).toBe(185);await syncActive(page);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();expect((await readDb(page)).weights[0].weight).toBe(185);
});
test('signup and resend use the current origin for confirmation',async({page,context})=>{
 const backend=fakeBackend();await backend.install(context);await seed(page);await page.getByRole('button',{name:'Create an account',exact:true}).click();await page.getByPlaceholder('Email',{exact:true}).fill('synthetic@example.invalid');await page.getByPlaceholder('Password',{exact:true}).fill('synthetic-password');await page.getByRole('button',{name:'Create account',exact:true}).click();
 await expect(page.locator('.cloud-panel')).toContainText('Check your email');await page.getByRole('button',{name:'Resend confirmation email',exact:true}).click();await expect(page.locator('.cloud-panel')).toContainText('Confirmation email requested');
 const auth=backend.auth.filter(x=>/signup|resend/.test(x.url));expect(auth.length).toBe(2);for(const request of auth)expect(new URL(request.url).searchParams.get('redirect_to')).toBe('http://127.0.0.1:4173');
});

test('a response from a signed-out session cannot reactivate sync or replace later local edits',async({page,context})=>{
 const backend=fakeBackend();await backend.install(context);await seed(page);await login(page);await page.getByRole('button',{name:'Upload this device',exact:true}).click();await syncActive(page);
 backend.hold=true;await saveWeight(page,'2026-10-30',185);await expect.poll(()=>backend.pending.length).toBe(1);await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
 await saveWeight(page,'2026-10-30',190);backend.release();await expect.poll(()=>backend.row.payload.profileData.test.weights[0]?.weight).toBe(185);await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();expect((await readDb(page)).weights[0].weight).toBe(190);
});

test('two devices starting the same date show a conflict rather than hide a duplicate workout',async({browser})=>{
 const backend=fakeBackend(),a=await browser.newContext(),b=await browser.newContext();await backend.install(a);await backend.install(b);
 try{
  const p=await a.newPage(),q=await b.newPage();await seed(p);await login(p);await p.getByRole('button',{name:'Upload this device',exact:true}).click();await syncActive(p);await seed(q);await login(q);await syncActive(q);
  backend.hold=true;
  for(const page of [p,q]){await page.getByLabel('Workout date').fill('2026-10-30');await page.getByRole('button',{name:'Start another workout',exact:true}).click();await page.locator('.manual select').selectOption('Push A');await page.getByRole('button',{name:'Start selected',exact:true}).click();}
  await expect.poll(()=>backend.pending.length,{timeout:10000}).toBe(2);backend.release();
  await expect.poll(async()=>await p.getByRole('button',{name:'Use cloud data',exact:true}).count()+await q.getByRole('button',{name:'Use cloud data',exact:true}).count(),{timeout:20000}).toBe(1);
  expect(backend.row.payload.profileData.test.sessions.length).toBe(1);expect((await readDb(p)).sessions.length).toBe(1);expect((await readDb(q)).sessions.length).toBe(1);
 }finally{backend.release();await a.close();await b.close();}
});

test('remote workout deletion preserves a stale editor draft without invalid navigation or recreation',async({page,context})=>{const backend=fakeBackend();await backend.install(context);await seed(page);await login(page);await page.getByRole('button',{name:'Upload this device',exact:true}).click();await syncActive(page);await page.locator('nav').getByRole('button',{name:'Library',exact:true}).click();await page.getByRole('button',{name:'Edit workout Push A',exact:true}).click();await expect(page.getByRole('button',{name:'Select in Train',exact:true})).toBeVisible();const remote=structuredClone(backend.row);const db=remote.payload.profileData.test;remote.payload.profileData.test=deleteWorkoutDefinition(db,db.workoutMeta['Push A'].id);remote.revision++;backend.row=remote;await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect.poll(async()=>!!(await readDb(page)).templates['Push A'],{timeout:15000}).toBe(false);await expect(page.getByRole('button',{name:'Select in Train',exact:true})).toHaveCount(0);await expect(page.getByText('This workout was removed on another device.',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Save workout',exact:true}).click();await expect(page.getByRole('alert')).toContainText('no longer exists');expect((await readDb(page)).templates['Push A']).toBeUndefined();await page.getByRole('button',{name:'Reload saved workout',exact:true}).click();await expect(page.getByLabel('Workout name',{exact:true})).toHaveValue('');});

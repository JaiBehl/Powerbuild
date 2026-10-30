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
 const copies=await page.evaluate(uid=>JSON.parse(localStorage.getItem('powerbuild-recovery-v1:account:'+uid)),backend.uid);
 expect(copies.some(p=>p.data.profileData.test.weights[0]?.weight===185)).toBe(true);expect(copies.some(p=>p.data.profileData.test.weights[0]?.weight===190)).toBe(true);
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

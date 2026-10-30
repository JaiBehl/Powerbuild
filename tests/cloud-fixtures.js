import {expect} from '@playwright/test';
export function fakeBackend(){
 const uid='00000000-0000-0000-0000-000000000001',user={id:uid,aud:'authenticated',role:'authenticated',email:'synthetic@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:uid,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.synthetic';
 const state={row:null,offline:false,hold:false,pending:[],auth:[],uid};
 state.release=()=>{state.hold=false;state.pending.splice(0).forEach(done=>done());};
 state.install=async context=>context.route('https://powerbuild-test.supabase.co/**',async route=>{
  const request=route.request(),url=new URL(request.url()),headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  const reply=(body,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
  if(state.offline)return route.abort('internetdisconnected');
  if(url.pathname.includes('/auth/')){
   state.auth.push({url:request.url(),body:request.postDataJSON()});
   if(url.pathname.endsWith('/token'))return reply({access_token:token,refresh_token:'synthetic-refresh',token_type:'bearer',expires_in:3600,user});
   if(url.pathname.endsWith('/user'))return reply(user);
   if(url.pathname.endsWith('/signup'))return reply({user});
   if(url.pathname.endsWith('/logout'))return route.fulfill({status:204,headers});
   return reply({});
  }
  if(url.pathname.endsWith('/rpc/powerbuild_save_state')){
   if(state.hold)await new Promise(done=>state.pending.push(done));
   const body=request.postDataJSON(),revision=state.row?.revision||0;
   if(body.p_expected_revision!==revision)return reply({code:'P0001',message:'SYNC_CONFLICT'},400);
   state.row={payload:body.p_payload,revision:revision+1};return reply(state.row.revision);
  }
  if(url.pathname.endsWith('/powerbuild_cloud_state'))return reply(state.row?[state.row]:[]);
  return reply({message:'Unexpected synthetic endpoint'},404);
 });
 return state;
}
export async function login(page){
 await page.getByPlaceholder('Email',{exact:true}).fill('synthetic@example.invalid');await page.getByPlaceholder('Password',{exact:true}).fill('synthetic-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();
}
export async function syncActive(page){await expect(page.locator('.cloud-panel')).toContainText('Cloud sync active',{timeout:20000});}
export async function saveWeight(page,date,weight){await page.locator('nav').getByRole('button',{name:'Progress',exact:true}).click();await page.getByLabel('Bodyweight entry date').fill(date);await page.getByPlaceholder('Weight (lb)').fill(String(weight));await page.getByRole('button',{name:'Save weight',exact:true}).click();}

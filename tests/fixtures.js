import {initialSettings,workouts,createSession} from '../src/data.js';
export const DAY='2026-10-30';
export const makeDb=(extra={})=>({settings:{...initialSettings,targetWeight:180,weightDeadline:'2027-01-12'},strengthGoals:[],sessions:[],weights:[],calories:[],savedFoods:[],calorieSettings:{},templates:structuredClone(workouts),...extra});
export const makeSession=(type='Push A',date=DAY)=>createSession(type,date);
export async function seed(page,db=makeDb()){
 await page.addInitScript(({db})=>{
  if(!localStorage.getItem('powerbuild-profiles-v1')){
   localStorage.setItem('powerbuild-profiles-v1',JSON.stringify({profiles:[{id:'test',name:'Test profile',createdAt:'2026-01-01'}],activeProfileId:'test'}));
   localStorage.setItem('powerbuild-tracker-v1:profile:test',JSON.stringify(db));
  }
 },{db});
 await page.goto('/');
}
export const readDb=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('powerbuild-tracker-v1:profile:test')));
export const card=(page,title)=>page.locator('section').filter({has:page.getByRole('heading',{name:title,exact:true})});
export async function openTab(page,name){await page.locator('nav').getByRole('button',{name,exact:true}).click();}

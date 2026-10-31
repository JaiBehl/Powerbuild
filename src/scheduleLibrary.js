import {cycle} from './data.js';
import {libraryId,validLibraryName} from './libraryCore.js';
import {normalizeProgram,workoutEntry,saveWorkout} from './programLibrary.js';
import {isISODate} from './dates.js';
export const scheduleFields=['scheduleMode','startDate','schedule','cycleOffset','workoutCycle','weekdayWorkouts'];
export function scheduleSettings(settings){return {scheduleMode:settings.scheduleMode==='weekdays'?'weekdays':'rotation',startDate:settings.startDate,schedule:[...(settings.schedule||[])],cycleOffset:Number(settings.cycleOffset)||0,workoutCycle:structuredClone(settings.workoutCycle||cycle),weekdayWorkouts:structuredClone(settings.weekdayWorkouts||{})};}
export function validateSchedule(settings,templates){
 if(!isISODate(settings.startDate))throw Error('Choose a valid schedule start date.');
 if(!['rotation','weekdays'].includes(settings.scheduleMode))throw Error('Choose a schedule type.');
 if(!Array.isArray(settings.schedule)||settings.schedule.some(d=>!Number.isInteger(d)||d<1||d>7))throw Error('Training weekdays are invalid.');
 if(!Array.isArray(settings.workoutCycle)||settings.workoutCycle.length>100)throw Error('A rotation can have up to 100 slots.');
 if(!Number.isInteger(settings.cycleOffset)||settings.cycleOffset<0||settings.cycleOffset>=Math.max(1,settings.workoutCycle.length))throw Error('Choose a valid starting rotation slot.');
 if(!settings.weekdayWorkouts||typeof settings.weekdayWorkouts!=='object'||Array.isArray(settings.weekdayWorkouts)||Object.keys(settings.weekdayWorkouts).some(d=>!['1','2','3','4','5','6','7'].includes(d)))throw Error('Weekday assignments are invalid.');
 const refs=settings.scheduleMode==='weekdays'?Object.values(settings.weekdayWorkouts):settings.workoutCycle;
 if(refs.some(name=>name!==null&&(typeof name!=='string'||!Object.hasOwn(templates,name))))throw Error('The schedule references a workout that is no longer available.');return settings;
}
export function captureSchedule(db,settings=db.settings){
 const next=normalizeProgram(db),clean=scheduleSettings(settings);if(clean.scheduleMode==='weekdays'){clean.workoutCycle=[];clean.cycleOffset=0;}else clean.weekdayWorkouts={};validateSchedule(clean,next.templates);
 const names=[...new Set((clean.scheduleMode==='weekdays'?Object.values(clean.weekdayWorkouts):clean.workoutCycle).filter(Boolean))];
 const templates=Object.fromEntries(names.map(name=>[name,structuredClone(next.templates[name])])),workoutMeta=Object.fromEntries(names.map(name=>[name,{...structuredClone(next.workoutMeta[name]),revisions:[]}]));
 const workoutIds=Object.values(workoutMeta).map(m=>m.id);if(new Set(workoutIds).size!==workoutIds.length)throw Error('This plan references two names for the same workout. Use one name or duplicate the workout first.');
 const ids=new Set(Object.values(templates).flat().map(row=>row[6]?.exerciseId));
 return {settings:clean,templates,workoutMeta,exerciseLibrary:structuredClone(next.exerciseLibrary.filter(e=>ids.has(e.id)).map(e=>({...e,revisions:[]})))};
}
export function saveSchedule(db,{id,name,description='',snapshot}={}){
 name=validLibraryName(name);const list=db.savedSchedules||[],old=id?list.find(e=>e.id===id):null;
 if(id&&!old)throw Error('Saved schedule no longer exists.');if(list.some(e=>e.id!==id&&e.name.toLowerCase()===name.toLowerCase()))throw Error('A saved schedule with that name already exists.');if(!old&&list.length>=500)throw Error('Saved schedule limit reached.');
 const copy=structuredClone(snapshot||captureSchedule(db));validateSchedule(copy.settings,copy.templates);
 const now=new Date().toISOString(),entry={id:old?.id||libraryId(),name,description:String(description).slice(0,2000),snapshot:copy,archived:old?.archived||false,createdAt:old?.createdAt||now,updatedAt:now,revisions:old?[...(old.revisions||[]),{at:now,name:old.name,description:old.description,snapshot:old.snapshot}].slice(-10):[]};
 return {...db,savedSchedules:old?list.map(e=>e.id===id?entry:e):[...list,entry]};
}
export function archiveSchedule(db,id,archived=true){if(!(db.savedSchedules||[]).some(e=>e.id===id))throw Error('Saved schedule no longer exists.');return {...db,savedSchedules:db.savedSchedules.map(e=>e.id===id?{...e,archived,updatedAt:new Date().toISOString()}:e)};}
export function restoreScheduleRevision(db,id,index){const e=db.savedSchedules?.find(e=>e.id===id),r=e?.revisions?.[index];if(!r)throw Error('Schedule revision no longer exists.');return saveSchedule(db,{id,name:r.name,description:r.description,snapshot:r.snapshot});}
export function applySchedule(db,snapshot,{restoreWorkouts=true,name='Custom schedule'}={}){
 let next=normalizeProgram(db);const copy=structuredClone(snapshot),settings=scheduleSettings(copy.settings),mapping={};validateSchedule(settings,copy.templates);
 for(const [savedName,rows] of Object.entries(copy.templates)){
  const savedMeta=copy.workoutMeta?.[savedName],existing=savedMeta?.id?workoutEntry(next,savedMeta.id):null;
  if(!restoreWorkouts){if(existing)mapping[savedName]=existing[0];else if(Object.hasOwn(next.templates,savedName)&&!next.workoutMeta[savedName].archived)mapping[savedName]=savedName;else throw Error('A saved workout is missing. Enable Restore workout templates to restore it.');continue;}
  let target=existing?.[0]||savedName;
  if(!existing&&Object.hasOwn(next.templates,target)){const base=savedName.slice(0,80);let n=2;target=base+' restored';while(Object.hasOwn(next.templates,target))target=base+' restored '+n++;}
  // Snapshot prescriptions are independent. Normalize their links against the current exercise catalog.
  const restoredRows=rows.map(row=>{const r=structuredClone(row),oldId=r[6]?.exerciseId,def=next.exerciseLibrary.find(e=>e.id===oldId);if(def&&def.name!==r[0])r[6]={...r[6],exerciseId:undefined};return r;});
  next=saveWorkout(next,{id:existing?.[1].id,name:target,description:savedMeta?.description||'',rows:restoredRows});
  if(!existing&&savedMeta?.id){next={...next,workoutMeta:{...next.workoutMeta,[target]:{...next.workoutMeta[target],id:savedMeta.id}}};}
  next={...next,workoutMeta:{...next.workoutMeta,[target]:{...next.workoutMeta[target],archived:false}}};mapping[savedName]=target;
 }
 const mapped={...settings,workoutCycle:settings.workoutCycle.map(n=>n?mapping[n]||n:null),weekdayWorkouts:Object.fromEntries(Object.entries(settings.weekdayWorkouts).map(([d,n])=>[d,n?mapping[n]||n:null]))};validateSchedule(mapped,next.templates);
 const refs=mapped.scheduleMode==='weekdays'?Object.values(mapped.weekdayWorkouts):mapped.workoutCycle;if(refs.some(n=>n&&next.workoutMeta[n]?.archived))throw Error('Restore the archived workouts before applying this schedule.');
 const now=new Date().toISOString();return {...next,settings:{...next.settings,...mapped},scheduleLog:[...(next.scheduleLog||[]),{id:libraryId(),name,at:now,snapshot:captureSchedule(next,{...next.settings,...mapped})}].slice(-100)};
}

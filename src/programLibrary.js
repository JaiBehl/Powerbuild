import {cycle} from './data.js';
import {normalizeTemplates,replaceWorkoutRows} from './workoutOperations.js';
import {libraryId,validLibraryName} from './libraryCore.js';
import {normalizeExerciseLibrary} from './exerciseLibrary.js';
export {libraryId,libraryDate,validLibraryName} from './libraryCore.js';
export const programCycle=settings=>Array.isArray(settings.workoutCycle)?settings.workoutCycle:cycle;
const key=name=>String(name||'').trim().toLowerCase();
export function normalizeProgram(db,options={}){
 const templates=normalizeTemplates(db.templates||{}),meta={};
 for(const name of Object.keys(templates)){const old=db.workoutMeta?.[name];meta[name]={id:old?.id||'workout:'+encodeURIComponent(name),description:'',createdAt:null,updatedAt:null,archived:false,revisions:[],...old,name};}
 return normalizeExerciseLibrary({...db,templates,workoutMeta:meta,sessions:(db.sessions||[]).map(s=>s.workoutId||!Object.hasOwn(meta,s.type)?s:{...s,workoutId:meta[s.type].id})},options);
}
export const activeWorkoutNames=db=>Object.keys(db.templates||{}).filter(name=>!db.workoutMeta?.[name]?.archived).sort((a,b)=>a.localeCompare(b));
export function workoutEntry(db,id){return Object.entries(db.workoutMeta||{}).find(([,m])=>m.id===id);}
export function workoutSignature(db,id){const entry=workoutEntry(db,id);return entry?JSON.stringify([entry[0],db.templates[entry[0]],entry[1].description,entry[1].archived]):null;}
function validateRows(rows){
 if(!Array.isArray(rows)||rows.length>200)throw Error('A workout can have up to 200 exercises.');
 const seen=new Set();return rows.map(row=>{const out=structuredClone(row);out[0]=validLibraryName(row[0]);const sets=Number(row[1]);if(!Number.isInteger(sets)||sets<1||sets>100)throw Error('Set count must be a whole number from 1 to 100.');out[1]=sets;out[2]=String(row[2]||'8–12');out[3]=String(row[3]||'1–2 RIR');out[4]=row[4]==='strength'?'strength':'accessory';if(!out[5]||seen.has(out[5]))out[5]=libraryId();seen.add(out[5]);return out;});
}
export function saveWorkout(db,{id,name,description='',rows=[],expectedSignature}={}){
 let next=normalizeProgram(db);name=validLibraryName(name);const old=id?workoutEntry(next,id):null;
 if(id&&!old)throw Error('This workout no longer exists.');
 if(expectedSignature!==undefined&&expectedSignature!==workoutSignature(next,id))throw Error('This workout changed since you opened it. Reload it before saving.');
 if(Object.keys(next.templates).some(n=>key(n)===key(name)&&n!==old?.[0]))throw Error('A workout with that name already exists.');
 const clean=validateRows(rows).map(row=>{const linked=next.exerciseLibrary.find(e=>e.id===row[6]?.exerciseId);if(linked)row[0]=linked.name;return row;}),now=new Date().toISOString();
 if(!old){if(Object.keys(next.templates).length>=500)throw Error('Workout library limit reached.');return normalizeProgram({...next,templates:{...next.templates,[name]:clean},workoutMeta:{...next.workoutMeta,[name]:{id:libraryId(),name,description:String(description).slice(0,2000),createdAt:now,updatedAt:now,archived:false,revisions:[]}}},{newEntryDate:now});}
 const oldName=old[0];next=replaceWorkoutRows(next,oldName,clean);
 const meta={...next.workoutMeta[oldName],name,description:String(description).slice(0,2000)};
 const templates={...next.templates},workoutMeta={...next.workoutMeta};delete templates[oldName];delete workoutMeta[oldName];templates[name]=clean;workoutMeta[name]=meta;
 const settings={...next.settings};if(oldName!==name){settings.workoutCycle=programCycle(settings).map(n=>n===oldName?name:n);if(settings.weekdayWorkouts)settings.weekdayWorkouts=Object.fromEntries(Object.entries(settings.weekdayWorkouts).map(([day,n])=>[day,n===oldName?name:n]));}
 return normalizeProgram({...next,templates,workoutMeta,settings},{newEntryDate:now});
}
export function duplicateWorkout(db,id){const next=normalizeProgram(db),entry=workoutEntry(next,id);if(!entry)throw Error('Workout no longer exists.');const base=entry[0].slice(0,90);let name=base+' copy',i=2;while(Object.keys(next.templates).some(n=>key(n)===key(name)))name=base+' copy '+i++;
 return saveWorkout(next,{name,description:entry[1].description,rows:next.templates[entry[0]].map(row=>{const r=structuredClone(row);r[5]=libraryId();return r;})});}
export function archiveWorkout(db,id,archived=true){const next=normalizeProgram(db),entry=workoutEntry(next,id);if(!entry)throw Error('Workout no longer exists.');const [name,meta]=entry;
 const scheduled=next.settings.scheduleMode==='weekdays'?Object.values(next.settings.weekdayWorkouts||{}):programCycle(next.settings);
 if(archived&&scheduled.includes(name))throw Error('Remove this workout from the active schedule before archiving it.');
 return {...next,workoutMeta:{...next.workoutMeta,[name]:{...meta,archived,updatedAt:new Date().toISOString()}}};}
export function restoreWorkoutRevision(db,id,index){const next=normalizeProgram(db),entry=workoutEntry(next,id),revision=entry?.[1].revisions?.[index];if(!revision)throw Error('Revision no longer exists.');return saveWorkout(next,{id,name:revision.name,description:revision.description,rows:revision.exercises});}

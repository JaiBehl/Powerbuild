import {libraryId,validLibraryName} from './libraryCore.js';
import {normalizeTemplates,replaceWorkoutRows} from './workoutOperations.js';
import {setExerciseAlias,resolveExerciseName,exerciseNameKey} from './exerciseCatalog.js';
const key=name=>String(name||'').trim().toLowerCase();
export function normalizeExerciseLibrary(db,{newEntryDate=null}={}){
 const list=structuredClone(Array.isArray(db.exerciseLibrary)?db.exerciseLibrary:[]),byId=new Map(list.map(e=>[e.id,e])),byName=new Map(list.map(e=>[key(e.name),e]));
 const ensure=(name,sets,range,target,kind,requestedId)=>{
  let e=byId.get(requestedId)||byName.get(key(name));
  if(!e){e={id:'exercise:'+encodeURIComponent(key(name)),name,sets:Math.max(1,Math.min(100,Number(sets)||3)),range:range||'8–12',target:target||'1–2 RIR',kind:kind||'accessory',createdAt:newEntryDate,updatedAt:newEntryDate,archived:false,revisions:[]};list.push(e);byId.set(e.id,e);byName.set(key(name),e);}return e;
 };
 const templates=Object.fromEntries(Object.entries(normalizeTemplates(db.templates||{})).map(([name,rows])=>[name,rows.map(row=>{const next=structuredClone(row),config=next[6]&&typeof next[6]==='object'?next[6]:{};const e=ensure(row[0],row[1],row[2],row[3],row[4],config.exerciseId);next[6]={...config,exerciseId:e.id};return next;})]));
 for(const s of db.sessions||[])for(const e of s.exercises||[])ensure(e.name,e.sets?.length,e.range,e.target,e.kind,e.libraryExerciseId);
 return {...db,templates,exerciseLibrary:list};
}
export function exerciseRow(e){return [e.name,e.sets,e.range,e.target,e.kind,libraryId(),{exerciseId:e.id}];}
export function saveExerciseDefinition(db,{id,name,sets=3,range='8–12',target='1–2 RIR',kind='accessory',applyToWorkouts=false}={}){
 let next=normalizeExerciseLibrary(db);name=validLibraryName(name);sets=Number(sets);if(!Number.isInteger(sets)||sets<1||sets>100)throw Error('Set count must be a whole number from 1 to 100.');
 const old=id?next.exerciseLibrary.find(e=>e.id===id):null;if(id&&!old)throw Error('Exercise no longer exists.');if(next.exerciseLibrary.some(e=>key(e.name)===key(name)&&e.id!==id))throw Error('An exercise with that name already exists.');
 const now=new Date().toISOString(),clean={name,sets,range:String(range||'8–12'),target:String(target||'1–2 RIR'),kind:kind==='strength'?'strength':'accessory'};
 const entry=old?{...old,...clean,updatedAt:now,revisions:[...(old.revisions||[]),{at:now,data:Object.fromEntries(Object.entries(old).filter(([k])=>k!=='revisions'))}].slice(-10)}:{...clean,id:libraryId(),createdAt:now,updatedAt:now,archived:false,revisions:[]};
 if(!old&&next.exerciseLibrary.length>=10000)throw Error('Exercise library limit reached.');
 let aliases=next.exerciseAliases||{};if(old&&old.name!==name){aliases={...aliases};if(resolveExerciseName(name,aliases)===resolveExerciseName(old.name,aliases))delete aliases[exerciseNameKey(name)];aliases=setExerciseAlias(aliases,old.name,name);}
 next={...next,exerciseAliases:aliases,exerciseLibrary:old?next.exerciseLibrary.map(e=>e.id===id?entry:e):[...next.exerciseLibrary,entry]};
 if(old)for(const [type,rows] of Object.entries(next.templates)){
  const updated=rows.map(row=>{if(row[6]?.exerciseId!==id)return row;const r=structuredClone(row);r[0]=name;if(applyToWorkouts){r[1]=sets;r[2]=clean.range;r[3]=clean.target;r[4]=clean.kind;}return r;});
  if(JSON.stringify(rows)!==JSON.stringify(updated))next=replaceWorkoutRows(next,type,updated);
 }
 return next;
}
export function duplicateExerciseDefinition(db,id){const old=db.exerciseLibrary.find(e=>e.id===id);if(!old)throw Error('Exercise no longer exists.');const base=old.name.slice(0,90);let name=base+' copy',i=2;while(db.exerciseLibrary.some(e=>key(e.name)===key(name)))name=base+' copy '+i++;return saveExerciseDefinition(db,{...old,id:undefined,name});}
export function archiveExerciseDefinition(db,id,archived=true){if(!db.exerciseLibrary.some(e=>e.id===id))throw Error('Exercise no longer exists.');return {...db,exerciseLibrary:db.exerciseLibrary.map(e=>e.id===id?{...e,archived,updatedAt:new Date().toISOString()}:e)};}
export function restoreExerciseRevision(db,id,index,applyToWorkouts=false){const e=db.exerciseLibrary.find(e=>e.id===id),r=e?.revisions?.[index];if(!r)throw Error('Revision no longer exists.');return saveExerciseDefinition(db,{...r.data,id,applyToWorkouts});}

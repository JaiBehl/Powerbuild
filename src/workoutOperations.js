// Template IDs are stable across renames/reordering; old sessions resolve only by a unique name.
const id=()=>globalThis.crypto?.randomUUID?.()||'exercise-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const nameKey=value=>String(value||'').trim().toLowerCase();
export function normalizeTemplates(templates={}){
 return Object.fromEntries(Object.entries(templates).map(([type,list])=>[type,(Array.isArray(list)?list:[]).map((row,i)=>{
  const tuple=[...row];tuple[5]=tuple[5]||'template:'+encodeURIComponent(type)+':'+i+':'+encodeURIComponent(row[0]);return tuple;
 })]));
}
function targetTemplate(list,exercise){
 const matches=exercise.templateId?list.map((row,i)=>row[5]===exercise.templateId?i:-1).filter(i=>i>=0):list.map((row,i)=>nameKey(row[0])===nameKey(exercise.name)?i:-1).filter(i=>i>=0);
 if(matches.length!==1)throw Error('This exercise is not uniquely linked to a current template. Edit this session only, or add it explicitly to future workouts.');
 return matches[0];
}
export function editSessionExercise(db,sessionId,exerciseId,changes,updateFuture=false){
 const session=db.sessions.find(s=>s.id===sessionId),exercise=session?.exercises.find(e=>e.id===exerciseId);
 if(!exercise)throw Error('Exercise no longer exists.');
 let templates=db.templates,templateId=exercise.templateId;
 if(updateFuture){
  templates=normalizeTemplates(db.templates);const list=[...(templates[session.type]||[])];const index=targetTemplate(list,exercise),row=[...list[index]];
  row[0]=changes.name??row[0];row[2]=changes.range??row[2];row[3]=changes.target??row[3];templateId=row[5];list[index]=row;templates={...templates,[session.type]:list};
 }
 return {...db,templates,sessions:db.sessions.map(s=>s.id!==sessionId?s:{...s,exercises:s.exercises.map(e=>e.id!==exerciseId?e:{...e,...changes,...(templateId?{templateId}:{})})})};
}
export function removeSessionExercise(db,sessionId,exerciseId,updateFuture=false){
 const session=db.sessions.find(s=>s.id===sessionId),exercise=session?.exercises.find(e=>e.id===exerciseId);
 if(!exercise)throw Error('Exercise no longer exists.');
 let templates=db.templates;
 if(updateFuture){templates=normalizeTemplates(db.templates);const list=templates[session.type]||[];const index=targetTemplate(list,exercise);templates={...templates,[session.type]:list.filter((_,i)=>i!==index)};}
 return {...db,templates,sessions:db.sessions.map(s=>s.id!==sessionId?s:{...s,exercises:s.exercises.filter(e=>e.id!==exerciseId)})};
}
export function addSessionExercise(db,sessionId,name,updateFuture=false){
 const session=db.sessions.find(s=>s.id===sessionId);if(!session||!name.trim())return db;
 const exerciseId=id(),templateId=id();
 const exercise={id:exerciseId,name:name.trim(),range:'8–12',target:'1–2 RIR',kind:'accessory',...(updateFuture?{templateId}:{}),sets:Array.from({length:3},()=>({weight:'',reps:'',rpe:'',done:false,tag:''}))};
 let templates=db.templates;
 if(updateFuture){templates=normalizeTemplates(db.templates);templates={...templates,[session.type]:[...(templates[session.type]||[]),[exercise.name,3,exercise.range,exercise.target,'accessory',templateId]]};}
 return {...db,templates,sessions:db.sessions.map(s=>s.id!==sessionId?s:{...s,exercises:[...s.exercises,exercise]})};
}

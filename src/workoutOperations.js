// Template IDs are stable across renames/reordering; old sessions resolve only by a unique name.
const id=()=>globalThis.crypto?.randomUUID?.()||'exercise-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const nameKey=value=>String(value||'').trim().toLowerCase();
export function normalizeTemplates(templates={}){
 return Object.fromEntries(Object.entries(templates).map(([type,list])=>[type,(Array.isArray(list)?list:[]).map((row,i)=>{
  const tuple=[...row];tuple[4]=tuple[4]||'accessory';tuple[5]=tuple[5]||'template:'+encodeURIComponent(type)+':'+i+':'+encodeURIComponent(row[0]);return tuple;
 })]));
}
export function sessionTemplateName(db,session){
 const linked=session.workoutId&&Object.entries(db.workoutMeta||{}).find(([,m])=>m.id===session.workoutId)?.[0];
 if(linked)return linked;
 if(!session.workoutId&&Object.hasOwn(db.templates||{},session.type))return session.type;
 throw Error('This workout is no longer linked to a saved template. Edit this session only.');
}
export function replaceWorkoutRows(db,type,rows){
 const old=db.workoutMeta?.[type]||{id:'workout:'+encodeURIComponent(type),name:type,description:'',createdAt:null,archived:false,revisions:[]};
 const at=new Date().toISOString(),revision={at,name:type,description:old.description||'',exercises:structuredClone(db.templates[type]||[])};
 return {...db,templates:{...db.templates,[type]:structuredClone(rows)},workoutMeta:{...db.workoutMeta,[type]:{...old,updatedAt:at,revisions:[...(old.revisions||[]),revision].slice(-10)}}};
}
function targetTemplate(list,exercise){
 const matches=exercise.templateId?list.map((row,i)=>row[5]===exercise.templateId?i:-1).filter(i=>i>=0):list.map((row,i)=>nameKey(row[0])===nameKey(exercise.name)?i:-1).filter(i=>i>=0);
 if(matches.length!==1)throw Error('This exercise is not uniquely linked to a current template. Edit this session only, or add it explicitly to future workouts.');
 return matches[0];
}
export function editSessionExercise(db,sessionId,exerciseId,changes,updateFuture=false){
 const session=db.sessions.find(s=>s.id===sessionId),exercise=session?.exercises.find(e=>e.id===exerciseId);
 if(!exercise)throw Error('Exercise no longer exists.');
 let templates=db.templates,templateId=exercise.templateId,next=db;
 if(updateFuture){
  templates=normalizeTemplates(db.templates);const type=sessionTemplateName(db,session),list=[...(templates[type]||[])];const index=targetTemplate(list,exercise),row=[...list[index]];
  if(changes.name&&changes.name!==row[0])row[6]={...row[6],exerciseId:undefined};row[0]=changes.name??row[0];row[2]=changes.range??row[2];row[3]=changes.target??row[3];templateId=row[5];list[index]=row;templates={...templates,[type]:list};next=replaceWorkoutRows({...db,templates:normalizeTemplates(db.templates)},type,list);
 }
 return {...next,templates,sessions:db.sessions.map(s=>s.id!==sessionId?s:{...s,exercises:s.exercises.map(e=>e.id!==exerciseId?e:{...e,...changes,...(templateId?{templateId}:{})})})};
}
export function removeSessionExercise(db,sessionId,exerciseId,updateFuture=false){
 const session=db.sessions.find(s=>s.id===sessionId),exercise=session?.exercises.find(e=>e.id===exerciseId);
 if(!exercise)throw Error('Exercise no longer exists.');
 let templates=db.templates,next=db;
 if(updateFuture){templates=normalizeTemplates(db.templates);const type=sessionTemplateName(db,session),list=templates[type]||[];const index=targetTemplate(list,exercise);templates={...templates,[type]:list.filter((_,i)=>i!==index)};next=replaceWorkoutRows({...db,templates:normalizeTemplates(db.templates)},type,templates[type]);}
 return {...next,templates,sessions:db.sessions.map(s=>s.id!==sessionId?s:{...s,exercises:s.exercises.filter(e=>e.id!==exerciseId)})};
}
export function addSessionExercise(db,sessionId,name,updateFuture=false,definition=null){
 const session=db.sessions.find(s=>s.id===sessionId);if(!session||!name.trim())return db;
 const exerciseId=id(),templateId=id();
 const exercise={id:exerciseId,name:name.trim(),range:definition?.range||'8–12',target:definition?.target||'1–2 RIR',kind:definition?.kind||'accessory',...(definition?{libraryExerciseId:definition.id}:{}),...(updateFuture?{templateId}:{}),sets:Array.from({length:definition?.sets||3},()=>({weight:'',reps:'',rpe:'',done:false,tag:''}))};
 let templates=db.templates,next=db;
 if(updateFuture){templates=normalizeTemplates(db.templates);const type=sessionTemplateName(db,session);templates={...templates,[type]:[...(templates[type]||[]),[exercise.name,definition?.sets||3,exercise.range,exercise.target,exercise.kind,templateId,{...(definition?{exerciseId:definition.id}:{})}]]};next=replaceWorkoutRows({...db,templates:normalizeTemplates(db.templates)},type,templates[type]);}
 return {...next,templates,sessions:db.sessions.map(s=>s.id!==sessionId?s:{...s,exercises:[...s.exercises,exercise]})};
}

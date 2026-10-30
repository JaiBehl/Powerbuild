import {isISODate} from './dates.js';
export const HISTORICAL_IMPORT_FORMAT='powerbuild-historical-import-v1';
const marker=(id,date)=>'[Apple Notes import: '+id+' / '+date+']';
const key=value=>String(value||'').trim().toLowerCase();
const stable=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function validateHistoricalImport(value){
 if(!value||value.format!==HISTORICAL_IMPORT_FORMAT||!Array.isArray(value.sessions)||!Array.isArray(value.weights)||typeof value.metadata?.importId!=='string'||!value.metadata.importId.trim()||value.sessions.length>5000||value.weights.length>30000)throw Error('Not a supported Powerbuild historical-import JSON file.');
 for(const s of value.sessions){
  if(!isISODate(s?.date)||!Array.isArray(s.exercises)||s.exercises.length>200)throw Error('An imported workout contains an invalid date or exercise structure.');
  for(const e of s.exercises){
   if(!String(e?.name||'').trim()||!Array.isArray(e.sets)||e.sets.length>300)throw Error('An imported exercise is invalid.');
   for(const v of e.sets)if(!v||!Number.isFinite(Number(v.weight))||Number(v.weight)<0||!Number.isFinite(Number(v.reps))||Number(v.reps)<0)throw Error('Imported set weights and reps must be nonnegative finite numbers.');
  }
 }
 for(const w of value.weights)if(!isISODate(w?.date)||!Number.isFinite(Number(w.weight))||Number(w.weight)<=0||Number(w.weight)>1000)throw Error('An imported bodyweight entry is invalid.');
 return value;
}
export function normalizeHistoricalImport(raw){
 const value=validateHistoricalImport(raw),id=value.metadata.importId.trim(),seenSessions=new Set(),seenWeights=new Set();
 const sessions=value.sessions.map(s=>{
  const sid=String(s.id??'import:'+id+':session:'+s.date);
  if(seenSessions.has(s.date))throw Error('Combine exercises into one imported session per date.');seenSessions.add(s.date);
  const seen=new Set();
  const exercises=s.exercises.map((e,i)=>{const eid=String(e.id??'import:'+id+':exercise:'+s.date+':'+key(e.name)+':'+i);if(seen.has(eid))throw Error('Imported exercise IDs must be unique within a session.');seen.add(eid);return {...e,id:eid,name:String(e.name).trim(),range:String(e.range||'Historical'),target:String(e.target||''),sets:e.sets.map(v=>({...v,weight:Number(v.weight),reps:Math.floor(Number(v.reps)),done:v.done===true}))};});
  return {...s,id:sid,type:String(s.type||'Historical workout'),notes:String(s.notes||''),exercises};
 });
 const weights=value.weights.map((w,i)=>{const wid=String(w.id??'import:'+id+':weight:'+w.date+':'+i);if(seenWeights.has(wid))throw Error('Imported weight IDs must be unique.');seenWeights.add(wid);return {...w,id:wid,weight:Number(w.weight)};});
 return {...value,metadata:{...value.metadata,importId:id},sessions,weights};
}
export function mergeHistoricalImport(db,raw,options={}){
 const incoming=normalizeHistoricalImport(raw),id=incoming.metadata.importId,correct=options.mode==='correct',remove=correct&&options.removeMissing,legacy=correct&&options.includeLegacy;
 const sessions=structuredClone(db.sessions||[]),weights=structuredClone(db.weights||[]);
 const counts={newSessions:0,addedExercises:0,addedWeights:0,skippedExistingExercises:0,skippedExistingWeights:0,updatedExercises:0,removedExercises:0,updatedWeights:0,removedWeights:0,removedSessions:0},changes=[];
 const ownedSession=s=>s.sourceImportId===id||(legacy&&String(s.notes||'').includes(marker(id,s.date)));
 const ownedExercise=(s,e)=>e.sourceImportId===id||(legacy&&String(s.notes||'').includes(marker(id,s.date)));
 for(const source of incoming.sessions){
  let current=sessions.find(s=>s.date===source.date);
  const sourceExercises=source.exercises.map(e=>({...e,sourceImportId:id}));
  if(!current){current={...source,sourceImportId:id,importedNotes:{[id]:source.notes},notes:marker(id,source.date)+'\n'+source.notes,exercises:sourceExercises};sessions.push(current);counts.newSessions++;counts.addedExercises+=sourceExercises.length;changes.push({date:source.date,action:'Add workout',detail:sourceExercises.length+' exercises'});continue;}
  for(const exercise of sourceExercises){
   const i=current.exercises.findIndex(e=>String(e.id)===exercise.id||key(e.name)===key(exercise.name));
   if(i<0){current.exercises.push(exercise);counts.addedExercises++;changes.push({date:source.date,action:'Add exercise',detail:exercise.name});}
   else if(correct&&ownedExercise(current,current.exercises[i])){
    const next={...current.exercises[i],...exercise,id:current.exercises[i].id};
    if(stable(next)!==stable(current.exercises[i])){current.exercises[i]=next;counts.updatedExercises++;changes.push({date:source.date,action:'Correct exercise',detail:exercise.name});}
   }else counts.skippedExistingExercises++;
  }
  if(remove){
   current.exercises=current.exercises.filter(e=>{const missing=ownedExercise(current,e)&&!sourceExercises.some(x=>x.id===String(e.id)||key(x.name)===key(e.name));if(missing){counts.removedExercises++;changes.push({date:source.date,action:'Remove exercise',detail:e.name});}return !missing;});
  }
  const oldSource=current.importedNotes?.[id];
  if(!String(current.notes||'').includes(marker(id,source.date)))current.notes=[current.notes,marker(id,source.date)+'\n'+source.notes].filter(Boolean).join('\n\n');
  else if(correct&&oldSource!==undefined&&oldSource!==source.notes&&source.notes&&!String(current.notes).includes(source.notes))current.notes+='\n\nUpdated import note: '+source.notes;
  current.importedNotes={...current.importedNotes,[id]:source.notes};
 }
 if(remove){
  for(let i=sessions.length-1;i>=0;i--){const s=sessions[i];if(incoming.sessions.some(x=>x.date===s.date))continue;
   const retained=s.exercises.filter(e=>!ownedExercise(s,e));counts.removedExercises+=s.exercises.length-retained.length;
   if(retained.length!==s.exercises.length){changes.push({date:s.date,action:'Remove imported exercises',detail:String(s.exercises.length-retained.length)});s.exercises=retained;}
   if(!retained.length&&ownedSession(s)){sessions.splice(i,1);counts.removedSessions++;changes.push({date:s.date,action:'Remove imported workout',detail:s.type});}
  }
 }
 for(const source of incoming.weights){
  const index=weights.findIndex(w=>String(w.id)===source.id||w.date===source.date);
  const next={...source,sourceImportId:id};
  if(index<0){weights.push(next);counts.addedWeights++;changes.push({date:source.date,action:'Add weigh-in',detail:String(source.weight)});}
  else if(correct&&(weights[index].sourceImportId===id||(legacy&&String(weights[index].id)===source.id))){
   next.id=weights[index].id;
   if(stable(weights[index])!==stable(next)){weights[index]=next;counts.updatedWeights++;changes.push({date:source.date,action:'Correct weigh-in',detail:String(source.weight)});}
  }else counts.skippedExistingWeights++;
 }
 if(remove)for(let i=weights.length-1;i>=0;i--)if(weights[i].sourceImportId===id&&!incoming.weights.some(w=>w.id===String(weights[i].id)||w.date===weights[i].date)){changes.push({date:weights[i].date,action:'Remove imported weigh-in',detail:String(weights[i].weight)});weights.splice(i,1);counts.removedWeights++;}
 sessions.sort((a,b)=>a.date.localeCompare(b.date));weights.sort((a,b)=>a.date.localeCompare(b.date));
 return {db:{...db,sessions,weights},counts,changes};
}

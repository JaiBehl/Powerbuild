import {estimateStrength,usesBodyweightResistance} from './strengthEstimation.js';
import {addCalendarDays} from './dates.js';
import {resolveExerciseName} from './exerciseCatalog.js';
import {createBodyweightResolver} from './recordBodyweight.js';
export function previousPerformance(db,name,date,resistance){
 const canonical=resolveExerciseName(name,db.exerciseAliases);
 const sessions=db.sessions.filter(s=>s.finished&&s.date<date).sort((a,b)=>b.date.localeCompare(a.date));
 for(const session of sessions){
  const sets=session.exercises.filter(e=>resolveExerciseName(e.name,db.exerciseAliases)===canonical&&(!resistance||(e.resistance==='bodyweight'?'bodyweight':'external')===resistance)).flatMap(e=>e.sets.map(s=>({...s,resistance:e.resistance||'external'}))).filter(s=>s.done&&Number.isInteger(Number(s.reps))&&Number(s.reps)>0&&Number.isFinite(Number(s.weight))&&Number(s.weight)>=0);
  if(sets.length)return {date:session.date,type:session.type,sets:sets.map(s=>({...s}))};
 }
 return null;
}

const better=(current,candidate)=>!current||candidate.value>current.value||(candidate.value===current.value&&candidate.date<current.date)?candidate:current;
function relativeRecord(record){
 const value=record.value/record.bodyweight?.value;
 return Number.isFinite(value)&&value>0?{...record,value,load:record.value}:null;
}
function records(sets,name){
 let single=null,estimated=null;const repPRs={},bodyweight={unweighted:null,added:null,repPRs:{},count:0};
 const relative={single:null,estimated:null,repPRs:{},count:0,missingBodyweight:0,supported:!usesBodyweightResistance(name)&&(!sets.some(s=>s.resistance==='bodyweight')||sets.some(s=>s.resistance!=='bodyweight'))};
 for(const set of sets){
  const loaded={value:set.weight,date:set.date,reps:set.reps,bodyweight:set.bodyweight};
  if(set.resistance==='bodyweight'){bodyweight.count++;if(set.weight===0)bodyweight.unweighted=better(bodyweight.unweighted,{...loaded,value:set.reps});else{bodyweight.added=better(bodyweight.added,loaded);bodyweight.repPRs[set.reps]=better(bodyweight.repPRs[set.reps],loaded);}continue;}
  if(set.reps===1)single=better(single,loaded);
  const prediction=estimateStrength(set.weight,set.reps,set.rpe,name);
  const predicted=prediction?.kind==='estimated'?{...prediction,date:set.date,reps:set.reps,weight:set.weight,bodyweight:set.bodyweight}:null;
  if(predicted)estimated=better(estimated,predicted);
  repPRs[set.reps]=better(repPRs[set.reps],loaded);
  if(!relative.supported)continue;
  if(!set.bodyweight){relative.missingBodyweight++;continue;}
  const relativeLoad=relativeRecord(loaded);
  if(relativeLoad){
   relative.count++;
   if(set.reps===1)relative.single=better(relative.single,relativeLoad);
   relative.repPRs[set.reps]=better(relative.repPRs[set.reps],relativeLoad);
  }
  const relativeEstimate=predicted&&relativeRecord(predicted);
  if(relativeEstimate)relative.estimated=better(relative.estimated,relativeEstimate);
 }
 return {single,estimated,repPRs,count:sets.length,relative,bodyweight};
}
export function personalRecords(db,name,asOf){
 const canonical=resolveExerciseName(name,db.exerciseAliases),sets=[],bodyweightFor=createBodyweightResolver(db.weights,asOf);
 for(const s of db.sessions)if(s.date<=asOf)for(const e of s.exercises)if(resolveExerciseName(e.name,db.exerciseAliases)===canonical)for(const v of e.sets){
  const weight=Number(v.weight),reps=Number(v.reps);if(v.done&&Number.isFinite(weight)&&(weight>0||(e.resistance==='bodyweight'&&weight===0&&v.weight!==''&&v.weight!==null&&v.weight!==undefined))&&Number.isInteger(reps)&&reps>0)sets.push({date:s.date,resistance:e.resistance||'external',weight,reps,rpe:v.rpe,bodyweight:bodyweightFor(s.date)});
 }
 const cutoff=addCalendarDays(asOf,-89);
 return {name:canonical,all:records(sets,canonical),recent:records(sets.filter(s=>s.date>=cutoff),canonical),cutoff};
}

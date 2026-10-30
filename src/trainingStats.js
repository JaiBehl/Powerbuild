import {estimateStrength} from './strengthEstimation.js';
import {addCalendarDays} from './dates.js';
import {resolveExerciseName} from './exerciseCatalog.js';
import {createBodyweightResolver} from './recordBodyweight.js';
export function previousPerformance(db,name,date){
 const canonical=resolveExerciseName(name,db.exerciseAliases);
 const sessions=db.sessions.filter(s=>s.finished&&s.date<date).sort((a,b)=>b.date.localeCompare(a.date));
 for(const session of sessions){
  const sets=session.exercises.filter(e=>resolveExerciseName(e.name,db.exerciseAliases)===canonical).flatMap(e=>e.sets).filter(s=>s.done&&Number.isInteger(Number(s.reps))&&Number(s.reps)>0&&Number.isFinite(Number(s.weight))&&Number(s.weight)>=0);
  if(sets.length)return {date:session.date,type:session.type,sets:sets.map(s=>({...s}))};
 }
 return null;
}

const better=(current,candidate)=>!current||candidate.value>current.value||(candidate.value===current.value&&candidate.date<current.date)?candidate:current;
function records(sets,name){
 let single=null,estimated=null;const repPRs={};
 for(const set of sets){
  if(set.reps===1)single=better(single,{value:set.weight,date:set.date,bodyweight:set.bodyweight});
  const prediction=estimateStrength(set.weight,set.reps,set.rpe,name);
  if(prediction?.kind==='estimated')estimated=better(estimated,{...prediction,date:set.date,reps:set.reps,weight:set.weight,bodyweight:set.bodyweight});
  repPRs[set.reps]=better(repPRs[set.reps],{value:set.weight,date:set.date,bodyweight:set.bodyweight});
 }
 return {single,estimated,repPRs,count:sets.length};
}
export function personalRecords(db,name,asOf){
 const canonical=resolveExerciseName(name,db.exerciseAliases),sets=[],bodyweightFor=createBodyweightResolver(db.weights,asOf);
 for(const s of db.sessions)if(s.date<=asOf)for(const e of s.exercises)if(resolveExerciseName(e.name,db.exerciseAliases)===canonical)for(const v of e.sets){
  const weight=Number(v.weight),reps=Number(v.reps);if(v.done&&Number.isFinite(weight)&&weight>0&&Number.isInteger(reps)&&reps>0)sets.push({date:s.date,weight,reps,rpe:v.rpe,bodyweight:bodyweightFor(s.date)});
 }
 const cutoff=addCalendarDays(asOf,-89);
 return {name:canonical,all:records(sets,canonical),recent:records(sets.filter(s=>s.date>=cutoff),canonical),cutoff};
}

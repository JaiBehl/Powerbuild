import {resolveExerciseName} from './exerciseCatalog.js';
export function previousPerformance(db,name,date){
 const canonical=resolveExerciseName(name,db.exerciseAliases);
 const sessions=db.sessions.filter(s=>s.finished&&s.date<date).sort((a,b)=>b.date.localeCompare(a.date));
 for(const session of sessions){
  const sets=session.exercises.filter(e=>resolveExerciseName(e.name,db.exerciseAliases)===canonical).flatMap(e=>e.sets).filter(s=>s.done&&Number.isInteger(Number(s.reps))&&Number(s.reps)>0&&Number.isFinite(Number(s.weight))&&Number(s.weight)>=0);
  if(sets.length)return {date:session.date,type:session.type,sets:sets.map(s=>({...s}))};
 }
 return null;
}

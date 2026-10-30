import {e1rm} from './strengthEstimation.js';
export const exerciseNameKey=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
const standard={
 'barbell bench press':'Touch-and-go bench press','touch-and-go bench press':'Touch-and-go bench press',
 'bench press':'Touch-and-go bench press','bench':'Touch-and-go bench press',
 'barbell back squat':'Barbell back squat','back squat':'Barbell back squat',
 'supported seated barbell ohp':'Supported seated barbell OHP','seated barbell ohp':'Supported seated barbell OHP',
};
function follow(name,aliases,strict=false){
 const original=String(name||'').trim();let current=original;const seen=new Set();
 for(let i=0;i<32;i++){
  const key=exerciseNameKey(current);
  if(seen.has(key)){if(strict)throw Error('Exercise links cannot form a cycle.');return original;}seen.add(key);
  const next=Object.hasOwn(aliases,key)?aliases[key]:standard[key];
  if(typeof next!=='string'||!next.trim())return current;
  if(exerciseNameKey(next)===key)return next.trim();
  current=next.trim();
 }
 if(strict)throw Error('Exercise link chain is too long.');return original;
}
export const resolveExerciseName=(name,aliases={})=>follow(name,aliases);
export function setExerciseAlias(aliases,from,to){
 if(!String(from||'').trim()||!String(to||'').trim())throw Error('Enter both exercise names.');
 const next={...aliases,[exerciseNameKey(from)]:String(to).trim()};follow(from,next,true);return next;
}
export function exerciseChoices(names,aliases={}){return [...new Set(names.map(name=>resolveExerciseName(name,aliases)))].sort((a,b)=>a.localeCompare(b));}
export function buildStrengthHistory(sessions,aliases={}){
 const history={};
 for(const session of sessions)for(const exercise of session.exercises)for(const set of exercise.sets){
  if(!set.done)continue;const name=resolveExerciseName(exercise.name,aliases);
  const estimated=e1rm(set.weight,set.reps,set.rpe,name);
  const achieved=Number(set.reps)===1&&Number.isFinite(Number(set.weight))&&Number(set.weight)>0?Number(set.weight):null;
  const value=estimated??achieved;if(value===null)continue;
  history[name]??={};history[name][session.date]=Math.max(history[name][session.date]||0,value);
 }
 return history;
}

export function exerciseNames(db){
 return exerciseChoices(['Barbell bench press','Barbell back squat','Supported seated barbell OHP',...Object.values(db.templates||{}).flat().map(e=>e[0]),...(db.sessions||[]).flatMap(s=>s.exercises.map(e=>e.name)),...(db.strengthGoals||[]).map(g=>g.exercise)],db.exerciseAliases);
}
export function selectedExerciseName(selected,db){
 const names=exerciseNames(db),resolved=resolveExerciseName(selected,db.exerciseAliases);
 return names.includes(resolved)?resolved:names.includes('Touch-and-go bench press')?'Touch-and-go bench press':names[0];
}

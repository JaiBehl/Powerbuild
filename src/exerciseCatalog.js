import {e1rm} from './data.js';
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
  if(!set.done)continue;const value=e1rm(set.weight,set.reps);if(value===null)continue;
  const name=resolveExerciseName(exercise.name,aliases);history[name]??={};history[name][session.date]=Math.max(history[name][session.date]||0,value);
 }
 return history;
}

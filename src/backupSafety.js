import {isISODate} from './dates.js';
const array=(value,label)=>{if(!Array.isArray(value))throw Error(label+' must be an array.');};
const number=(value,label)=>{if(value!==''&&value!==undefined&&value!==null&&((typeof value!=='string'&&typeof value!=='number')||!Number.isFinite(Number(value))||Number(value)<0))throw Error(label+' must be a nonnegative number.');};
export function validateProfileDb(value){
 if(!value||typeof value!=='object'||!value.settings||typeof value.settings!=='object'||Array.isArray(value.settings))throw Error('Not a valid Powerbuild profile backup.');
 array(value.sessions,'Workouts');array(value.weights,'Weigh-ins');
 if(value.settings.schedule!==undefined&&(!Array.isArray(value.settings.schedule)||value.settings.schedule.some(n=>!Number.isInteger(n)||n<1||n>7)))throw Error('Training weekdays are invalid.');
 for(const s of value.sessions){if(!s||!isISODate(s.date))throw Error('A workout date is invalid.');array(s.exercises,'Workout exercises');for(const e of s.exercises){if(!e||typeof e.name!=='string')throw Error('Exercise names are invalid.');array(e.sets,'Exercise sets');for(const v of e.sets){if(!v||typeof v!=='object')throw Error('A set is invalid.');number(v.weight,'Set weight');number(v.reps,'Set reps');number(v.rpe,'Set RPE');}}}
 for(const w of value.weights)if(!w||!isISODate(w.date)||!Number.isFinite(Number(w.weight))||Number(w.weight)<=0)throw Error('A weigh-in is invalid.');
 for(const key of ['calories','savedFoods','strengthGoals'])if(value[key]!==undefined)array(value[key],key);
 for(const day of value.calories||[]){if(!day||!isISODate(day.date))throw Error('A nutrition date is invalid.');for(const key of ['items','cardio'])if(day[key]!==undefined){array(day[key],key);for(const item of day[key]){if(!item||typeof item!=='object')throw Error('A food/cardio record is invalid.');for(const nutrient of ['calories','protein','carbs','fat','durationMinutes'])number(item[nutrient],nutrient);}}}
 if(value.templates!==undefined){if(!value.templates||typeof value.templates!=='object'||Array.isArray(value.templates))throw Error('Workout templates are invalid.');for(const list of Object.values(value.templates)){array(list,'Template exercises');for(const e of list)if(!Array.isArray(e)||typeof e[0]!=='string'||!Number.isInteger(Number(e[1]))||Number(e[1])<0||Number(e[1])>100)throw Error('A template prescription is invalid.');}}
 if(value.settings.workoutCycle!==undefined){array(value.settings.workoutCycle,'Workout rotation');if(value.settings.workoutCycle.length>100||value.settings.workoutCycle.some(name=>typeof name!=='string'||!Object.hasOwn(value.templates||{},name)))throw Error('Workout rotation references an unknown workout.');}
 if(value.workoutMeta!==undefined){
  if(!value.workoutMeta||typeof value.workoutMeta!=='object'||Array.isArray(value.workoutMeta))throw Error('Workout library metadata is invalid.');
  const ids=new Set();for(const [name,m] of Object.entries(value.workoutMeta)){
   if(!Object.hasOwn(value.templates||{},name)||!m||m.name!==name||typeof m.id!=='string'||!m.id||ids.has(m.id)||typeof m.description!=='string'||typeof m.archived!=='boolean')throw Error('A workout library entry is invalid.');ids.add(m.id);
   for(const key of ['createdAt','updatedAt'])if(m[key]!=null&&(typeof m[key]!=='string'||!Number.isFinite(Date.parse(m[key]))))throw Error('A workout library date is invalid.');
   array(m.revisions,'Workout revisions');if(m.revisions.length>10)throw Error('Too many workout revisions.');for(const r of m.revisions){if(!r||typeof r.name!=='string'||typeof r.description!=='string'||!Number.isFinite(Date.parse(r.at)))throw Error('A workout revision is invalid.');array(r.exercises,'Revision exercises');for(const row of r.exercises)if(!Array.isArray(row)||typeof row[0]!=='string'||!Number.isInteger(Number(row[1]))||Number(row[1])<0||Number(row[1])>100)throw Error('A revision exercise is invalid.');}
  }
 }
 if(value.exerciseLibrary!==undefined){array(value.exerciseLibrary,'Exercise library');if(value.exerciseLibrary.length>10000)throw Error('Exercise library is too large.');const ids=new Set(),names=new Set();for(const e of value.exerciseLibrary){if(!e||typeof e.id!=='string'||!e.id||ids.has(e.id)||typeof e.name!=='string'||!e.name.trim()||names.has(e.name.trim().toLowerCase())||!Number.isInteger(Number(e.sets))||Number(e.sets)<1||Number(e.sets)>100||typeof e.range!=='string'||typeof e.target!=='string'||typeof e.archived!=='boolean')throw Error('An exercise library entry is invalid.');ids.add(e.id);names.add(e.name.trim().toLowerCase());array(e.revisions,'Exercise revisions');if(e.revisions.length>10)throw Error('Too many exercise revisions.');for(const r of e.revisions)if(!r||!Number.isFinite(Date.parse(r.at))||!r.data||typeof r.data.name!=='string'||!Number.isInteger(Number(r.data.sets)))throw Error('An exercise revision is invalid.');}}
 for(const goal of value.strengthGoals||[]){if(!goal||typeof goal.exercise!=='string')throw Error('A strength goal exercise is invalid.');number(goal.targetWeight,'Goal weight');}
 for(const food of value.savedFoods||[]){if(!food||typeof food!=='object')throw Error('A saved food is invalid.');for(const field of ['calories','protein','carbs','fat'])number(food[field],field);}
 const checkSettings=settings=>{
  if(settings!==undefined&&(!settings||typeof settings!=='object'||Array.isArray(settings)))throw Error('Calorie settings are invalid.');
  if(!settings)return;
  for(const key of ['customBaseline','heightIn','bodyWeight','age','milesWalked','milesRun','liftHours','proteinPerLb','fatPerLb','customCalorieTarget','customProtein','customCarbs','customFat','baselineFactor','customMaintenance','walkMinutesPerMile','liftMet'])number(settings[key],key);
  if(settings.lifted!==undefined&&typeof settings.lifted!=='boolean')throw Error('Lifted setting must be true or false.');
 };
 checkSettings(value.calorieSettings);
 for(const day of value.calories||[]){if(day.plan!==undefined&&(!day.plan||typeof day.plan!=='object'||Array.isArray(day.plan)))throw Error('A daily plan is invalid.');checkSettings(day.plan?.calorieSettings);}
 return value;
}
const counts=db=>({
 sessions:(db.sessions||[]).length,exercises:(db.sessions||[]).reduce((n,s)=>n+(s.exercises||[]).length,0),sets:(db.sessions||[]).reduce((n,s)=>n+(s.exercises||[]).reduce((m,e)=>m+(e.sets||[]).length,0),0),weights:(db.weights||[]).length,foods:(db.calories||[]).reduce((n,d)=>n+(d.items||[]).length,0),cardio:(db.calories||[]).reduce((n,d)=>n+(d.cardio||[]).length,0),savedFoods:(db.savedFoods||[]).length,goals:(db.strengthGoals||[]).length,libraryExercises:(db.exerciseLibrary||[]).length,workoutTemplates:Object.keys(db.templates||{}).length,templateExercises:Object.values(db.templates||{}).reduce((n,list)=>n+(Array.isArray(list)?list.length:0),0),
});
export function removesData(before,after){const a=counts(before),b=counts(after);return Object.keys(a).some(key=>b[key]<a[key]);}

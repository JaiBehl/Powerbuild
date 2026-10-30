import {isISODate} from './dates.js';
const array=(value,label)=>{if(!Array.isArray(value))throw Error(label+' must be an array.');};
const number=(value,label)=>{if(value!==''&&value!==undefined&&value!==null&&(!Number.isFinite(Number(value))||Number(value)<0))throw Error(label+' must be a nonnegative number.');};
export function validateProfileDb(value){
 if(!value||typeof value!=='object'||!value.settings||Array.isArray(value.settings))throw Error('Not a valid Powerbuild profile backup.');
 array(value.sessions,'Workouts');array(value.weights,'Weigh-ins');
 if(value.settings.schedule!==undefined&&(!Array.isArray(value.settings.schedule)||value.settings.schedule.some(n=>!Number.isInteger(n)||n<1||n>7)))throw Error('Training weekdays are invalid.');
 for(const s of value.sessions){if(!s||!isISODate(s.date))throw Error('A workout date is invalid.');array(s.exercises,'Workout exercises');for(const e of s.exercises){if(!e||typeof e.name!=='string')throw Error('Exercise names are invalid.');array(e.sets,'Exercise sets');for(const v of e.sets){if(!v||typeof v!=='object')throw Error('A set is invalid.');number(v.weight,'Set weight');number(v.reps,'Set reps');number(v.rpe,'Set RPE');}}}
 for(const w of value.weights)if(!w||!isISODate(w.date)||!Number.isFinite(Number(w.weight))||Number(w.weight)<=0)throw Error('A weigh-in is invalid.');
 for(const key of ['calories','savedFoods','strengthGoals'])if(value[key]!==undefined)array(value[key],key);
 for(const day of value.calories||[]){if(!day||!isISODate(day.date))throw Error('A nutrition date is invalid.');for(const key of ['items','cardio'])if(day[key]!==undefined){array(day[key],key);for(const item of day[key]){if(!item||typeof item!=='object')throw Error('A food/cardio record is invalid.');for(const nutrient of ['calories','protein','carbs','fat','durationMinutes'])number(item[nutrient],nutrient);}}}
 if(value.templates!==undefined){if(!value.templates||typeof value.templates!=='object'||Array.isArray(value.templates))throw Error('Workout templates are invalid.');for(const list of Object.values(value.templates)){array(list,'Template exercises');for(const e of list)if(!Array.isArray(e)||typeof e[0]!=='string'||!Number.isInteger(Number(e[1]))||Number(e[1])<0||Number(e[1])>100)throw Error('A template prescription is invalid.');}}
 return value;
}
const counts=db=>({
 sessions:(db.sessions||[]).length,exercises:(db.sessions||[]).reduce((n,s)=>n+(s.exercises||[]).length,0),sets:(db.sessions||[]).reduce((n,s)=>n+(s.exercises||[]).reduce((m,e)=>m+(e.sets||[]).length,0),0),weights:(db.weights||[]).length,foods:(db.calories||[]).reduce((n,d)=>n+(d.items||[]).length,0),cardio:(db.calories||[]).reduce((n,d)=>n+(d.cardio||[]).length,0),savedFoods:(db.savedFoods||[]).length,goals:(db.strengthGoals||[]).length,
});
export function removesData(before,after){const a=counts(before),b=counts(after);return Object.keys(a).some(key=>b[key]<a[key]);}

import {addCalendarDays,isISODate} from './dates.js';
import {sumFoods} from './foodLibrary.js';
const finite=value=>Number.isFinite(Number(value))?Number(value):0;
export function rollingWeightAverage(weights,asOf,days=7){
 if(!isISODate(asOf))return {average:null,days:0};
 const since=addCalendarDays(asOf,1-days),daily=new Map();
 for(const entry of weights)if(isISODate(entry.date)&&entry.date>=since&&entry.date<=asOf&&Number.isFinite(Number(entry.weight))&&Number(entry.weight)>0){const values=daily.get(entry.date)||[];values.push(Number(entry.weight));daily.set(entry.date,values);}
 const values=[...daily.values()].map(list=>list.reduce((a,b)=>a+b,0)/list.length);
 return {average:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,days:values.length};
}
export function weeklySummary(db,asOf){
 if(!isISODate(asOf))return null;
 const since=addCalendarDays(asOf,-6),inside=date=>date>=since&&date<=asOf;
 const sessions=db.sessions.filter(s=>s.finished&&inside(s.date)),sets=sessions.flatMap(s=>s.exercises.flatMap(e=>e.sets)).filter(s=>s.done);
 const foodDays=db.calories.filter(d=>inside(d.date)&&Array.isArray(d.items)&&d.items.length).map(d=>sumFoods(d.items));
 const cardio=db.calories.filter(d=>inside(d.date)).flatMap(d=>d.cardio||[]);
 const weight=rollingWeightAverage(db.weights,asOf),previous=rollingWeightAverage(db.weights,addCalendarDays(asOf,-7));
 return {since,until:asOf,sessions:sessions.length,sets:sets.length,volume:sets.reduce((sum,s)=>sum+Math.max(0,finite(s.weight))*Math.max(0,finite(s.reps)),0),foodDays:foodDays.length,averageCalories:foodDays.length?foodDays.reduce((s,d)=>s+d.calories,0)/foodDays.length:null,averageProtein:foodDays.length?foodDays.reduce((s,d)=>s+d.protein,0)/foodDays.length:null,cardioMinutes:cardio.reduce((s,e)=>s+Math.max(0,finite(e.durationMinutes)),0),cardioCalories:cardio.reduce((s,e)=>s+Math.max(0,finite(e.calories)),0),weight,previous,weightChange:weight.average!==null&&previous.average!==null?weight.average-previous.average:null};
}

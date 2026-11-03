import {isISODate,addCalendarDays} from './dates.js';
export const dayNumber=date=>Date.parse(date+'T12:00:00Z')/86400000;
const median=list=>{const a=[...list].sort((a,b)=>a-b),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
export const experienceHalfLives={custom:26,returning:8,novice:13,intermediate:26,advanced:52};
// Scenario presets and phase thresholds are transparent product assumptions, not research coefficients.
export function weightPhaseAt(weights,date){
 const days=new Map();for(const w of weights||[])if(isISODate(w.date)&&w.date<=date&&w.date>=addCalendarDays(date,-35)&&Number.isFinite(Number(w.weight))&&Number(w.weight)>0){const a=days.get(w.date)||[];a.push(Number(w.weight));days.set(w.date,a);}
 const list=[...days].sort(([a],[b])=>a.localeCompare(b)).map(([date,values])=>({date,value:values.reduce((a,b)=>a+b,0)/values.length}));
 if(list.length<2)return null;const first=list[0],last=list.at(-1),span=dayNumber(last.date)-dayNumber(first.date);if(span<14||dayNumber(date)-dayNumber(last.date)>7)return null;
 const rate=(last.value/first.value-1)*7/span;return rate>0.001?'bulk':rate< -0.001?'cut':'maintenance';
}
export function fitStrengthProjection(points,{weights=[],phase='all',asOf,halfLifeWeeks=26,pacePercent=100}={}){
 const daily=new Map();for(const p of points||[])if(isISODate(p.date)&&(!asOf||p.date<=asOf)&&Number.isFinite(Number(p.value))&&Number(p.value)>0)daily.set(p.date,Math.max(daily.get(p.date)||0,Number(p.value)));
 const all=[...daily].sort(([a],[b])=>a.localeCompare(b)).map(([date,value])=>({date,value}));const anchor=all.at(-1);
 if(!anchor)return {error:'No qualifying loaded history for this exercise.'};
 if(!['all','bulk','cut','maintenance'].includes(phase)||!Number.isFinite(Number(halfLifeWeeks))||Number(halfLifeWeeks)<1||Number(halfLifeWeeks)>104||!Number.isFinite(Number(pacePercent))||Number(pacePercent)<0||Number(pacePercent)>200)return {error:'Choose a half-life from 1–104 weeks and pace from 0–200%.'};
 const cutoff=addCalendarDays(anchor.date,-90),sample=all.filter(p=>p.date>=cutoff&&(phase==='all'||weightPhaseAt(weights,p.date)===phase)).slice(-24);
 if(sample.length<4||dayNumber(sample.at(-1).date)-dayNumber(sample[0].date)<21)return {error:phase==='all'?'Log at least 4 qualifying dates spanning 21 days within the last 90 logged days.':'Not enough matching bodyweight-phase history: need 4 qualifying dates spanning 21 days, with nearby weigh-ins. Try All recent history.'};
 const slopes=[];for(let i=0;i<sample.length;i++)for(let j=i+1;j<sample.length;j++){const span=dayNumber(sample[j].date)-dayNumber(sample[i].date);if(span>=7)slopes.push((sample[j].value-sample[i].value)/span);}
 const slope=median(slopes),tau=Number(halfLifeWeeks)*7/Math.LN2,multiplier=Number(pacePercent)/100;
 const predict=date=>{if(!isISODate(date))return null;const days=dayNumber(date)-dayNumber(anchor.date);if(days<0||days>365)return null;const value=anchor.value+slope*multiplier*tau*(-Math.expm1(-days/tau));return Number.isFinite(value)&&value>0?value:null;};
 return {anchor,all,sampleCount:sample.length,spanDays:dayNumber(sample.at(-1).date)-dayNumber(sample[0].date),weeklyPace:slope*7,predict};
}
export function historicalValue(points,date){
 if(!isISODate(date))return null;const a=points.filter(p=>isISODate(p.date)&&Number.isFinite(p.value)&&p.value>0).sort((a,b)=>a.date.localeCompare(b.date));const exact=a.find(p=>p.date===date);if(exact)return {...exact,kind:'logged'};const hi=a.findIndex(p=>p.date>date);if(hi<1)return null;const low=a[hi-1],high=a[hi],fraction=(dayNumber(date)-dayNumber(low.date))/(dayNumber(high.date)-dayNumber(low.date));return {date,value:low.value+(high.value-low.value)*fraction,kind:'interpolated'};
}

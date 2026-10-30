import {isISODate} from './dates.js';

export const MAX_BODYWEIGHT_GAP_DAYS=30;
const dayNumber=date=>Date.parse(date+'T12:00:00Z')/86400000;

// Resolve once per profile/date, then cache each workout day's derived context.
// No current/default/calorie weight is substituted for historical measurements.
export function createBodyweightResolver(weights=[],asOf){
 const daily=new Map(),cache=new Map();
 for(const entry of weights){
  if(!entry||!isISODate(entry.date)||(asOf&&entry.date>asOf))continue;
  if(!['number','string'].includes(typeof entry.weight)||String(entry.weight).trim()==='')continue;
  const weight=Number(entry.weight);
  if(!Number.isFinite(weight)||weight<=0)continue;
  const values=daily.get(entry.date)||[];values.push(weight);daily.set(entry.date,values);
 }
 const points=[...daily].sort(([a],[b])=>a.localeCompare(b)).map(([date,values])=>({date,weight:values.reduce((sum,value)=>sum+value/values.length,0)}));
 return date=>{
  if(!isISODate(date)||(asOf&&date>asOf))return null;
  if(cache.has(date))return cache.get(date);
  let low=0,high=points.length;
  while(low<high){const mid=Math.floor((low+high)/2);if(points[mid].date<date)low=mid+1;else high=mid;}
  const before=points[low-1],after=points[low];let result=null;
  if(after?.date===date){
   result={value:after.weight,method:'same-day',estimated:false,sources:[after]};
  }else{
   const day=dayNumber(date),beforeDays=before?day-dayNumber(before.date):Infinity,afterDays=after?dayNumber(after.date)-day:Infinity;
   if(beforeDays<=MAX_BODYWEIGHT_GAP_DAYS&&afterDays<=MAX_BODYWEIGHT_GAP_DAYS){
    result={value:before.weight+(after.weight-before.weight)*beforeDays/(beforeDays+afterDays),method:'interpolated',estimated:true,sources:[before,after]};
   }else if(Math.min(beforeDays,afterDays)<=MAX_BODYWEIGHT_GAP_DAYS){
    const nearest=beforeDays<=afterDays?before:after;
    result={value:nearest.weight,method:'nearest',estimated:true,sources:[nearest],daysAway:Math.min(beforeDays,afterDays)};
   }
  }
  cache.set(date,result);return result;
 };
}

export const bodyweightAtDate=(weights,date,asOf=date)=>createBodyweightResolver(weights,asOf)(date);

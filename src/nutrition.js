import {isISODate} from './dates.js';
export const calorieDefaults={
  baselineMode:'estimate',
  customBaseline:2300,
  heightIn:71,
  bodyWeight:null,
  weightMode:'auto',
  sex:'male',
  age:18,
  milesWalked:4,
  milesRun:0,
  lifted:true,
  liftHours:1.5,
  proteinPerLb:1,
  fatPerLb:.3,
  calorieTargetMode:'calculated',
  customCalorieTarget:null,
  macroTargetMode:'calculated',
  customProtein:null,
  customCarbs:null,
  customFat:null,
};
export function normalizeCalorieSettings(value={}){
 return {...calorieDefaults,...value,weightMode:value.weightMode==='auto'||value.weightMode==='manual'?value.weightMode:Number(value.bodyWeight)>0?'manual':'auto'};
}
export function resolveDayPlan(db,date){
 const saved=db.calories?.find(x=>x.date===date)?.plan;
 return {calorieSettings:normalizeCalorieSettings(saved?.calorieSettings?{...db.calorieSettings,...saved.calorieSettings,weightMode:saved.calorieSettings.weightMode}:db.calorieSettings),goal:{startWeight:db.settings.startWeight,targetWeight:db.settings.targetWeight,weightDeadline:db.settings.weightDeadline,...saved?.goal}};
}
export function updateDayRecord(db,date,fn){
 const current=db.calories.find(x=>x.date===date)||{date,items:[],cardio:[]};
 const next=fn({...current,date,items:Array.isArray(current.items)?current.items:[],cardio:Array.isArray(current.cardio)?current.cardio:[],plan:structuredClone(resolveDayPlan(db,date))});
 return {...db,calories:[...db.calories.filter(x=>x.date!==date),next]};
}
export function updateDayPlan(db,date,changes){
 return updateDayRecord(db,date,day=>({...day,plan:{...day.plan,calorieSettings:{...day.plan.calorieSettings,...changes.calorieSettings},goal:{...day.plan.goal,...changes.goal}}}));
}
export function normalizeDayPlans(db){
 return {...db,calories:db.calories.map(day=>({...day,plan:structuredClone(resolveDayPlan(db,day.date))}))};
}
const kgPerLb=1/2.2046226218;
const bmr=(w,h,a,s)=>10*w*kgPerLb+6.25*h*2.54-5*a+(s==='female'?-161:5);
const referenceBmr=bmr(180,71,18,'male');
export function calculateNutrition(db,date){
 const {calorieSettings:cs,goal}=resolveDayPlan(db,date),stored=cs;
 const scaleWeight=[...db.weights].filter(w=>w.date<=date).sort((a,b)=>b.date.localeCompare(a.date))[0]?.weight||goal.startWeight||180;
 const weight=cs.weightMode==='manual'&&Number(cs.bodyWeight)>0?Number(cs.bodyWeight):Number(scaleWeight);
 const heightIn=Math.max(48,Math.min(96,Number(cs.heightIn)||71)),age=Math.max(13,Math.min(100,Number(cs.age)||18)),sex=cs.sex==='female'?'female':'male';
 const estimatedBaseline=Math.round(Math.max(1200,2300+bmr(weight,heightIn,age,sex)-referenceBmr));
 const customBaseline=Number(cs.customBaseline??cs.baseMaintenance??2300)||2300,baselineMode=cs.baselineMode==='custom'?'custom':'estimate',baseline=baselineMode==='custom'?customBaseline:estimatedBaseline;
 const heightFeet=Math.floor(heightIn/12),heightRemainder=Math.round(heightIn%12);
 const record=db.calories.find(x=>x.date===date),cardioExtra=(record?.cardio||[]).reduce((sum,x)=>sum+Math.max(0,Number(x.calories)||0),0);
 const walkExtra=cs.milesWalked*weight*.45,runExtra=cs.milesRun*weight*.72,liftExtra=cs.lifted?cs.liftHours*175:0;
 const maintenance=Math.round(baseline+walkExtra+runExtra+liftExtra+cardioExtra);
 const validDeadline=isISODate(goal.weightDeadline),daysRemaining=validDeadline?Math.round((new Date(goal.weightDeadline+'T12:00:00')-new Date(date+'T12:00:00'))/86400000):null,days=Math.max(1,daysRemaining??1);
 const goalDifference=Number(goal.targetWeight)-weight,goalRate=goalDifference*7/days,calculatedTarget=Math.round(maintenance+goalDifference*3500/days);
 const mode=Math.abs(goalDifference)<.1?'Maintain':goalDifference>0?'Bulk':'Cut';
 const calorieTargetMode=cs.calorieTargetMode==='custom'?'custom':'calculated';
 const hasOverride=cs.customCalorieTarget!==null&&cs.customCalorieTarget!==''&&Number.isFinite(Number(cs.customCalorieTarget))&&Number(cs.customCalorieTarget)>=0;
 const manualCalorieTarget=hasOverride?Number(cs.customCalorieTarget):Math.max(0,calculatedTarget),target=calorieTargetMode==='custom'?Math.round(manualCalorieTarget):calculatedTarget;
 const calculatedProtein=Math.round(weight*cs.proteinPerLb),calculatedFat=Math.round(weight*cs.fatPerLb),calculatedCarbs=Math.max(0,Math.round((target-calculatedProtein*4-calculatedFat*9)/4));
 const macroTargetMode=cs.macroTargetMode==='custom'?'custom':'calculated';
 const protein=macroTargetMode==='custom'?Math.max(0,Number(cs.customProtein??calculatedProtein)):calculatedProtein,carbs=macroTargetMode==='custom'?Math.max(0,Number(cs.customCarbs??calculatedCarbs)):calculatedCarbs,fat=macroTargetMode==='custom'?Math.max(0,Number(cs.customFat??calculatedFat)):calculatedFat;
 const macroCalories=Math.round(protein*4+carbs*4+fat*9);
 return {cs,stored,goal,weight,heightIn,age,sex,estimatedBaseline,customBaseline,baselineMode,baseline,heightFeet,heightRemainder,cardioExtra,walkExtra,runExtra,liftExtra,maintenance,days,daysRemaining,validDeadline,goalDifference,goalRate,calculatedTarget,mode,calorieTargetMode,manualCalorieTarget,target,calculatedProtein,calculatedFat,calculatedCarbs,macroTargetMode,protein,carbs,fat,macroCalories};
}

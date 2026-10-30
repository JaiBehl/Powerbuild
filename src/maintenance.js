// Equations and population limits: see README.md, Calculation contract.
const kgPerLb=1/2.2046226218;
const numeric=value=>(typeof value==='number'||(typeof value==='string'&&value.trim()!==''))?Number(value):NaN;
const bounded=(value,fallback,min,max)=>Number.isFinite(numeric(value))?Math.max(min,Math.min(max,numeric(value))):fallback;
const positive=(value,fallback)=>Number.isFinite(numeric(value))&&numeric(value)>0?numeric(value):fallback;
export function restingMetabolism(weightLb,heightIn,age,sex,equation='tenHaaf'){
  const kg=positive(weightLb,180)*kgPerLb,height=bounded(heightIn,71,48,96),years=bounded(age,18,13,100),male=sex==='female'?0:1;
  // ten Haaf & Weijs 2014, original kJ/day coefficients, converted once.
  // Do not extrapolate the recreational-athlete equation beyond 18–35.
  const method=equation==='tenHaaf'&&years>=18&&years<=35?'tenHaaf':'mifflin';
  const rmr=method==='tenHaaf'?(49.940*kg+2459.053*height*.0254-34.014*years+799.257*male+122.502)/4.184:10*kg+6.25*height*2.54-5*years+(male?5:-161);
  return {rmr,method,adult:years>=18};
}
export function maintenanceEstimate(settings,weightLb,cardioCalories=0){
  const kg=positive(weightLb,180)*kgPerLb;
  const heightIn=bounded(settings.heightIn,71,48,96),age=bounded(settings.age,18,13,100);
  const {rmr,method,adult}=restingMetabolism(weightLb,heightIn,age,settings.sex,settings.rmrEquation);
  // This factor is an explicit practical assumption for unlogged daily
  // living/digestion, not a fitted or measured personal activity level.
  const baselineFactor=bounded(settings.baselineFactor,1.2,1.1,1.5);
  const estimatedBaseline=Math.round(rmr*baselineFactor);
  const customBaseline=positive(settings.customBaseline??settings.baseMaintenance,2300);
  const baselineMode=settings.baselineMode==='custom'?'custom':'estimate';
  const baseline=baselineMode==='custom'?customBaseline:estimatedBaseline;
  const walkPace=bounded(settings.walkMinutesPerMile,22.5,15,40),walkMiles=bounded(settings.milesWalked,0,0,15);
  const runMiles=bounded(settings.milesRun,0,0,10),liftHours=bounded(settings.liftHours,1.5,0,3);
  const liftMet=[3.5,5,6].includes(numeric(settings.liftMet))?numeric(settings.liftMet):3.5;
  // Ludlow & Weyand 2016: net VO2 = 3.85 + 5.97 * speed(m/s)^2 / height(m).
  // A 5 kcal/L oxygen equivalent is an approximation. Level steady walking.
  const speed=1609.344/(walkPace*60),netWalkVo2=3.85+5.97*speed*speed/(heightIn*.0254);
  const walkExtra=netWalkVo2*kg*.005*walkMiles*walkPace;
  // ACSM level-running horizontal component, net of resting oxygen cost.
  const runExtra=runMiles*1609.344*kg*.001;
  // 2024 Compendium 02054/02052/02050; subtract 1 MET already in baseline.
  const liftExtra=settings.lifted===true?(liftMet-1)*3.5*kg/200*liftHours*60:0;
  const cardioExtra=bounded(cardioCalories,0,0,100000);
  const estimatedMaintenance=Math.round(baseline+walkExtra+runExtra+liftExtra+cardioExtra);
  const hasCustom=Number.isFinite(numeric(settings.customMaintenance))&&numeric(settings.customMaintenance)>0;
  const maintenanceMode=settings.maintenanceMode==='custom'?'custom':'estimate';
  const customMaintenance=Number.isFinite(numeric(settings.customMaintenance))?numeric(settings.customMaintenance):estimatedMaintenance;
  const maintenance=maintenanceMode==='custom'&&hasCustom?Math.round(customMaintenance):estimatedMaintenance;
  return {rmr,rmrMethod:method,adult,baselineFactor,estimatedBaseline,customBaseline,baselineMode,baseline,walkPace,liftMet,walkExtra,runExtra,liftExtra,cardioExtra,estimatedMaintenance,customMaintenance,maintenanceMode,maintenanceOverrideValid:hasCustom,maintenance};
}

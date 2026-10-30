import React from 'react';
import CardioLog from './CardioLog';
import FoodLog from './FoodLog';
import {displayMacroRate,fromDisplayWeight,storeMacroRate,toDisplayRate,toDisplayWeight,unitName} from './units';

export const calorieDefaults={
  baselineMode:'estimate',
  customBaseline:2300,
  heightIn:71,
  bodyWeight:null,
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

const LB_PER_KG=2.2046226218;
const CM_PER_IN=2.54;
const REFERENCE={heightIn:71,weightLb:180,sex:'male',age:18,baseline:2300};

function mifflinStJeor(weightLb,heightIn,age,sex){
  const kg=weightLb/LB_PER_KG;
  const cm=heightIn*CM_PER_IN;
  const sexAdjustment=sex==='female'?-161:5;
  return 10*kg+6.25*cm-5*age+sexAdjustment;
}

const REFERENCE_BMR=mifflinStJeor(REFERENCE.weightLb,REFERENCE.heightIn,REFERENCE.age,REFERENCE.sex);

export default function CalorieTracker({db,patch,date,setDate,entry,setEntry}){
  const stored=db.calorieSettings||{};
  const cs={...calorieDefaults,...stored};
  const units=unitName(db.settings.units);
  const update=(key,val)=>patch(p=>({...p,calorieSettings:{...p.calorieSettings,[key]:val}}));
  const scaleWeight=[...db.weights].filter(w=>w.date<=date).sort((a,b)=>b.date.localeCompare(a.date))[0]?.weight||db.settings.startWeight||180;
  const weight=Number(cs.bodyWeight)>0?Number(cs.bodyWeight):Number(scaleWeight);
  const heightIn=Math.max(48,Math.min(96,Number(cs.heightIn)||REFERENCE.heightIn));
  const age=Math.max(13,Math.min(100,Number(cs.age)||REFERENCE.age));
  const sex=cs.sex==='female'?'female':'male';
  const estimatedBaseline=Math.round(Math.max(1200,REFERENCE.baseline+(mifflinStJeor(weight,heightIn,age,sex)-REFERENCE_BMR)));
  const customBaseline=Number(stored.customBaseline??stored.baseMaintenance??calorieDefaults.customBaseline)||calorieDefaults.customBaseline;
  const baselineMode=cs.baselineMode==='custom'?'custom':'estimate';
  const baseline=baselineMode==='custom'?customBaseline:estimatedBaseline;
  const heightFeet=Math.floor(heightIn/12),heightRemainder=Math.round(heightIn%12);

  const record=db.calories.find(x=>x.date===date);
  const logged=Array.isArray(record?.items)?record.items:[];
  const cardioEntries=Array.isArray(record?.cardio)?record.cardio:[];
  const cardioExtra=cardioEntries.reduce((sum,item)=>sum+Math.max(0,Number(item.calories)||0),0);
  const updateDayRecord=(fn)=>patch(p=>{
    const current=p.calories.find(x=>x.date===date)||{date,items:[],cardio:[]};
    const next=fn({...current,date,items:Array.isArray(current.items)?current.items:[],cardio:Array.isArray(current.cardio)?current.cardio:[]});
    return {...p,calories:[...p.calories.filter(x=>x.date!==date),next]};
  });

  const walkExtra=cs.milesWalked*weight*.45;
  const runExtra=cs.milesRun*weight*.72;
  const liftExtra=cs.lifted?cs.liftHours*175:0;
  const maintenance=Math.round(baseline+walkExtra+runExtra+liftExtra+cardioExtra);
  const today=new Date(date+'T12:00:00'),deadline=new Date(db.settings.weightDeadline+'T12:00:00');
  const days=Math.max(1,Math.round((deadline-today)/86400000));
  const goalDifference=Number(db.settings.targetWeight)-weight;
  const goalRate=goalDifference*7/days;
  const daysRemaining=Math.round((deadline-today)/86400000);
  const rawAdjustment=goalDifference*3500/days;
  // The calculated daily goal reflects the requested weight and deadline
  // without imposing arbitrary app surplus/deficit caps.
  const calculatedTarget=Math.round(maintenance+rawAdjustment);
  const mode=Math.abs(goalDifference)<.1?'Maintain':goalDifference>0?'Bulk':'Cut';
  const calorieTargetMode=cs.calorieTargetMode==='custom'?'custom':'calculated';
  const manualCalorieTarget=Number(cs.customCalorieTarget)>0?Number(cs.customCalorieTarget):Math.max(0,calculatedTarget);
  const target=calorieTargetMode==='custom'?Math.round(manualCalorieTarget):calculatedTarget;
  const calculatedProtein=Math.round(weight*cs.proteinPerLb);
  const calculatedFat=Math.round(weight*cs.fatPerLb);
  const calculatedCarbs=Math.max(0,Math.round((target-calculatedProtein*4-calculatedFat*9)/4));
  const macroTargetMode=cs.macroTargetMode==='custom'?'custom':'calculated';
  const protein=macroTargetMode==='custom'?Math.max(0,Number(cs.customProtein??calculatedProtein)):calculatedProtein;
  const carbs=macroTargetMode==='custom'?Math.max(0,Number(cs.customCarbs??calculatedCarbs)):calculatedCarbs;
  const fat=macroTargetMode==='custom'?Math.max(0,Number(cs.customFat??calculatedFat)):calculatedFat;
  const macroCalories=Math.round(protein*4+carbs*4+fat*9);
  const setCalorieTargetMode=(nextMode)=>patch(p=>({
    ...p,calorieSettings:{
      ...p.calorieSettings,
      calorieTargetMode:nextMode,
      customCalorieTarget:nextMode==='custom'&&!(Number(cs.customCalorieTarget)>0)?Math.max(0,calculatedTarget):cs.customCalorieTarget,
    },
  }));
  const setMacroTargetMode=(nextMode)=>patch(p=>({
    ...p,calorieSettings:{
      ...p.calorieSettings,
      macroTargetMode:nextMode,
      customProtein:cs.customProtein??calculatedProtein,
      customCarbs:cs.customCarbs??calculatedCarbs,
      customFat:cs.customFat??calculatedFat,
    },
  }));
  const updateCardio=entries=>updateDayRecord(day=>({...day,cardio:entries}));

  const displayedGoal=toDisplayWeight(db.settings.targetWeight,units,1);
  const displayedWeight=toDisplayWeight(weight,units,1);
  const referenceWeight=toDisplayWeight(REFERENCE.weightLb,units,1);
  const rateUnit=units==='kg'?'kg/week':'lb/week';
  const proteinRate=displayMacroRate(cs.proteinPerLb,units,2);
  const fatRate=displayMacroRate(cs.fatPerLb,units,2);

  return <>
    <section className="panel">
      <h2>Activity-based calorie target</h2>
      <p className="muted">Choose a higher weight to bulk, a lower weight to cut, or the same weight to maintain. Change the date whenever you like.</p>
      <div className="formgrid">
        <label>Goal weight ({units})<input type="number" min="20" max="700" step={units==='kg'?'0.1':'0.5'} value={displayedGoal} onChange={e=>patch(p=>({...p,settings:{...p.settings,targetWeight:fromDisplayWeight(e.target.value,units)}}))}/></label>
        <label>Goal deadline<input type="date" value={db.settings.weightDeadline} onChange={e=>patch(p=>({...p,settings:{...p.settings,weightDeadline:e.target.value}}))}/></label>
      </div>
      <p className="muted">Current mode: <strong>{mode}</strong> · Target: {displayedGoal} {units} by {db.settings.weightDeadline}</p>

      <div className="panel baseline-panel">
        <div className="between baseline-head">
          <div className="baseline-copy">
            <h3>Baseline maintenance</h3>
            <p className="muted">The app estimate is calibrated so 5'11&quot;, {referenceWeight} {units}, male, age 18 equals exactly 2,300 kcal/day before the activities below are added.</p>
          </div>
          <strong>{baseline.toLocaleString()} kcal</strong>
        </div>
        <div className="formgrid">
          <label>Baseline source<select value={baselineMode} onChange={e=>update('baselineMode',e.target.value)}><option value="estimate">Use app estimate</option><option value="custom">Use my own baseline</option></select></label>
          {baselineMode==='custom'&&<label>Custom baseline (kcal)<input type="number" min="800" max="7000" step="10" value={customBaseline} onChange={e=>update('customBaseline',Number(e.target.value))}/></label>}
          <label>Weight ({units})<input type="number" min="20" max="700" step="0.1" value={displayedWeight} onChange={e=>update('bodyWeight',fromDisplayWeight(e.target.value,units))}/></label>
          <label>Sex<select value={sex} onChange={e=>update('sex',e.target.value)}><option value="male">Male</option><option value="female">Female</option></select></label>
          <label>Age<input type="number" min="13" max="100" step="1" value={age} onChange={e=>update('age',Number(e.target.value))}/></label>
          <label>Height (feet)<input type="number" min="4" max="8" step="1" value={heightFeet} onChange={e=>update('heightIn',Number(e.target.value)*12+heightRemainder)}/></label>
          <label>Height (inches)<input type="number" min="0" max="11" step="1" value={heightRemainder} onChange={e=>update('heightIn',heightFeet*12+Number(e.target.value))}/></label>
        </div>
        {baselineMode==='estimate'&&<p className="muted note">Estimated baseline: <strong>{estimatedBaseline.toLocaleString()} kcal/day</strong>. Height, weight, age, and sex adjust the 2,300-kcal reference using the Mifflin–St Jeor metabolic relationship. Treat it as a starting estimate and calibrate against 2–3 weeks of scale trends.</p>}
        {baselineMode==='custom'&&<p className="muted note">Custom mode uses your entered baseline directly. Keep walking, running, lifting, and custom cardio out of that number because those activities are added separately below.</p>}
      </div>

      <p className="muted">Activities below are added on top of the selected baseline, so the baseline should represent a day before these explicitly tracked activities.</p>
      <div className="formgrid">
        <label>Miles walked<input type="range" min="0" max="15" step=".25" value={cs.milesWalked} onChange={e=>update('milesWalked',Number(e.target.value))}/><strong>{cs.milesWalked} miles</strong></label>
        <label>Miles run (5:00/mile)<input type="range" min="0" max="10" step=".25" value={cs.milesRun} onChange={e=>update('milesRun',Number(e.target.value))}/><strong>{cs.milesRun} miles</strong></label>
        <label>Lifted today?<select value={cs.lifted?'yes':'no'} onChange={e=>update('lifted',e.target.value==='yes')}><option value="yes">Yes</option><option value="no">No</option></select></label>
        <label>Lifting duration (hours)<input type="range" min="1" max="3" step=".25" disabled={!cs.lifted} value={cs.liftHours} onChange={e=>update('liftHours',Number(e.target.value))}/><strong>{cs.liftHours} hours</strong></label>
      </div>

      <CardioLog date={date} setDate={setDate} entries={cardioEntries} onChange={updateCardio} totalCalories={cardioExtra}/>

      <div className="summary">
        <div className="metric"><small>BASELINE</small><strong>{baseline.toLocaleString()} <span>kcal</span></strong></div>
        <div className="metric"><small>EST. MAINTENANCE</small><strong>{maintenance.toLocaleString()} <span>kcal</span></strong></div>
        <div className="metric"><small>CALCULATED GOAL</small><strong>{calculatedTarget.toLocaleString()} <span>kcal</span></strong></div>
        <div className="metric"><small>DAILY CALORIE GOAL</small><strong>{target.toLocaleString()} <span>kcal</span></strong></div>
      </div>
      <p className="muted note">Maintenance is calculated from your baseline and recorded activity regardless of your weight goal. The goal-based calculation is <b>{Math.abs(toDisplayRate(goalRate,units,2)).toFixed(2)} {rateUnit}</b> {mode==='Bulk'?'gain':mode==='Cut'?'loss':'change'} per week using the remaining days. No arbitrary calorie adjustment cap is applied. These values are estimates, not safe-intake recommendations.</p>
      <div className="formgrid">
        <label>Daily calorie goal source
          <select value={calorieTargetMode} onChange={e=>setCalorieTargetMode(e.target.value)}>
            <option value="calculated">Calculate from weight goal + deadline</option>
            <option value="custom">Set my own daily calorie goal</option>
          </select>
        </label>
        {calorieTargetMode==='custom'&&<label>My daily calorie goal (kcal)
          <input type="number" min="0" step="1" value={manualCalorieTarget} onChange={e=>update('customCalorieTarget',Math.max(0,Number(e.target.value)||0))}/>
        </label>}
      </div>
      {daysRemaining<=0&&<p className="error">The selected deadline has passed or is today. The calculation uses a one-day fallback; choose a future date for a meaningful goal.</p>}
      {calculatedTarget<=0&&<p className="error">The mathematical calorie target for this goal is {calculatedTarget.toLocaleString()} kcal/day, which is not a viable food intake. Set a realistic deadline or choose your own daily target.</p>}
      {calculatedTarget>maintenance*1.5&&<p className="muted note">This goal implies a large surplus. Consider checking your rate of weight change over time rather than treating the calculated result as a required intake.</p>}
    </section>

    <section className="panel">
      <h2>Macro targets</h2>
      <p className="muted">Use calculated targets based on your weight and calorie goal, or set protein, carbs, and fat yourself. Your manual targets are saved to your Powerbuild profile.</p>
      <div className="formgrid">
        <label>Macro target source
          <select value={macroTargetMode} onChange={e=>setMacroTargetMode(e.target.value)}>
            <option value="calculated">Automatically calculate macros</option>
            <option value="custom">Set protein, carbs and fat manually</option>
          </select>
        </label>
      </div>
      <div className="summary">
        <div className="metric"><small>PROTEIN GOAL</small><strong>{Math.round(protein)}<span> g</span></strong></div>
        <div className="metric"><small>CARB GOAL</small><strong>{Math.round(carbs)}<span> g</span></strong></div>
        <div className="metric"><small>FAT GOAL</small><strong>{Math.round(fat)}<span> g</span></strong></div>
        <div className="metric"><small>MACRO CALORIES</small><strong>{macroCalories.toLocaleString()}<span> kcal</span></strong></div>
      </div>
      {macroTargetMode==='calculated'?<div className="formgrid">
        <label>Protein (g/{units})<input type="number" min=".2" max="4" step=".05" value={proteinRate} onChange={e=>update('proteinPerLb',storeMacroRate(e.target.value,units))}/></label>
        <label>Fat (g/{units})<input type="number" min=".1" max="2" step=".05" value={fatRate} onChange={e=>update('fatPerLb',storeMacroRate(e.target.value,units))}/></label>
      </div>:<div className="formgrid">
        {[['customProtein','Protein (g)',protein],['customCarbs','Carbs (g)',carbs],['customFat','Fat (g)',fat]].map(([key,label,value])=><label key={key}>{label}
          <input type="number" min="0" step="1" value={value} onChange={e=>update(key,Math.max(0,Number(e.target.value)||0))}/>
        </label>)}
      </div>}
      <p className="muted note">The macros above total about {macroCalories.toLocaleString()} kcal. {Math.abs(macroCalories-target)>25?'They differ from your calorie goal; adjust them independently if you want the numbers to match.':'They are close to your calorie goal.'} Food entries below count toward both calories and macro totals.</p>
    </section>

    <FoodLog date={date} setDate={setDate} items={logged} updateDayRecord={updateDayRecord} entry={entry} setEntry={setEntry} target={target} macros={{protein,carbs,fat}}/>
  </>;
}

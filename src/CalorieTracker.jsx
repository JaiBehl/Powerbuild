import React from 'react';
import {Plus,Trash2} from 'lucide-react';
import CardioLog from './CardioLog';
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
  const maxCut=maintenance*.25,maxBulk=maintenance*.15;
  const adjustment=Math.max(-maxCut,Math.min(maxBulk,rawAdjustment));
  const target=Math.max(0,Math.round(maintenance+adjustment));
  const mode=Math.abs(goalDifference)<.1?'Maintain':goalDifference>0?'Bulk':'Cut';
  const unrealistic=Math.abs(rawAdjustment-adjustment)>1;
  const protein=Math.round(weight*cs.proteinPerLb),fat=Math.round(weight*cs.fatPerLb),carbs=Math.max(0,Math.round((target-protein*4-fat*9)/4));
  const sums=logged.reduce((a,x)=>({calories:a.calories+Number(x.calories||0),protein:a.protein+Number(x.protein||0),carbs:a.carbs+Number(x.carbs||0),fat:a.fat+Number(x.fat||0)}),{calories:0,protein:0,carbs:0,fat:0});

  const add=()=>{
    if(Number(entry.calories)<=0)return;
    updateDayRecord(day=>({...day,items:[...day.items,{...entry,id:Date.now()+Math.random()}]}));
    setEntry({calories:'',protein:'',carbs:'',fat:''});
  };
  const remove=id=>updateDayRecord(day=>({...day,items:day.items.filter(i=>i.id!==id)}));
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
        <div className="metric"><small>DAILY CALORIE GOAL</small><strong>{target.toLocaleString()} <span>kcal</span></strong></div>
        <div className="metric"><small>REQUIRED {mode==='Bulk'?'GAIN':mode==='Cut'?'LOSS':'CHANGE'}</small><strong>{Math.abs(toDisplayRate(goalRate,units,2)).toFixed(2)} <span>{rateUnit}</span></strong></div>
      </div>
      <p className="muted note">Daily target uses your selected baseline, activity assumptions, custom cardio, and deadline. Estimated deficit is capped at 25% of maintenance and surplus at 15%. Recalibrate with weight trends.</p>
      {daysRemaining<=0&&<p className="error">Your deadline has passed or is today. Choose a future date for a meaningful target.</p>}
      {unrealistic&&daysRemaining>0&&<p className="error">Your requested rate exceeds the app's planning limits. The displayed calorie target uses a moderated rate; extend your deadline or adjust the goal.</p>}
    </section>

    <section className="panel">
      <h2>Macro targets</h2>
      <div className="summary">
        <div className="metric"><small>PROTEIN</small><strong>{protein}<span> g</span></strong></div>
        <div className="metric"><small>CARBS</small><strong>{carbs}<span> g</span></strong></div>
        <div className="metric"><small>FAT</small><strong>{fat}<span> g</span></strong></div>
      </div>
      <div className="formgrid">
        <label>Protein (g/{units})<input type="number" min=".2" max="4" step=".05" value={proteinRate} onChange={e=>update('proteinPerLb',storeMacroRate(e.target.value,units))}/></label>
        <label>Fat (g/{units})<input type="number" min=".1" max="2" step=".05" value={fatRate} onChange={e=>update('fatPerLb',storeMacroRate(e.target.value,units))}/></label>
      </div>
    </section>

    <section className="panel">
      <div className="between"><h2>Food log</h2><input aria-label="Food log date" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
      <div className="summary">
        <div className="metric"><small>CALORIES LOGGED</small><strong>{Math.round(sums.calories)}</strong></div>
        <div className="metric"><small>REMAINING</small><strong>{Math.round(target-sums.calories)}</strong></div>
        <div className="metric"><small>PROTEIN LOGGED</small><strong>{Math.round(sums.protein)}<span> g</span></strong></div>
      </div>
      <div className="formgrid">{[['calories','Calories'],['protein','Protein (g)'],['carbs','Carbs (g)'],['fat','Fat (g)']].map(([key,label])=><label key={key}>{label}<input type="number" min="0" value={entry[key]} onChange={e=>setEntry(p=>({...p,[key]:e.target.value}))}/></label>)}</div>
      <button className="primary" onClick={add}><Plus size={16}/> Add food entry</button>
      <div className="weightlist">{logged.map(item=><div key={item.id}><span>{item.calories} kcal · P {item.protein||0} / C {item.carbs||0} / F {item.fat||0}</span><button className="iconbtn subtle" onClick={()=>remove(item.id)}><Trash2 size={14}/></button></div>)}</div>
    </section>
  </>;
}

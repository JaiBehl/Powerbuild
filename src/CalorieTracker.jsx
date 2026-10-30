import React from 'react';
import CardioLog from './CardioLog';
import FoodLog from './FoodLog';
import SavedFoods from './SavedFoods';
import CalorieSection from './CalorieSection';
import {displayMacroRate,fromDisplayWeight,storeMacroRate,toDisplayRate,toDisplayWeight,unitName} from './units';

export {calorieDefaults} from './nutrition';
import {calculateNutrition,updateDayPlan,updateDayRecord as updateNutritionDay} from './nutrition';

export default function CalorieTracker({db,patch,date,setDate,entry,setEntry}){
  const units=unitName(db.settings.units);
  const {cs,stored,goal,weight,heightIn,age,sex,estimatedBaseline,customBaseline,baselineMode,baseline,heightFeet,heightRemainder,cardioExtra,walkExtra,runExtra,liftExtra,maintenance,days,daysRemaining,validDeadline,goalDifference,goalRate,calculatedTarget,mode,calorieTargetMode,manualCalorieTarget,target,calculatedProtein,calculatedFat,calculatedCarbs,macroTargetMode,protein,carbs,fat,macroCalories,rmr,rmrMethod,adult,baselineFactor,walkPace,liftMet,estimatedMaintenance,maintenanceMode,customMaintenance,maintenanceOverrideValid}=calculateNutrition(db,date);
  const update=(key,value)=>patch(p=>updateDayPlan(p,date,{calorieSettings:{[key]:value}}));
  const changeGoal=(key,value)=>patch(p=>updateDayPlan({...p,settings:{...p.settings,[key]:value}},date,{goal:{[key]:value}}));
  const record=db.calories.find(x=>x.date===date);
  const logged=Array.isArray(record?.items)?record.items:[],savedFoods=Array.isArray(db.savedFoods)?db.savedFoods:[],cardioEntries=Array.isArray(record?.cardio)?record.cardio:[];
  const updateDayRecord=fn=>patch(p=>updateNutritionDay(p,date,fn));
  const setCalorieTargetMode=nextMode=>patch(p=>updateDayPlan(p,date,{calorieSettings:{calorieTargetMode:nextMode,customCalorieTarget:cs.customCalorieTarget??Math.max(0,calculatedTarget)}}));
  const setMacroTargetMode=nextMode=>patch(p=>updateDayPlan(p,date,{calorieSettings:{macroTargetMode:nextMode,customProtein:cs.customProtein??calculatedProtein,customCarbs:cs.customCarbs??calculatedCarbs,customFat:cs.customFat??calculatedFat}}));
  const updateCardio=entries=>updateDayRecord(day=>({...day,cardio:entries}));
  const saveToLibrary=food=>patch(p=>({...p,savedFoods:[...(p.savedFoods||[]),food]}));
  const updateSavedFood=food=>patch(p=>({...p,savedFoods:(p.savedFoods||[]).map(item=>item.id===food.id?food:item)}));
  const removeSavedFood=id=>patch(p=>({...p,savedFoods:(p.savedFoods||[]).filter(item=>item.id!==id)}));
  const addSavedToLog=food=>updateDayRecord(day=>({...day,items:[...day.items,food]}));

  const displayedGoal=toDisplayWeight(goal.targetWeight,units,1);
  const displayedWeight=toDisplayWeight(weight,units,1);
  const rateUnit=units==='kg'?'kg/week':'lb/week';
  const proteinRate=displayMacroRate(cs.proteinPerLb,units,2);
  const fatRate=displayMacroRate(cs.fatPerLb,units,2);

  return <>
    <p className="muted">Activity and target edits are saved for the selected date. New dates start with your defaults.</p>
    <button className="secondary" onClick={()=>patch(p=>({...p,calorieSettings:{...cs}}))}>Use this day's settings for new dates</button>
    <CalorieSection
      title="Bodyweight goal"
      description="Choose your target weight and deadline for bulk, cut, or maintenance planning."
      summary={displayedGoal+' '+units+' · '+goal.weightDeadline}
      className="calorie-weight-goal"
    >
      <div className="weight-goal-summary-row">
        <div className="weight-goal-overview">
          <small>CURRENT PLAN</small>
          <strong>{mode}</strong>
          <span>Current weight: {displayedWeight} {units}. Goal: {displayedGoal} {units} by {goal.weightDeadline}.</span>
        </div>
        <div className="weight-goal-target">
          <small>BODYWEIGHT TARGET</small>
          <strong>{displayedGoal} {units}</strong>
          <span>{goal.weightDeadline}</span>
        </div>
      </div>
      <div className="formgrid">
        <label>Goal weight ({units})<input type="number" min="20" max="700" step={units==='kg'?'0.1':'0.5'} value={displayedGoal} onChange={e=>changeGoal('targetWeight',fromDisplayWeight(e.target.value,units))}/></label>
        <label>Goal deadline<input type="date" value={goal.weightDeadline} onChange={e=>changeGoal('weightDeadline',e.target.value)}/></label>
      </div>
    </CalorieSection>

    <CalorieSection
      title="Baseline maintenance"
      description="Estimate your base daily calories using height, weight, age and sex, or enter a custom baseline."
      summary={baseline.toLocaleString()+' kcal'}
    >
      <p className="muted">Resting metabolism: approximately {Math.round(rmr).toLocaleString()} kcal/day ({rmrMethod==='tenHaaf'?'ten Haaf, recreational athletes':'Mifflin–St Jeor, general adults'}). The baseline adds an allowance for ordinary daily living and digestion; logged activity is added separately.</p>
      <div className="formgrid">
        <label>Baseline source<select value={baselineMode} onChange={e=>update('baselineMode',e.target.value)}><option value="estimate">Use app estimate</option><option value="custom">Use my own baseline</option></select></label>
        {baselineMode==='estimate'&&<><label>Resting metabolism formula<select value={cs.rmrEquation} onChange={e=>update('rmrEquation',e.target.value)}><option value="tenHaaf">Recreational athlete, age 18–35 (ten Haaf)</option><option value="mifflin">General adult (Mifflin–St Jeor)</option></select></label><label>Unlogged daily living factor<input type="number" min="1.1" max="1.5" step="0.05" value={baselineFactor} onChange={e=>update('baselineFactor',Number(e.target.value))}/></label></>}
        {baselineMode==='custom'&&<label>Custom baseline (kcal)<input type="number" min="800" max="7000" step="10" value={customBaseline} onChange={e=>update('customBaseline',Number(e.target.value))}/></label>}
        <label>Weight source<select aria-label="Weight source" value={cs.weightMode} onChange={e=>patch(p=>updateDayPlan(p,date,{calorieSettings:{weightMode:e.target.value,bodyWeight:cs.bodyWeight??weight}}))}><option value="auto">Follow weigh-ins</option><option value="manual">Enter weight manually</option></select></label>
        <label>Weight ({units})<input type="number" min="20" max="700" step="0.1" disabled={cs.weightMode==='auto'} value={displayedWeight} onChange={e=>update('bodyWeight',fromDisplayWeight(e.target.value,units))}/></label>
        <label>Sex<select value={sex} onChange={e=>update('sex',e.target.value)}><option value="male">Male</option><option value="female">Female</option></select></label>
        <label>Age<input type="number" min="13" max="100" step="1" value={age} onChange={e=>update('age',Number(e.target.value))}/></label>
        <label>Height (feet)<input type="number" min="4" max="8" step="1" value={heightFeet} onChange={e=>update('heightIn',Number(e.target.value)*12+heightRemainder)}/></label>
        <label>Height (inches)<input type="number" min="0" max="11" step="1" value={heightRemainder} onChange={e=>update('heightIn',heightFeet*12+Number(e.target.value))}/></label>
      </div>
      {cs.rmrEquation==='tenHaaf'&&(age<18||age>35)&&<p className="muted note">The athlete equation was developed for ages 18–35. Mifflin–St Jeor is used outside that range.</p>}
      {!adult&&<p className="error">These are adult equations and are not validated for people under 18.</p>}
      <p className="muted">Keep the daily living factor near 1.2 when walking and exercise are logged below. Do not also include those activities in this factor or a custom baseline. These are starting estimates; no equation measures your personal maintenance.</p>
      <p className="muted">{cs.weightMode==='auto'?'Following the most recent weigh-in on or before this date. New weigh-ins update the calculation automatically.':'Using a manual weight for this date. Choose Follow weigh-ins to reconnect Progress entries.'}</p>
      {baselineMode==='custom'&&<p className="muted note">Custom baseline mode uses your entered number before net activity. Keep logged activity out of this number. A known total maintenance overrides both baseline and activity.</p>}
    </CalorieSection>

    <CalorieSection
      title="Daily activity"
      description="Adjust walking, running and lifting to estimate activity-related calorie expenditure."
      summary={Math.round(walkExtra+runExtra+liftExtra).toLocaleString()+' kcal'}
    >
      <p className="muted">{maintenanceMode==='custom'?'These activities remain logged, but your known maintenance total replaces the full estimate.':'Net activity is added to the selected baseline. Avoid counting the same activity again under Custom cardio.'}</p>
      <div className="formgrid">
        <label>Miles walked<input type="range" min="0" max="15" step=".25" value={cs.milesWalked} onChange={e=>update('milesWalked',Number(e.target.value))}/><strong>{cs.milesWalked} miles</strong></label>
        <label>Walking pace (minutes per mile)<input type="number" min="15" max="40" step="0.5" value={walkPace} onChange={e=>update('walkMinutesPerMile',Number(e.target.value))}/></label>
        <label>Miles run (5:00/mile)<input type="range" min="0" max="10" step=".25" value={cs.milesRun} onChange={e=>update('milesRun',Number(e.target.value))}/><strong>{cs.milesRun} miles</strong></label>
        <label>Lifted today?<select value={cs.lifted?'yes':'no'} onChange={e=>update('lifted',e.target.value==='yes')}><option value="yes">Yes</option><option value="no">No</option></select></label>
        <label>Lifting duration (hours)<input type="range" min="1" max="3" step=".25" disabled={!cs.lifted} value={cs.liftHours} onChange={e=>update('liftHours',Number(e.target.value))}/><strong>{cs.liftHours} hours</strong></label>
        <label>Average lifting intensity<select disabled={!cs.lifted} value={liftMet} onChange={e=>update('liftMet',Number(e.target.value))}><option value="3.5">Typical lifting with rests (3.5 MET)</option><option value="5">Squat/deadlift focused (5 MET)</option><option value="6">Vigorous session average (6 MET)</option></select></label>
      </div>
      <p className="muted">Activity estimates count calories above rest. Walking/running assume level ground; hills and short sprints add uncertainty. Lifting intensity is the average across the whole session, including rests—not the RPE of a set. Avoid counting the same activity again as custom cardio.</p>
    </CalorieSection>

    <CalorieSection
      title="Custom cardio"
      description="Log cardio sessions by exercise, duration and calories burned for your selected date."
      summary={cardioEntries.length+' logged · '+Math.round(cardioExtra).toLocaleString()+' kcal'}
    >
      <CardioLog date={date} setDate={setDate} entries={cardioEntries} onChange={updateCardio} totalCalories={cardioExtra} compact/>
    </CalorieSection>

    <CalorieSection
      title="Daily calorie target"
      description="Review estimated maintenance and choose an automatic or manual daily calorie goal."
      summary={target.toLocaleString()+' kcal goal'}
    >
      <div className="summary">
        <div className="metric"><small>BASELINE</small><strong>{baseline.toLocaleString()} <span>kcal</span></strong></div>
        <div className="metric"><small>EST. MAINTENANCE</small><strong>{maintenance.toLocaleString()} <span>kcal</span></strong></div>
        <div className="metric"><small>CALCULATED GOAL</small><strong>{calculatedTarget.toLocaleString()} <span>kcal</span></strong></div>
        <div className="metric"><small>DAILY CALORIE GOAL</small><strong>{target.toLocaleString()} <span>kcal</span></strong></div>
      </div>
      <p className="muted note">Maintenance uses your chosen estimate or known total, independently of your weight goal. The goal-based calculation is <b>{Math.abs(toDisplayRate(goalRate,units,2)).toFixed(2)} {rateUnit}</b> {mode==='Bulk'?'gain':mode==='Cut'?'loss':'change'} per week using the remaining days. No arbitrary calorie adjustment cap is applied. These values are estimates, not safe-intake recommendations.</p>
      <div className="formgrid">
        <label>Maintenance source<select value={maintenanceMode} onChange={e=>patch(p=>updateDayPlan(p,date,{calorieSettings:{maintenanceMode:e.target.value,customMaintenance:cs.customMaintenance??estimatedMaintenance}}))}><option value="estimate">Estimate from baseline + activity</option><option value="custom">Use my known total maintenance</option></select></label>
        {maintenanceMode==='custom'&&<label>Known total maintenance (kcal/day)<input type="number" min="1" step="10" value={customMaintenance} onChange={e=>update('customMaintenance',Number(e.target.value))}/></label>}
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
      <p className="muted">{maintenanceMode==='custom'?'Your known total replaces the full estimate; activity is not added again. ':'Estimate from baseline + activity: '+estimatedMaintenance.toLocaleString()+' kcal/day. '}Compare consistently logged intake with several weeks of weight averages. Stable weight with complete logs is more useful for personal calibration than a single day. Missing meals or water-weight changes prevent reliable automatic calibration.</p>
      {maintenanceMode==='custom'&&!maintenanceOverrideValid&&<p className="error">Enter a positive known maintenance value. The activity estimate is used until a valid value is entered.</p>}
      {!validDeadline&&<p className="error">Choose a valid goal deadline. Maintenance is still calculated; goal math uses a one-day fallback until a date is selected.</p>}
      {validDeadline&&daysRemaining<=0&&<p className="error">The selected deadline has passed or is today. The calculation uses a one-day fallback; choose a future date for a meaningful goal.</p>}
      {calculatedTarget<=0&&<p className="error">The mathematical calorie target for this goal is {calculatedTarget.toLocaleString()} kcal/day, which is not a viable food intake. Set a realistic deadline or choose your own daily target.</p>}
      {calculatedTarget>maintenance*1.5&&<p className="muted note">This goal implies a large surplus. Consider checking your rate of weight change over time rather than treating the calculated result as a required intake.</p>}
    </CalorieSection>

    <CalorieSection
      title="Macro targets"
      description="Set protein, carbs and fat automatically or adjust them yourself."
      summary={'P '+Math.round(protein)+'g · C '+Math.round(carbs)+'g · F '+Math.round(fat)+'g'}
    >
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
    </CalorieSection>

    <FoodLog date={date} setDate={setDate} items={logged} updateDayRecord={updateDayRecord} entry={entry} setEntry={setEntry} target={target} macros={{protein,carbs,fat}} onSaveToLibrary={saveToLibrary}/>
    <SavedFoods foods={savedFoods} date={date} onAddToLog={addSavedToLog} onEditFood={updateSavedFood} onDeleteFood={removeSavedFood}/>
  </>;
}

import {programCycle} from './programLibrary';
import RecoveryPanel from './RecoveryPanel';
import HistoricalImportPanel from './HistoricalImportPanel';
import ExerciseAliases from './ExerciseAliases';
import React,{useMemo,useState} from 'react';
import {Download,Upload,RotateCcw,Plus,Trash2} from 'lucide-react';
import {cycle,initialSettings} from './data';
import {calorieDefaults} from './CalorieTracker';
import {fromDisplayWeight,toDisplayWeight,unitName} from './units';
import CalorieSection from './CalorieSection';
import './ui-polish.css';

export default function SettingsTab({db,patch,patchSettings,exportJson,exportCsv,importJson,importError,cloneTemplates,importHistoricalJson,historyImportStatus,profileName='My profile',profileId='primary',onRestoreWorkspace,onExportWorkspace,cloudEnabled=false}){
  const units=unitName(db.settings.units);
  const [newExercise,setNewExercise]=useState('');
  const [newTarget,setNewTarget]=useState('');
  const [newDeadline,setNewDeadline]=useState(db.settings.strengthDeadline||initialSettings.strengthDeadline);
  const goals=Array.isArray(db.strengthGoals)?db.strengthGoals:[];
  const knownExercises=useMemo(()=>{
    const names=new Set();
    Object.values(db.templates||{}).forEach(list=>Array.isArray(list)&&list.forEach(e=>e?.[0]&&names.add(e[0])));
    db.sessions.forEach(s=>s.exercises.forEach(e=>e.name&&names.add(e.name)));
    goals.forEach(g=>g.exercise&&names.add(g.exercise));
    return [...names].sort((a,b)=>a.localeCompare(b));
  },[db.templates,db.sessions,goals]);

  const updateGoal=(id,changes)=>patch(p=>({...p,strengthGoals:(p.strengthGoals||[]).map(g=>g.id===id?{...g,...changes}:g)}));
  const removeGoal=(id)=>patch(p=>({...p,strengthGoals:(p.strengthGoals||[]).filter(g=>g.id!==id)}));
  const addGoal=()=>{
    const exercise=newExercise.trim();
    const target=Number(newTarget);
    if(!exercise||target<=0||!newDeadline)return;
    const id=globalThis.crypto?.randomUUID?.()||`goal-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    patch(p=>({...p,strengthGoals:[...(p.strengthGoals||[]),{id,exercise,targetWeight:fromDisplayWeight(target,units),deadline:newDeadline}]}));
    setNewExercise('');
    setNewTarget('');
  };

  return <>
    <CalorieSection title="Units, goals & schedule" description="Adjust units, bodyweight planning and your weekly training rotation." summary={units+' · '+(db.settings.schedule?.length||0)+' training days'}>
      <p className="muted">Choose pounds or kilograms for every weight input and display. Powerbuild keeps the underlying data consistent when you switch units.</p>
      <div className="formgrid">
        <label>Weight unit<select value={units} onChange={e=>patchSettings({units:e.target.value})}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></label>
        <label>Rotation start date<input type="date" value={db.settings.startDate} onChange={e=>patchSettings({startDate:e.target.value})}/></label>
        <label>Default starting weight ({units})<input type="number" step={units==='kg'?'0.1':'0.5'} value={toDisplayWeight(db.settings.startWeight,units,1)} onChange={e=>patchSettings({startWeight:fromDisplayWeight(e.target.value,units)})}/></label>
        <label>Default target weight ({units})<input type="number" step={units==='kg'?'0.1':'0.5'} value={toDisplayWeight(db.settings.targetWeight,units,1)} onChange={e=>patchSettings({targetWeight:fromDisplayWeight(e.target.value,units)})}/></label>
        <label>Default weight goal deadline<input type="date" value={db.settings.weightDeadline} onChange={e=>patchSettings({weightDeadline:e.target.value})}/></label>
        <label>Cycle offset<select value={db.settings.cycleOffset||0} onChange={e=>patchSettings({cycleOffset:Number(e.target.value)})}>{programCycle(db.settings).map((x,i)=><option value={i} key={i}>{i} — start with {x}</option>)}</select></label>
      </div>
      <p className="muted">Bodyweight settings here are defaults for new nutrition dates. To change a recorded day's goal, open that date in Calorie tracker.</p>
      <h3>Training weekdays</h3>
      <p className="muted">Default: Monday, Tuesday, Wednesday, Friday, Saturday. Changing weekdays changes the scheduled rotation.</p>
      <div className="weekpick">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((x,i)=><label key={x}><input type="checkbox" checked={db.settings.schedule.includes(i+1)} onChange={e=>patchSettings({schedule:e.target.checked?[...db.settings.schedule,i+1].sort():db.settings.schedule.filter(n=>n!==i+1)})}/>{x}</label>)}</div>
    </CalorieSection>

    <CalorieSection title="Strength goals" description="Edit target weights and deadlines for each lift you want to track." summary={goals.length+' active goals'}>
      {goals.length===0?<p className="empty">No strength goals yet. Add one below whenever you want to track a specific lift.</p>:<div className="goal-editor-list">{goals.map(g=><div className="goal-editor-row" key={g.id}>
        <label className="goal-field goal-exercise">Exercise<input list="strength-exercises" value={g.exercise} onChange={e=>updateGoal(g.id,{exercise:e.target.value})}/></label>
        <label className="goal-field">Goal weight ({units})<input type="number" min="0" step={units==='kg'?'0.5':'2.5'} value={toDisplayWeight(g.targetWeight,units,1)} onChange={e=>updateGoal(g.id,{targetWeight:fromDisplayWeight(e.target.value,units)})}/></label>
        <label className="goal-field">Goal date<input type="date" value={g.deadline||''} onChange={e=>updateGoal(g.id,{deadline:e.target.value})}/></label>
        <button className="iconbtn subtle goal-remove" title="Remove strength goal" onClick={()=>removeGoal(g.id)}><Trash2 size={15}/></button>
      </div>)}</div>}
      <datalist id="strength-exercises">{knownExercises.map(name=><option key={name} value={name}/>)}</datalist>
      <div className="formgrid goal-add-grid">
        <label>Exercise<input list="strength-exercises" placeholder="Any exercise" value={newExercise} onChange={e=>setNewExercise(e.target.value)}/></label>
        <label>Goal weight ({units})<input type="number" min="0" step={units==='kg'?'0.5':'2.5'} placeholder={units==='kg'?'100':'225'} value={newTarget} onChange={e=>setNewTarget(e.target.value)}/></label>
        <label>Goal date<input type="date" value={newDeadline} onChange={e=>setNewDeadline(e.target.value)}/></label>
      </div>
      <p className="muted goal-helper">You can leave any exercise without a goal and add or remove goals whenever you want.</p>
      <button className="secondary" onClick={addGoal}><Plus size={16}/> Add strength goal</button>
    </CalorieSection>

    <ExerciseAliases db={db} patch={patch}/>
    <HistoricalImportPanel db={db} patch={patch} profileId={profileId} profileName={profileName}/>
    <CalorieSection title="Backups & exports" description="Export workouts and profile backups, or import data into the selected profile." summary={profileName+' · '+db.sessions.length+' workouts'}><p className="muted">These actions only affect <b>{profileName}</b>. Its logs are saved automatically on this device. {cloudEnabled?'Cloud sync is connected.':'Sign in to cloud sync to share data across devices.'} Export a JSON backup periodically, especially before clearing browser data.</p><div className="actions"><button className="primary" onClick={exportJson}><Download size={17}/> Export profile backup</button><button className="secondary" onClick={exportCsv}><Download size={17}/> Export sets CSV</button><label className="secondary upload"><Upload size={17}/> Import into this profile<input type="file" accept=".json,application/json" onChange={importJson} hidden/></label></div>{importError&&<p className="error">{importError}</p>}</CalorieSection>
    <RecoveryPanel db={db} patch={patch} profileId={profileId} profileName={profileName} onRestoreWorkspace={onRestoreWorkspace} onExportWorkspace={onExportWorkspace}/>
    <CalorieSection title="Reset profile" description={"Permanently erase workouts, nutrition, goals and settings for "+profileName+" only."} summary={profileName} className="warning">
      <p className="muted">Clears only this profile's workout logs, weight entries, nutrition, strength goals, custom exercises, and settings. Other profiles are untouched. Back up your profile first.</p>
      <button className="danger" onClick={()=>{if(confirm(`Erase all data in ${profileName}? Other profiles will not be affected.`))patch({settings:{...initialSettings},strengthGoals:[],sessions:[],weights:[],calories:[],savedFoods:[],exerciseAliases:{},workoutMeta:{},calorieSettings:{...calorieDefaults},templates:cloneTemplates()},{checkpoint:'Before profile reset'})}}><RotateCcw size={16}/> Reset profile</button>
    </CalorieSection>
  </>;
}

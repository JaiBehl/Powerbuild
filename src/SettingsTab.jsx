import React,{useMemo,useState} from 'react';
import {Download,Upload,RotateCcw,Plus,Trash2} from 'lucide-react';
import {cycle,initialSettings} from './data';
import {calorieDefaults} from './CalorieTracker';
import {fromDisplayWeight,toDisplayWeight,unitName} from './units';
import './ui-polish.css';

export default function SettingsTab({db,patch,patchSettings,exportJson,exportCsv,importJson,importError,cloneTemplates,importHistoricalJson,historyImportStatus,profileName='My profile',cloudEnabled=false}){
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
    <section className="panel">
      <h2>Units, goals & schedule</h2>
      <p className="muted">Choose pounds or kilograms for every weight input and display. Powerbuild keeps the underlying data consistent when you switch units.</p>
      <div className="formgrid">
        <label>Weight unit<select value={units} onChange={e=>patchSettings({units:e.target.value})}><option value="lb">Pounds (lb)</option><option value="kg">Kilograms (kg)</option></select></label>
        <label>Rotation start date<input type="date" value={db.settings.startDate} onChange={e=>patchSettings({startDate:e.target.value})}/></label>
        <label>Starting weight ({units})<input type="number" step={units==='kg'?'0.1':'0.5'} value={toDisplayWeight(db.settings.startWeight,units,1)} onChange={e=>patchSettings({startWeight:fromDisplayWeight(e.target.value,units)})}/></label>
        <label>Target weight ({units})<input type="number" step={units==='kg'?'0.1':'0.5'} value={toDisplayWeight(db.settings.targetWeight,units,1)} onChange={e=>patchSettings({targetWeight:fromDisplayWeight(e.target.value,units)})}/></label>
        <label>Weight goal deadline<input type="date" value={db.settings.weightDeadline} onChange={e=>patchSettings({weightDeadline:e.target.value})}/></label>
        <label>Cycle offset (0–5)<select value={db.settings.cycleOffset||0} onChange={e=>patchSettings({cycleOffset:Number(e.target.value)})}>{cycle.map((x,i)=><option value={i} key={i}>{i} — start with {x}</option>)}</select></label>
      </div>
      <h3>Training weekdays</h3>
      <p className="muted">Default: Monday, Tuesday, Wednesday, Friday, Saturday. Changing weekdays changes the scheduled rotation.</p>
      <div className="weekpick">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((x,i)=><label key={x}><input type="checkbox" checked={db.settings.schedule.includes(i+1)} onChange={e=>patchSettings({schedule:e.target.checked?[...db.settings.schedule,i+1].sort():db.settings.schedule.filter(n=>n!==i+1)})}/>{x}</label>)}</div>
    </section>

    <section className="panel">
      <div className="between"><div><h2>Strength goals</h2><p className="muted">Set goals only for the exercises you want to chase. Every goal can have its own target weight and target date.</p></div><span className="goalpill">{goals.length} active</span></div>
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
    </section>

    <section className="panel">
      <h2>Import Apple Notes workout history</h2>
      <p className="muted">Merge the historical workout JSON generated from your Apple Notes export into <b>{profileName}</b>. This <b>adds</b> dated exercises, sets, original notes, and bodyweight measurements without deleting workouts, calorie logs, or settings already saved in this profile. Matching workout dates are merged; existing exercise names and same-day bodyweight values take precedence.</p>
      <p className="muted">First export a backup below. For cross-device syncing, sign in under Cloud Sync and confirm it is connected before importing.</p>
      <div className="actions"><label className="primary upload"><Upload size={17}/> Merge historical workouts<input type="file" accept=".json,application/json" onChange={importHistoricalJson} hidden/></label></div>
      {historyImportStatus&&<p className={historyImportStatus.startsWith('Import failed')?'error':'muted note'} role="status">{historyImportStatus}</p>}
    </section>
    <section className="panel"><h2>Backups & exports</h2><p className="muted">These actions only affect <b>{profileName}</b>. Its logs are saved automatically on this device. {cloudEnabled?'Cloud sync is connected.':'Sign in to cloud sync to share data across devices.'} Export a JSON backup periodically, especially before clearing browser data.</p><div className="actions"><button className="primary" onClick={exportJson}><Download size={17}/> Export profile backup</button><button className="secondary" onClick={exportCsv}><Download size={17}/> Export sets CSV</button><label className="secondary upload"><Upload size={17}/> Import into this profile<input type="file" accept=".json,application/json" onChange={importJson} hidden/></label></div>{importError&&<p className="error">{importError}</p>}</section>
    <section className="panel warning"><div className="between"><div><h3>Reset {profileName}</h3><p className="muted">Clears only this profile's workout logs, weight entries, nutrition, strength goals, custom exercises, and settings. Other profiles are untouched.</p></div><button className="danger" onClick={()=>{if(confirm(`Erase all data in ${profileName}? Other profiles will not be affected.`))patch({settings:{...initialSettings},strengthGoals:[],sessions:[],weights:[],calories:[],savedFoods:[],calorieSettings:{...calorieDefaults},templates:cloneTemplates()})}}><RotateCcw size={16}/> Reset profile</button></div></section>
  </>;
}

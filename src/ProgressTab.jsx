import React from 'react';
import {LineChart,Line,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid} from 'recharts';
import {Plus,Trash2,Target} from 'lucide-react';
import {fromDisplayWeight,toDisplayWeight,unitName} from './units';

export default function ProgressTab({db,patch,date,setDate,setTab,weightEntry,setWeightEntry,history,chartLift,setChartLift,chartData,finished,latestWeight}){
  const units=unitName(db.settings.units);
  const goals=Array.isArray(db.strengthGoals)?db.strengthGoals:[];
  const displayChartData=chartData.map(x=>({...x,value:toDisplayWeight(x.value,units,1)}));
  const latestFor=(exercise)=>{
    const entries=Object.entries(history[exercise]||{}).sort(([a],[b])=>b.localeCompare(a));
    return entries[0]?.[1]||null;
  };

  return <>
    <div className="summary"><div className="metric"><small>FINISHED SESSIONS</small><strong>{finished.length}</strong></div><div className="metric"><small>SETS LOGGED</small><strong>{db.sessions.reduce((n,s)=>n+s.exercises.reduce((m,e)=>m+e.sets.filter(x=>x.done).length,0),0)}</strong></div><div className="metric"><small>LATEST WEIGHT</small><strong>{latestWeight?`${toDisplayWeight(latestWeight.weight,units,1)} ${units}`:'—'}</strong></div><div className="metric"><small>WEIGHT TARGET</small><strong>{toDisplayWeight(db.settings.targetWeight,units,1)} {units}</strong></div></div>

    <section className="panel">
      <div className="between"><div><h2>Strength goals</h2><p className="muted">Optional targets for any exercise. Edit or add goals from Settings.</p></div><Target size={20}/></div>
      {goals.length===0?<p className="empty">No strength goals set.</p>:<div className="weightlist">{goals.map(g=>{const current=latestFor(g.exercise);return <div key={g.id}><div><strong>{g.exercise}</strong><small>{current?`Latest est. 1RM: ${toDisplayWeight(current,units,1)} ${units}`:'No completed sets yet'}</small></div><div style={{textAlign:'right'}}><b>{toDisplayWeight(g.targetWeight,units,1)} {units}</b><small style={{display:'block'}}>{g.deadline||'No date'}</small></div></div>})}</div>}
    </section>

    <section className="panel"><div className="between"><div><h2>Estimated 1RM trend</h2><p className="muted">Epley estimate from completed sets of 1–15 reps; not a tested max.</p></div><select value={chartLift} onChange={e=>setChartLift(e.target.value)}>{[...new Set(['Barbell bench press','Barbell back squat','Supported seated barbell OHP',...Object.keys(history)])].map(n=><option key={n}>{n}</option>)}</select></div>{displayChartData.length?<div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={displayChartData}><CartesianGrid stroke="#263346" strokeDasharray="3 3"/><XAxis dataKey="date" stroke="#8492a6" tick={{fontSize:11}}/><YAxis stroke="#8492a6" domain={['auto','auto']} tick={{fontSize:11}}/><Tooltip formatter={(value)=>[`${value} ${units}`,'Estimated 1RM']} contentStyle={{background:'#182438',border:'1px solid #33445e',borderRadius:10}}/><Line type="monotone" dataKey="value" stroke="#7ba9ff" strokeWidth={3} dot={{r:3}} name="Estimated 1RM"/></LineChart></ResponsiveContainer></div>:<p className="empty">Complete some sets for this exercise to see your strength trend.</p>}</section>

    <section className="panel"><div className="between"><div><h2>Bodyweight log</h2><p className="muted">Use consistent morning weigh-ins; compare weekly averages.</p></div></div><div className="weightform"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/><input type="number" step="0.1" min="0" placeholder={`Weight (${units})`} value={weightEntry} onChange={e=>setWeightEntry(e.target.value)}/><button className="primary" onClick={()=>{if(Number(weightEntry)>0){patch(p=>({...p,weights:[...p.weights.filter(w=>w.date!==date),{date,weight:fromDisplayWeight(weightEntry,units)}]}));setWeightEntry('')}}}><Plus size={16}/> Save weight</button></div>{db.weights.length>0&&<div className="weightlist">{[...db.weights].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12).map(w=><div key={w.date}><span>{w.date}</span><b>{toDisplayWeight(w.weight,units,1)} {units}</b><button className="iconbtn subtle" onClick={()=>patch(p=>({...p,weights:p.weights.filter(x=>x.date!==w.date)}))}><Trash2 size={14}/></button></div>)}</div>}</section>
    <section className="panel"><h2>Workout history</h2>{finished.length===0?<p className="empty">Finish a workout to see it here.</p>:<div className="history">{finished.slice(0,25).map(s=><button key={s.id} onClick={()=>{setDate(s.date);setTab('today')}}><div><strong>{s.type}</strong><small>{s.date}</small></div><span>{s.exercises.reduce((n,e)=>n+e.sets.filter(x=>x.done).length,0)} completed sets →</span></button>)}</div>}</section>
  </>;
}

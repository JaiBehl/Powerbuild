import React,{useMemo,useState} from 'react';
import {LineChart,Line,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid} from 'recharts';
import {Plus,Trash2,Target} from 'lucide-react';
import {fromDisplayWeight,toDisplayWeight,unitName} from './units';

export default function ProgressTab({db,patch,date,setDate,setTab,weightEntry,setWeightEntry,history,chartLift,setChartLift,chartData,finished,latestWeight}){
  const units=unitName(db.settings.units);
  const goals=Array.isArray(db.strengthGoals)?db.strengthGoals:[];
  const [chartRange,setChartRange]=useState('6M');
  // Keep complete ISO dates for hover details; shorten only the axis tick labels.
  const displayChartData=useMemo(()=>{
    const all=chartData.map(x=>({...x,value:toDisplayWeight(x.value,units,1)}));
    if(!all.length||chartRange==='All')return all;
    const months={'3M':3,'6M':6,'1Y':12}[chartRange]||6;
    const latest=new Date(all[all.length-1].date+'T12:00:00');
    latest.setMonth(latest.getMonth()-months);
    const cutoff=[latest.getFullYear(),String(latest.getMonth()+1).padStart(2,'0'),String(latest.getDate()).padStart(2,'0')].join('-');
    return all.filter(x=>x.date>=cutoff);
  },[chartData,units,chartRange]);
  const formatTooltipDate=(iso)=>{
    const date=new Date(String(iso)+'T12:00:00');
    return Number.isNaN(date.getTime())?String(iso):date.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  };
  const formatAxisDate=(iso)=>{
    const date=new Date(String(iso)+'T12:00:00');
    return Number.isNaN(date.getTime())?String(iso):date.toLocaleDateString('en-US',chartRange==='All'?{month:'short',year:'2-digit'}:{month:'short',day:'numeric'});
  };
  const latestFor=(exercise)=>{
    const entries=Object.entries(history[exercise]||{}).sort(([a],[b])=>b.localeCompare(a));
    return entries[0]?.[1]||null;
  };

  return <>
    <div className="summary"><div className="metric"><small>FINISHED SESSIONS</small><strong>{finished.length}</strong></div><div className="metric"><small>SETS LOGGED</small><strong>{db.sessions.reduce((n,s)=>n+s.exercises.reduce((m,e)=>m+e.sets.filter(x=>x.done).length,0),0)}</strong></div><div className="metric"><small>LATEST WEIGHT</small><strong>{latestWeight?`${toDisplayWeight(latestWeight.weight,units,1)} ${units}`:'—'}</strong></div><div className="metric"><small>WEIGHT TARGET</small><strong>{toDisplayWeight(db.settings.targetWeight,units,1)} {units}</strong></div></div>

    <section className="panel">
      <div className="between"><div><h2>Strength goals</h2><p className="muted">Track only the lifts you care about. Goal weights and dates can be changed anytime in Settings.</p></div><Target size={20}/></div>
      {goals.length===0?<p className="empty">No strength goals set.</p>:<div className="goal-summary-list">{goals.map(g=>{const current=latestFor(g.exercise);return <div className="goal-summary-row" key={g.id}>
        <div className="goal-summary-main"><strong>{g.exercise}</strong><span>{current?`Latest estimated 1RM: ${toDisplayWeight(current,units,1)} ${units}`:'No completed sets yet for an estimated 1RM'}</span></div>
        <div className="goal-summary-target"><small>GOAL</small><b>{toDisplayWeight(g.targetWeight,units,1)} {units}</b><span>{g.deadline?`By ${g.deadline}`:'No goal date'}</span></div>
      </div>})}</div>}
    </section>

    <section className="panel">
      <div className="between trend-heading">
        <div><h2>Estimated 1RM trend</h2><p className="muted">Epley estimate from completed sets of 1–15 reps; not a tested max.</p></div>
        <select value={chartLift} aria-label="Select exercise to chart" onChange={e=>setChartLift(e.target.value)}>{[...new Set(['Barbell bench press','Barbell back squat','Supported seated barbell OHP',...Object.keys(history)])].map(n=><option key={n}>{n}</option>)}</select>
      </div>
      <div className="trend-controls">
        <div className="trend-range" role="group" aria-label="Chart date range">
          {['3M','6M','1Y','All'].map(range=><button type="button" key={range} aria-pressed={chartRange===range} className={chartRange===range?'selected':''} onClick={()=>setChartRange(range)}>{range}</button>)}
        </div>
        <span className="trend-caption">{displayChartData.length} logged {displayChartData.length===1?'date':'dates'} · Hover for exact values</span>
      </div>
      {displayChartData.length?<div className="chart trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayChartData} margin={{top:14,right:18,bottom:8,left:0}}>
            <CartesianGrid vertical={false} stroke="#2a3b52" strokeDasharray="3 7"/>
            <XAxis dataKey="date" tickFormatter={formatAxisDate} interval="preserveStartEnd" minTickGap={42} tickMargin={12} tick={{fill:'#94aac6',fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis domain={['auto','auto']} tickCount={5} width={48} tickFormatter={v=>Math.round(v).toLocaleString()} tick={{fill:'#94aac6',fontSize:11}} axisLine={false} tickLine={false}/>
            <Tooltip labelFormatter={formatTooltipDate} formatter={v=>[Number(v).toLocaleString('en-US',{maximumFractionDigits:1})+' '+units,'Estimated 1RM']} contentStyle={{background:'#17283f',border:'1px solid #416086',borderRadius:12,color:'#eaf0fc',boxShadow:'0 10px 25px #080e1a80'}} labelStyle={{color:'#eaf0fc',fontWeight:700,marginBottom:5}} itemStyle={{color:'#9fc1ff'}} cursor={{stroke:'#5778a4',strokeDasharray:'4 4'}}/>
            <Line type="linear" dataKey="value" stroke="#84b2ff" strokeWidth={2.5} dot={displayChartData.length===1?{r:4}:false} activeDot={{r:5,stroke:'#dceaff',strokeWidth:2,fill:'#639dff'}} isAnimationActive={false} name="Estimated 1RM"/>
          </LineChart>
        </ResponsiveContainer>
      </div>:<p className="empty">Complete some sets for this exercise to see your strength trend.</p>}
    </section>

    <section className="panel"><div className="between"><div><h2>Bodyweight log</h2><p className="muted">Use consistent morning weigh-ins; compare weekly averages.</p></div></div><div className="weightform"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/><input type="number" step="0.1" min="0" placeholder={`Weight (${units})`} value={weightEntry} onChange={e=>setWeightEntry(e.target.value)}/><button className="primary" onClick={()=>{if(Number(weightEntry)>0){patch(p=>({...p,weights:[...p.weights.filter(w=>w.date!==date),{date,weight:fromDisplayWeight(weightEntry,units)}]}));setWeightEntry('')}}}><Plus size={16}/> Save weight</button></div>{db.weights.length>0&&<div className="weightlist">{[...db.weights].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12).map(w=><div key={w.date}><span>{w.date}</span><b>{toDisplayWeight(w.weight,units,1)} {units}</b><button className="iconbtn subtle" onClick={()=>patch(p=>({...p,weights:p.weights.filter(x=>x.date!==w.date)}))}><Trash2 size={14}/></button></div>)}</div>}</section>
    <section className="panel"><h2>Workout history</h2>{finished.length===0?<p className="empty">Finish a workout to see it here.</p>:<div className="history">{finished.slice(0,25).map(s=><button key={s.id} onClick={()=>{setDate(s.date);setTab('today')}}><div><strong>{s.type}</strong><small>{s.date}</small></div><span>{s.exercises.reduce((n,e)=>n+e.sets.filter(x=>x.done).length,0)} completed sets →</span></button>)}</div>}</section>
  </>;
}

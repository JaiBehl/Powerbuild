import React,{useMemo,useState} from 'react';
import {LineChart,Line,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid} from 'recharts';
import {Plus,Trash2,Target} from 'lucide-react';
import {fromDisplayWeight,toDisplayWeight,unitName} from './units';

export default function ProgressTab({db,patch,date,setDate,setTab,weightEntry,setWeightEntry,history,chartLift,setChartLift,chartData,finished,latestWeight}){
  const units=unitName(db.settings.units);
  const goals=Array.isArray(db.strengthGoals)?db.strengthGoals:[];
  const [chartRange,setChartRange]=useState('6M');
  const [workoutYear,setWorkoutYear]=useState('all');
  const [workoutSearch,setWorkoutSearch]=useState('');
  const [visibleWorkoutCount,setVisibleWorkoutCount]=useState(30);
  // Include every dated session (completed and in-progress), not just the most
  // recent 25 finished sessions. Imported Apple Notes workouts live here too.
  const fullWorkoutHistory=useMemo(()=>[...db.sessions].sort((a,b)=>String(b.date).localeCompare(String(a.date))),[db.sessions]);
  const workoutYears=useMemo(()=>[...new Set(fullWorkoutHistory.map(s=>String(s.date||'').slice(0,4)).filter(y=>/^\d{4}$/.test(y)))].sort((a,b)=>b.localeCompare(a)),[fullWorkoutHistory]);
  const matchingWorkouts=useMemo(()=>{
    const query=workoutSearch.trim().toLowerCase();
    return fullWorkoutHistory.filter(s=>{
      if(workoutYear!=='all'&&!String(s.date||'').startsWith(workoutYear+'-'))return false;
      if(!query)return true;
      return [s.date,s.type,s.notes,...(Array.isArray(s.exercises)?s.exercises.map(e=>e.name):[])].some(x=>String(x||'').toLowerCase().includes(query));
    });
  },[fullWorkoutHistory,workoutYear,workoutSearch]);
  const visibleWorkouts=matchingWorkouts.slice(0,visibleWorkoutCount);
  const resetWorkoutPage=()=>setVisibleWorkoutCount(30);
  const [bodyweightRange,setBodyweightRange]=useState('6M');
  const [bodyweightYear,setBodyweightYear]=useState('all');
  const [bodyweightSearch,setBodyweightSearch]=useState('');
  const [visibleBodyweightCount,setVisibleBodyweightCount]=useState(30);
  const allBodyweightLogs=useMemo(()=>db.weights
    .map((entry,sourceIndex)=>({...entry,sourceIndex}))
    .filter(entry=>/^\\d{4}-\\d{2}-\\d{2}$/.test(String(entry.date||''))&&Number.isFinite(Number(entry.weight))&&Number(entry.weight)>0)
    .sort((a,b)=>b.date.localeCompare(a.date)||b.sourceIndex-a.sourceIndex),[db.weights]);
  const bodyweightYears=useMemo(()=>[...new Set(allBodyweightLogs.map(w=>w.date.slice(0,4)))].sort((a,b)=>b.localeCompare(a)),[allBodyweightLogs]);
  const matchingBodyweightLogs=useMemo(()=>{
    const query=bodyweightSearch.trim().toLowerCase();
    return allBodyweightLogs.filter(entry=>{
      if(bodyweightYear!=='all'&&!entry.date.startsWith(bodyweightYear+'-'))return false;
      if(!query)return true;
      return entry.date.includes(query)||String(toDisplayWeight(entry.weight,units,1)).includes(query);
    });
  },[allBodyweightLogs,bodyweightYear,bodyweightSearch,units]);
  const visibleBodyweightLogs=matchingBodyweightLogs.slice(0,visibleBodyweightCount);
  const resetBodyweightPage=()=>setVisibleBodyweightCount(30);
  const bodyweightChartData=useMemo(()=>{
    const all=[...allBodyweightLogs].reverse().map(entry=>({
      date:entry.date,
      value:toDisplayWeight(entry.weight,units,1),
    }));
    if(!all.length||bodyweightRange==='All')return all;
    const months={'3M':3,'6M':6,'1Y':12}[bodyweightRange]||6;
    const latest=new Date(all[all.length-1].date+'T12:00:00');
    latest.setMonth(latest.getMonth()-months);
    const cutoff=[latest.getFullYear(),String(latest.getMonth()+1).padStart(2,'0'),String(latest.getDate()).padStart(2,'0')].join('-');
    return all.filter(entry=>entry.date>=cutoff);
  },[allBodyweightLogs,units,bodyweightRange]);
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
  const formatAxisDate=(iso,range=chartRange)=>{
    const date=new Date(String(iso)+'T12:00:00');
    return Number.isNaN(date.getTime())?String(iso):date.toLocaleDateString('en-US',range==='All'?{month:'short',year:'2-digit'}:{month:'short',day:'numeric'});
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

    <section className="panel">
      <div className="between">
        <div><h2>Bodyweight log</h2><p className="muted">Browse all your weigh-ins across every year of training.</p></div>
        <span className="workout-history-total">{allBodyweightLogs.length} total weigh-ins</span>
      </div>
      <div className="weightform">
        <input type="date" aria-label="Bodyweight entry date" value={date} onChange={e=>setDate(e.target.value)}/>
        <input type="number" step="0.1" min="0" placeholder={'Weight ('+units+')'} value={weightEntry} onChange={e=>setWeightEntry(e.target.value)}/>
        <button className="primary" onClick={()=>{
          if(Number(weightEntry)>0){
            patch(p=>({...p,weights:[...p.weights.filter(w=>w.date!==date),{date,weight:fromDisplayWeight(weightEntry,units)}]}));
            setWeightEntry('');
          }
        }}><Plus size={16}/> Save weight</button>
      </div>
      {allBodyweightLogs.length===0?<p className="empty">No bodyweight entries yet. Save a weigh-in above or import your historical records.</p>:<>
        <div className="workout-history-filters">
          <label>Year
            <select aria-label="Filter bodyweight logs by year" value={bodyweightYear} onChange={e=>{setBodyweightYear(e.target.value);resetBodyweightPage()}}>
              <option value="all">All years</option>
              {bodyweightYears.map(year=><option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label>Search weigh-ins
            <input type="search" aria-label="Search bodyweight logs" placeholder="Date or weight" value={bodyweightSearch} onChange={e=>{setBodyweightSearch(e.target.value);resetBodyweightPage()}}/>
          </label>
        </div>
        {matchingBodyweightLogs.length===0?<p className="empty">No weigh-ins match this year or search. Try another filter.</p>:<>
          <div className="workout-history-meta">Showing {visibleBodyweightLogs.length} of {matchingBodyweightLogs.length} matching weigh-ins</div>
          <div className="weightlist bodyweight-history-list">
            {visibleBodyweightLogs.map(entry=><div key={entry.id||entry.date+'-'+entry.sourceIndex}>
              <span>{entry.date}</span>
              <b>{toDisplayWeight(entry.weight,units,1)} {units}</b>
              <button className="iconbtn subtle" title={'Delete weigh-in on '+entry.date} aria-label={'Delete weigh-in on '+entry.date} onClick={()=>{
                if(window.confirm('Delete the '+entry.date+' weigh-in?')){
                  patch(p=>({...p,weights:p.weights.filter((_,i)=>i!==entry.sourceIndex)}));
                }
              }}><Trash2 size={14}/></button>
            </div>)}
          </div>
          {visibleBodyweightCount<matchingBodyweightLogs.length&&<div className="workout-history-more">
            <button className="secondary" onClick={()=>setVisibleBodyweightCount(n=>n+30)}>Show 30 more weigh-ins</button>
          </div>}
        </>}
      </>}
    </section>

    <section className="panel">
      <div className="between trend-heading">
        <div><h2>Bodyweight trend</h2><p className="muted">Your recorded scale weight over time. Hover to see the full date and exact weight.</p></div>
        <span className="workout-history-total">{allBodyweightLogs.length} weigh-ins</span>
      </div>
      <div className="trend-controls">
        <div className="trend-range" role="group" aria-label="Bodyweight chart date range">
          {['3M','6M','1Y','All'].map(range=><button key={range} type="button" aria-pressed={bodyweightRange===range} className={bodyweightRange===range?'selected':''} onClick={()=>setBodyweightRange(range)}>{range}</button>)}
        </div>
        <span className="trend-caption">{bodyweightChartData.length} recorded {bodyweightChartData.length===1?'date':'dates'} · {units}</span>
      </div>
      {bodyweightChartData.length?<div className="chart trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={bodyweightChartData} margin={{top:14,right:18,bottom:8,left:0}}>
            <CartesianGrid vertical={false} stroke="#2a3b52" strokeDasharray="3 7"/>
            <XAxis dataKey="date" tickFormatter={iso=>formatAxisDate(iso,bodyweightRange)} interval="preserveStartEnd" minTickGap={42} tickMargin={12} tick={{fill:'#94aac6',fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis domain={['auto','auto']} tickCount={5} width={48} tickFormatter={v=>Number(v).toFixed(1)} tick={{fill:'#94aac6',fontSize:11}} axisLine={false} tickLine={false}/>
            <Tooltip labelFormatter={formatTooltipDate} formatter={v=>[Number(v).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+' '+units,'Bodyweight']} contentStyle={{background:'#17283f',border:'1px solid #416086',borderRadius:12,color:'#eaf0fc',boxShadow:'0 10px 25px #080e1a80'}} labelStyle={{color:'#eaf0fc',fontWeight:700,marginBottom:5}} itemStyle={{color:'#9fc1ff'}} cursor={{stroke:'#5778a4',strokeDasharray:'4 4'}}/>
            <Line type="linear" dataKey="value" stroke="#84b2ff" strokeWidth={2.5} dot={bodyweightChartData.length===1?{r:4}:false} activeDot={{r:5,stroke:'#dceaff',strokeWidth:2,fill:'#639dff'}} isAnimationActive={false} name="Bodyweight"/>
          </LineChart>
        </ResponsiveContainer>
      </div>:<p className="empty">Log a weigh-in to see your bodyweight trend.</p>}
    </section>

    <section className="panel">
      <div className="between"><div><h2>Workout history</h2><p className="muted">Browse every saved workout, including your imported sessions from earlier years.</p></div><span className="workout-history-total">{fullWorkoutHistory.length} total workouts</span></div>
      {fullWorkoutHistory.length===0?<p className="empty">No workouts logged yet. Start a workout or import your historical records in Settings &amp; backup.</p>:<>
        <div className="workout-history-filters">
          <label>Year
            <select aria-label="Filter workout history by year" value={workoutYear} onChange={e=>{setWorkoutYear(e.target.value);resetWorkoutPage()}}>
              <option value="all">All years</option>
              {workoutYears.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label>Search workouts
            <input type="search" aria-label="Search workout history" placeholder="Exercise, date, or notes" value={workoutSearch} onChange={e=>{setWorkoutSearch(e.target.value);resetWorkoutPage()}}/>
          </label>
        </div>
        {matchingWorkouts.length===0?<p className="empty">No workouts match this filter. Try another year or search.</p>:<>
          <div className="workout-history-meta">Showing {visibleWorkouts.length} of {matchingWorkouts.length} matching workouts</div>
          <div className="history workout-history-list">
            {visibleWorkouts.map((s,i)=><button key={s.id||s.date+'-'+i} onClick={()=>{setDate(s.date);setTab('today')}} title="Open this workout and its saved notes">
              <div><strong>{s.type||'Workout'}</strong><small>{s.date}</small></div>
              <span className="workout-history-stats">{Array.isArray(s.exercises)?s.exercises.length:0} exercises · {Array.isArray(s.exercises)?s.exercises.reduce((n,e)=>n+(Array.isArray(e.sets)?e.sets.filter(x=>x.done).length:0),0):0} completed sets</span>
            </button>)}
          </div>
          {visibleWorkoutCount<matchingWorkouts.length&&<div className="workout-history-more"><button className="secondary" onClick={()=>setVisibleWorkoutCount(n=>n+30)}>Show 30 more workouts</button></div>}
        </>}
      </>}
    </section>
  </>;
}

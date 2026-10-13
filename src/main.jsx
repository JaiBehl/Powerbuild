import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Dumbbell,CalendarDays,ChartNoAxesCombined,Settings as SettingsIcon,Target,Flame} from 'lucide-react';
import {workouts,initialSettings,isoToday,scheduledWorkout,createSession,e1rm} from './data';
import TrainTab from './TrainTab';
import ScheduleTab from './ScheduleTab';
import ProgressTab from './ProgressTab';
import SettingsTab from './SettingsTab';
import CalorieTracker,{calorieDefaults} from './CalorieTracker';
import './style.css';

const KEY='powerbuild-tracker-v1';
const cloneTemplates=()=>JSON.parse(JSON.stringify(workouts));

function load(){
  try{
    const x=JSON.parse(localStorage.getItem(KEY));
    if(x&&Array.isArray(x.sessions)) return {
      settings:{...initialSettings,...x.settings},
      sessions:x.sessions,
      weights:x.weights||[],
      calories:x.calories||[],
      calorieSettings:{...calorieDefaults,...x.calorieSettings},
      templates:x.templates||cloneTemplates(),
    };
  }catch{}
  try{
    const current=JSON.parse(localStorage.getItem('powerbuild-app-v1'));
    if(current){
      const currentWeight=Number(current.goal?.currentWeight||180);
      return {
        settings:{
          ...initialSettings,
          startWeight:currentWeight,
          targetWeight:Number(current.goal?.targetWeight||initialSettings.targetWeight),
          weightDeadline:current.goal?.deadline||initialSettings.weightDeadline,
          strengthDeadline:current.strengthGoals?.deadline||initialSettings.strengthDeadline,
        },
        sessions:[],
        weights:Array.isArray(current.bodyweightLogs)?current.bodyweightLogs:[],
        calories:[],
        calorieSettings:{
          ...calorieDefaults,
          milesWalked:Number(current.calorie?.walkMiles??calorieDefaults.milesWalked),
          milesRun:Number(current.calorie?.runMiles??calorieDefaults.milesRun),
          lifted:current.calorie?.lifted??calorieDefaults.lifted,
          liftHours:Number(current.calorie?.liftHours??calorieDefaults.liftHours),
          proteinPerLb:currentWeight?Number(current.calorie?.protein||currentWeight)/currentWeight:1,
          fatPerLb:currentWeight?Number(current.calorie?.fat||54)/currentWeight:.3,
        },
        templates:cloneTemplates(),
      };
    }
  }catch{}
  return null;
}

function download(filename,content,type){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function App(){
  const [db,setDb]=useState(()=>load()||{settings:initialSettings,sessions:[],weights:[],calories:[],calorieSettings:calorieDefaults,templates:cloneTemplates()});
  const [tab,setTab]=useState('today');
  const [date,setDate]=useState(isoToday());
  const [viewWeek,setViewWeek]=useState(0);
  const [chartLift,setChartLift]=useState('Barbell bench press');
  const [importError,setImportError]=useState('');
  const [showManual,setShowManual]=useState(false);
  const [manualType,setManualType]=useState('Push A');
  const [weightEntry,setWeightEntry]=useState('');
  const [calorieEntry,setCalorieEntry]=useState({calories:'',protein:'',carbs:'',fat:''});

  useEffect(()=>{localStorage.setItem(KEY,JSON.stringify(db))},[db]);
  const patch=(f)=>setDb(p=>typeof f==='function'?f(p):{...p,...f});
  const patchSettings=(obj)=>patch(p=>({...p,settings:{...p.settings,...obj}}));
  const scheduled=scheduledWorkout(date,db.settings);
  const session=db.sessions.find(s=>s.date===date);
  const updateSession=(fn)=>{if(!session)return;patch(p=>({...p,sessions:p.sessions.map(s=>s.id===session.id?fn(s):s)}))};
  const start=(type)=>{const s=createSession(type,date,db.templates||workouts);patch(p=>({...p,sessions:[...p.sessions.filter(x=>x.date!==date),s]}));setShowManual(false)};
  const changeDate=(days)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);setDate(d.toISOString().slice(0,10))};
  const weekDates=Array.from({length:7},(_,i)=>{const d=new Date(isoToday()+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7)+7*viewWeek+i);return d.toISOString().slice(0,10)});

  const history=useMemo(()=>{
    const m={};
    db.sessions.forEach(s=>s.exercises.forEach(e=>e.sets.forEach(v=>{
      if(v.done&&Number(v.weight)>0&&Number(v.reps)>0){
        const val=e1rm(v.weight,v.reps);
        if(val){m[e.name]??={};m[e.name][s.date]=Math.max(m[e.name][s.date]||0,val)}
      }
    })));
    return m;
  },[db.sessions]);
  const chartData=Object.entries(history[chartLift]||{}).sort(([a],[b])=>a.localeCompare(b)).map(([d,value])=>({date:d.slice(5),value:Math.round(value)}));
  const finished=db.sessions.filter(s=>s.finished).sort((a,b)=>b.date.localeCompare(a.date));
  const latestWeight=[...db.weights].sort((a,b)=>b.date.localeCompare(a.date))[0];

  const exportJson=()=>download('powerbuild-backup.json',JSON.stringify(db,null,2),'application/json');
  const exportCsv=()=>{
    const rows=[['Date','Workout','Exercise','Set','Weight','Reps','RPE','Set type','Completed']];
    db.sessions.forEach(s=>s.exercises.forEach(e=>e.sets.forEach((v,i)=>rows.push([s.date,s.type,e.name,i+1,v.weight,v.reps,v.rpe,v.tag,v.done]))));
    download('powerbuild-sets.csv',rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n'),'text/csv');
  };
  async function importJson(ev){
    try{
      const file=ev.target.files?.[0];if(!file)return;
      const x=JSON.parse(await file.text());
      if(!Array.isArray(x.sessions)||!Array.isArray(x.weights)||!x.settings)throw Error('Not a valid Powerbuild backup');
      if(!confirm('Replace your current data with this backup? Export your existing data first if you want to keep it.'))return;
      patch({settings:{...initialSettings,...x.settings},sessions:x.sessions,weights:x.weights,calories:x.calories||[],calorieSettings:{...calorieDefaults,...x.calorieSettings},templates:x.templates||cloneTemplates()});
      setImportError('');
    }catch(e){setImportError(e.message)}
    ev.target.value='';
  }

  const headings={
    today:['Workout logger','Log every set, track overload, and protect recovery.'],
    calendar:['Rolling PPL schedule','Five training days. Six sessions in continuous rotation.'],
    progress:['Strength & progress','See trends instead of guessing from individual sessions.'],
    calories:['Calorie & macro tracker','Calculate your daily targets and log nutrition.'],
    settings:['Preferences & backups','Your plan, goals, and local data.'],
  };
  const [title,subtitle]=headings[tab];

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Dumbbell size={24}/></div><div><strong>POWERBUILD</strong><small>STRENGTH × PHYSIQUE</small></div></div>
      <nav>{[['today',Dumbbell,'Train'],['calendar',CalendarDays,'Schedule'],['progress',ChartNoAxesCombined,'Progress'],['calories',Flame,'Calorie tracker'],['settings',SettingsIcon,'Settings & backup']].map(([id,Icon,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={19}/>{label}</button>)}</nav>
      <div className="side-foot">Your training data stays in this browser. Export backups regularly.</div>
    </aside>
    <main>
      <header><div><p className="eyebrow">POWERBUILD TRACKER</p><h1>{title}</h1><p className="muted">{subtitle}</p></div><span className="goalpill"><Target size={15}/> {db.settings.targetWeight} lb · {db.settings.weightDeadline}</span></header>
      {tab==='today'&&<TrainTab {...{db,patch,date,setDate,scheduled,session,updateSession,start,showManual,setShowManual,manualType,setManualType,changeDate}}/>}
      {tab==='calendar'&&<ScheduleTab {...{db,setTab,setDate,viewWeek,setViewWeek,weekDates}}/>}
      {tab==='progress'&&<ProgressTab {...{db,patch,date,setDate,setTab,weightEntry,setWeightEntry,history,chartLift,setChartLift,chartData,finished,latestWeight}}/>}
      {tab==='calories'&&<CalorieTracker {...{db,patch,date,setDate,entry:calorieEntry,setEntry:setCalorieEntry}}/>}
      {tab==='settings'&&<SettingsTab {...{db,patch,patchSettings,exportJson,exportCsv,importJson,importError,cloneTemplates}}/>}
      <footer>Powerbuild Tracker · Local-first workout log · Estimates are not medical or coaching guarantees.</footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);

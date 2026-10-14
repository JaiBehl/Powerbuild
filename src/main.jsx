import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Dumbbell,CalendarDays,ChartNoAxesCombined,Settings as SettingsIcon,Target,Flame} from 'lucide-react';
import {workouts,initialSettings,isoToday,scheduledWorkout,createSession,e1rm} from './data';
import TrainTab from './TrainTab';
import ScheduleTab from './ScheduleTab';
import ProgressTab from './ProgressTab';
import SettingsTab from './SettingsTab';
import CalorieTracker,{calorieDefaults} from './CalorieTracker';
import ProfileSwitcher from './ProfileSwitcher';
import {ensureProfiles,loadProfileDb,profileDataKey,removeProfileDb,saveProfileDb,saveProfileMeta} from './profiles';
import './style.css';

const LEGACY_KEY='powerbuild-tracker-v1';
const cloneTemplates=()=>JSON.parse(JSON.stringify(workouts));

function normalizeDb(x={}){
  return {
    settings:{...initialSettings,...(x.settings||{})},
    sessions:Array.isArray(x.sessions)?x.sessions:[],
    weights:Array.isArray(x.weights)?x.weights:[],
    calories:Array.isArray(x.calories)?x.calories:[],
    calorieSettings:{...calorieDefaults,...(x.calorieSettings||{})},
    templates:Array.isArray(x.templates)?x.templates:cloneTemplates(),
  };
}

const freshDb=()=>normalizeDb({});

function loadLegacy(){
  try{
    const x=JSON.parse(localStorage.getItem(LEGACY_KEY));
    if(x&&Array.isArray(x.sessions)) return normalizeDb(x);
  }catch{}
  try{
    const current=JSON.parse(localStorage.getItem('powerbuild-app-v1'));
    if(current){
      const currentWeight=Number(current.goal?.currentWeight||180);
      return normalizeDb({
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
      });
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

const initialProfileState=ensureProfiles(loadLegacy,freshDb);

function App(){
  const [profileState,setProfileState]=useState(()=>initialProfileState);
  const [db,setDb]=useState(()=>normalizeDb(loadProfileDb(initialProfileState.activeProfileId,freshDb)));
  const [tab,setTab]=useState('today');
  const [date,setDate]=useState(isoToday());
  const [viewWeek,setViewWeek]=useState(0);
  const [chartLift,setChartLift]=useState('Barbell bench press');
  const [importError,setImportError]=useState('');
  const [showManual,setShowManual]=useState(false);
  const [manualType,setManualType]=useState('Push A');
  const [weightEntry,setWeightEntry]=useState('');
  const [calorieEntry,setCalorieEntry]=useState({calories:'',protein:'',carbs:'',fat:''});

  useEffect(()=>{saveProfileDb(profileState.activeProfileId,db)},[db,profileState.activeProfileId]);
  useEffect(()=>{saveProfileMeta(profileState)},[profileState]);

  const activeProfile=profileState.profiles.find(p=>p.id===profileState.activeProfileId)||profileState.profiles[0];
  const patch=(f)=>setDb(p=>typeof f==='function'?f(p):{...p,...f});
  const patchSettings=(obj)=>patch(p=>({...p,settings:{...p.settings,...obj}}));
  const scheduled=scheduledWorkout(date,db.settings);
  const session=db.sessions.find(s=>s.date===date);
  const updateSession=(fn)=>{if(!session)return;patch(p=>({...p,sessions:p.sessions.map(s=>s.id===session.id?fn(s):s)}))};
  const start=(type)=>{const s=createSession(type,date,db.templates||workouts);patch(p=>({...p,sessions:[...p.sessions.filter(x=>x.date!==date),s]}));setShowManual(false)};
  const changeDate=(days)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);setDate(d.toISOString().slice(0,10))};
  const weekDates=Array.from({length:7},(_,i)=>{const d=new Date(isoToday()+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7)+7*viewWeek+i);return d.toISOString().slice(0,10)});

  function resetProfileUi(){
    setTab('today');
    setDate(isoToday());
    setViewWeek(0);
    setShowManual(false);
    setManualType('Push A');
    setWeightEntry('');
    setCalorieEntry({calories:'',protein:'',carbs:'',fat:''});
    setImportError('');
  }

  function switchProfile(id){
    if(id===profileState.activeProfileId||!profileState.profiles.some(p=>p.id===id))return;
    saveProfileDb(profileState.activeProfileId,db);
    const next=normalizeDb(loadProfileDb(id,freshDb));
    setDb(next);
    setProfileState(p=>({...p,activeProfileId:id}));
    resetProfileUi();
  }

  function createProfile(name){
    const clean=String(name||'').trim();
    if(!clean)return false;
    if(profileState.profiles.some(p=>p.name.toLowerCase()===clean.toLowerCase())){
      alert('A profile with that name already exists.');
      return false;
    }
    saveProfileDb(profileState.activeProfileId,db);
    const id=(globalThis.crypto?.randomUUID?.()||`profile-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
    const next=freshDb();
    saveProfileDb(id,next);
    setProfileState(p=>({profiles:[...p.profiles,{id,name:clean,createdAt:new Date().toISOString()}],activeProfileId:id}));
    setDb(next);
    resetProfileUi();
    return true;
  }

  function renameProfile(id){
    const profile=profileState.profiles.find(p=>p.id===id);
    if(!profile)return;
    const next=prompt('Profile name',profile.name);
    if(next===null)return;
    const clean=next.trim();
    if(!clean)return;
    if(profileState.profiles.some(p=>p.id!==id&&p.name.toLowerCase()===clean.toLowerCase())){
      alert('A profile with that name already exists.');
      return;
    }
    setProfileState(p=>({...p,profiles:p.profiles.map(x=>x.id===id?{...x,name:clean}:x)}));
  }

  function deleteProfile(id){
    if(id===profileState.activeProfileId||profileState.profiles.length<=1)return;
    const profile=profileState.profiles.find(p=>p.id===id);
    if(!profile)return;
    if(!confirm(`Delete ${profile.name} and all of its local Powerbuild data? This cannot be undone without that profile's backup.`))return;
    removeProfileDb(id);
    setProfileState(p=>({...p,profiles:p.profiles.filter(x=>x.id!==id)}));
  }

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

  const safeProfileName=(activeProfile?.name||'profile').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'profile';
  const exportJson=()=>download(`powerbuild-${safeProfileName}-backup.json`,JSON.stringify(db,null,2),'application/json');
  const exportCsv=()=>{
    const rows=[['Date','Workout','Exercise','Set','Weight','Reps','RPE','Set type','Completed']];
    db.sessions.forEach(s=>s.exercises.forEach(e=>e.sets.forEach((v,i)=>rows.push([s.date,s.type,e.name,i+1,v.weight,v.reps,v.rpe,v.tag,v.done]))));
    download(`powerbuild-${safeProfileName}-sets.csv`,rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n'),'text/csv');
  };
  async function importJson(ev){
    try{
      const file=ev.target.files?.[0];if(!file)return;
      const x=JSON.parse(await file.text());
      if(!Array.isArray(x.sessions)||!Array.isArray(x.weights)||!x.settings)throw Error('Not a valid Powerbuild backup');
      if(!confirm(`Replace ${activeProfile?.name||'this profile'}'s current data with this backup? Export its existing data first if you want to keep it.`))return;
      setDb(normalizeDb(x));
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
      <ProfileSwitcher profiles={profileState.profiles} activeId={profileState.activeProfileId} onSwitch={switchProfile} onCreate={createProfile} onRename={renameProfile} onDelete={deleteProfile}/>
      <div className="side-foot">Profiles and training data stay in this browser. Export backups regularly.</div>
    </aside>
    <main>
      <header><div><p className="eyebrow">POWERBUILD TRACKER</p><h1>{title}</h1><p className="muted">{subtitle}</p></div><span className="goalpill"><Target size={15}/> {db.settings.targetWeight} lb · {db.settings.weightDeadline}</span></header>
      {tab==='today'&&<TrainTab {...{db,patch,date,setDate,scheduled,session,updateSession,start,showManual,setShowManual,manualType,setManualType,changeDate}}/>}
      {tab==='calendar'&&<ScheduleTab {...{db,setTab,setDate,viewWeek,setViewWeek,weekDates}}/>}
      {tab==='progress'&&<ProgressTab {...{db,patch,date,setDate,setTab,weightEntry,setWeightEntry,history,chartLift,setChartLift,chartData,finished,latestWeight}}/>}
      {tab==='calories'&&<CalorieTracker {...{db,patch,date,setDate,entry:calorieEntry,setEntry:setCalorieEntry}}/>}
      {tab==='settings'&&<SettingsTab {...{db,patch,patchSettings,exportJson,exportCsv,importJson,importError,cloneTemplates}} profileName={activeProfile?.name||'My profile'}/>} 
      <footer>Powerbuild Tracker · Local-first workout log · Estimates are not medical or coaching guarantees.</footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);

import {PanelScopeContext} from './panelScope';
import {saveRecoveryPoint,listRecoveryPoints} from './recovery';
import {validateProfileDb,removesData} from './backupSafety';
import {isISODate,addCalendarDays,startOfWeek} from './dates';
import {buildStrengthHistory,resolveExerciseName} from './exerciseCatalog';
import {normalizeDayPlans,normalizeCalorieSettings} from './nutrition';
import {normalizeTemplates} from './workoutOperations';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Dumbbell,CalendarDays,ChartNoAxesCombined,Settings as SettingsIcon,Target,Flame} from 'lucide-react';
import {workouts,initialSettings,legacyStrengthGoals,isoToday,scheduledWorkout,createSession,e1rm} from './data';
import TrainTab from './TrainTab';
import ScheduleTab from './ScheduleTab';
import ProgressTab from './ProgressTab';
import SettingsTab from './SettingsTab';
import CalorieTracker,{calorieDefaults} from './CalorieTracker';
import ProfileSwitcher from './ProfileSwitcher';
import {useCloudSync,CloudPanel} from './cloudSync';
import {validateHistoricalImport,mergeHistoricalImport} from './historicalImport';
import {ensureProfiles,loadProfileDb,removeProfileDb,saveProfileDb,saveProfileMeta,saveWorkspaceSnapshot} from './profiles';
import {toDisplayWeight,unitName} from './units';
import './style.css';

const LEGACY_KEY='powerbuild-tracker-v1';
const cloneTemplates=()=>JSON.parse(JSON.stringify(workouts));

function normalizeDb(x={},options={}){
  const incomingSettings={...initialSettings,...(x.settings||{})};
  const hasExplicitGoals=Array.isArray(x.strengthGoals);
  return normalizeDayPlans({
    settings:incomingSettings,
    strengthGoals:hasExplicitGoals?x.strengthGoals:(options.migrateLegacyGoals?legacyStrengthGoals(incomingSettings.strengthDeadline):[]),
    sessions:Array.isArray(x.sessions)?x.sessions:[],
    weights:Array.isArray(x.weights)?x.weights:[],
    calories:Array.isArray(x.calories)?x.calories:[],
    savedFoods:Array.isArray(x.savedFoods)?x.savedFoods:[],
    exerciseAliases:x.exerciseAliases&&typeof x.exerciseAliases==='object'&&!Array.isArray(x.exerciseAliases)?x.exerciseAliases:{},
    calorieSettings:normalizeCalorieSettings(x.calorieSettings||{}),
    templates:normalizeTemplates(x.templates&&typeof x.templates==='object'&&!Array.isArray(x.templates)?x.templates:cloneTemplates()),
  });
}

const freshDb=()=>normalizeDb({strengthGoals:[]});

function loadLegacy(){
  try{
    const x=JSON.parse(localStorage.getItem(LEGACY_KEY));
    if(x&&Array.isArray(x.sessions)) return normalizeDb(x,{migrateLegacyGoals:true});
  }catch{}
  try{
    const current=JSON.parse(localStorage.getItem('powerbuild-app-v1'));
    if(current){
      const currentWeight=Number(current.goal?.currentWeight||180);
      const strengthDeadline=current.strengthGoals?.deadline||initialSettings.strengthDeadline;
      const strengthGoals=[
        {id:'legacy-squat-goal',exercise:'Barbell back squat',targetWeight:Number(current.strengthGoals?.squat||405),deadline:strengthDeadline},
        {id:'legacy-bench-goal',exercise:'Touch-and-go bench press',targetWeight:Number(current.strengthGoals?.bench||315),deadline:strengthDeadline},
        {id:'legacy-ohp-goal',exercise:'Supported seated barbell OHP',targetWeight:Number(current.strengthGoals?.ohp||225),deadline:strengthDeadline},
      ];
      return normalizeDb({
        settings:{
          ...initialSettings,
          startWeight:currentWeight,
          targetWeight:Number(current.goal?.targetWeight||initialSettings.targetWeight),
          weightDeadline:current.goal?.deadline||initialSettings.weightDeadline,
          strengthDeadline,
        },
        strengthGoals,
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
  const [db,setDb]=useState(()=>normalizeDb(loadProfileDb(initialProfileState.activeProfileId,freshDb),{migrateLegacyGoals:initialProfileState.activeProfileId==='primary'}));
  const dbRef=useRef(db);dbRef.current=db;
  const [storageError,setStorageError]=useState('');
  const [undoPoint,setUndoPoint]=useState(null);
  const [tab,setTab]=useState('today');
  const [date,setDateState]=useState(isoToday());
  const setDate=value=>{if(isISODate(value))setDateState(value);};
  const [viewWeek,setViewWeek]=useState(0);
  const [chartLift,setChartLift]=useState('Touch-and-go bench press');
  const [importError,setImportError]=useState('');
  const [historyImportStatus,setHistoryImportStatus]=useState('');
  const [showManual,setShowManual]=useState(false);
  const [manualType,setManualType]=useState('Push A');
  const [weightEntry,setWeightEntry]=useState('');
  const [calorieEntry,setCalorieEntry]=useState({name:'',meal:'Breakfast',servings:'1',calories:'',protein:'',carbs:'',fat:''});

  function applyCloudSnapshot(snapshot,options={}){
    if(!snapshot?.profileState?.profiles?.length||!snapshot.profileData)throw Error('Invalid cloud data');
    const meta=snapshot.profileState;
    const active=meta.profiles.some(p=>p.id===meta.activeProfileId)?meta.activeProfileId:meta.profiles[0].id;
    const nextMeta={...meta,activeProfileId:active},data=Object.fromEntries(meta.profiles.map(p=>[p.id,normalizeDb(snapshot.profileData[p.id]||freshDb())]));
    saveWorkspaceSnapshot(nextMeta,data);
    setProfileState(nextMeta);dbRef.current=data[active];setDb(data[active]);setUndoPoint(null);
    if(!options.preserveUi)resetProfileUi();
  }

  const cloud=useCloudSync({db,profileState,applySnapshot:applyCloudSnapshot});

  useEffect(()=>{try{saveProfileDb(profileState.activeProfileId,db);saveProfileMeta(profileState);setStorageError('');}catch(e){setStorageError('Changes could not be saved on this device. Keep this page open and export a backup. '+e.message);}},[db,profileState]);
  const activeProfile=profileState.profiles.find(p=>p.id===profileState.activeProfileId)||profileState.profiles[0];
  const patch=(change,options={})=>{
    try{
      const before=dbRef.current;let next=typeof change==='function'?change(before):{...before,...change};
      if(options.validate)next=normalizeDb(validateProfileDb(next));
      if(options.checkpoint||removesData(before,next)){
        const point=saveRecoveryPoint('profile:'+profileState.activeProfileId,options.checkpoint||'Before removing profile data',before);
        setUndoPoint({id:point.id,profileId:profileState.activeProfileId,expected:JSON.stringify(next)});
      }else if(JSON.stringify(before)!==JSON.stringify(next))setUndoPoint(null);
      dbRef.current=next;setDb(next);return true;
    }catch(e){setStorageError(e.message);return false;}
  };
  const workspaceSnapshot=()=>({profileState,profileData:Object.fromEntries(profileState.profiles.map(p=>[p.id,p.id===profileState.activeProfileId?dbRef.current:loadProfileDb(p.id,freshDb)]))});
  const restoreWorkspace=point=>{if(!point?.data?.profileState||!point.data.profileData)throw Error('Invalid all-profile recovery copy.');Object.values(point.data.profileData).forEach(validateProfileDb);saveRecoveryPoint('workspace','Before all-profile restore',workspaceSnapshot());applyCloudSnapshot(point.data);};
  const undo=()=>{
    try{
      if(!undoPoint||undoPoint.profileId!==profileState.activeProfileId||JSON.stringify(dbRef.current)!==undoPoint.expected){setUndoPoint(null);return;}
      const point=listRecoveryPoints('profile:'+profileState.activeProfileId).find(p=>p.id===undoPoint.id);
      if(!point)throw Error('Recovery copy is no longer available.');
      const next=normalizeDb(validateProfileDb(point.data));saveRecoveryPoint('profile:'+profileState.activeProfileId,'Before undo',dbRef.current);dbRef.current=next;setDb(next);setUndoPoint(null);
    }catch(e){setStorageError(e.message);}
  };
  const patchSettings=(obj)=>patch(p=>({...p,settings:{...p.settings,...obj}}));
  const scheduled=scheduledWorkout(date,db.settings);
  const session=db.sessions.find(s=>s.date===date);
  const updateSession=(fn)=>{if(!session)return;patch(p=>({...p,sessions:p.sessions.map(s=>s.id===session.id?fn(s):s)}))};
  const start=(type)=>{const s=createSession(type,date,db.templates||workouts);patch(p=>({...p,sessions:[...p.sessions.filter(x=>x.date!==date),s]}));setShowManual(false)};
  const changeDate=days=>setDate(addCalendarDays(date,days));
  const weekDates=Array.from({length:7},(_,i)=>addCalendarDays(startOfWeek(isoToday()),7*viewWeek+i));

  function resetProfileUi(){
    setUndoPoint(null);
    setTab('today');
    setDate(isoToday());
    setViewWeek(0);
    setShowManual(false);
    setManualType('Push A');
    setWeightEntry('');
    setCalorieEntry({name:'',meal:'Breakfast',servings:'1',calories:'',protein:'',carbs:'',fat:''});
    setImportError('');
    setHistoryImportStatus('');
  }

  function switchProfile(id){
    if(id===profileState.activeProfileId||!profileState.profiles.some(p=>p.id===id))return;
    try{saveProfileDb(profileState.activeProfileId,db);}catch(e){setStorageError('Could not switch profiles: '+e.message);return;}
    const next=normalizeDb(loadProfileDb(id,freshDb),{migrateLegacyGoals:id==='primary'});
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
    try{saveProfileDb(profileState.activeProfileId,db);}catch(e){setStorageError(e.message);return false;}
    const id=(globalThis.crypto?.randomUUID?.()||`profile-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
    const next=freshDb();
    try{saveProfileDb(id,next);}catch(e){setStorageError(e.message);return false;}
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
    try{saveRecoveryPoint('workspace','Before deleting '+profile.name,workspaceSnapshot());removeProfileDb(id);}catch(e){setStorageError(e.message);return;}
    setProfileState(p=>({...p,profiles:p.profiles.filter(x=>x.id!==id)}));
  }

  const history=useMemo(()=>buildStrengthHistory(db.sessions,db.exerciseAliases),[db.sessions,db.exerciseAliases]);
  const chartData=Object.entries(history[resolveExerciseName(chartLift,db.exerciseAliases)]||{}).sort(([a],[b])=>a.localeCompare(b)).map(([d,value])=>({date:d,value}));
  const finished=db.sessions.filter(s=>s.finished).sort((a,b)=>b.date.localeCompare(a.date));
  const latestWeight=[...db.weights].sort((a,b)=>b.date.localeCompare(a.date))[0];

  const safeProfileName=(activeProfile?.name||'profile').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'profile';
  const exportJson=()=>download(`powerbuild-${safeProfileName}-backup.json`,JSON.stringify(db,null,2),'application/json');
  const exportCsv=()=>{
    const unit=unitName(db.settings.units);
    const rows=[['Date','Workout','Exercise','Set',`Weight (${unit})`,'Reps','RPE','Set type','Completed']];
    db.sessions.forEach(s=>s.exercises.forEach(e=>e.sets.forEach((v,i)=>rows.push([s.date,s.type,e.name,i+1,v.weight===''?'':toDisplayWeight(v.weight,db.settings.units,2),v.reps,v.rpe,v.tag,v.done]))));
    download(`powerbuild-${safeProfileName}-sets.csv`,rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n'),'text/csv');
  };
  async function importJson(ev){
    try{
      const file=ev.target.files?.[0];if(!file)return;
      if(file.size>5000000)throw Error('Backup exceeds the 5 MB import limit.');
      const x=validateProfileDb(JSON.parse(await file.text()));
      if(!confirm(`Replace ${activeProfile?.name||'this profile'}'s current data with this backup? Export its existing data first if you want to keep it.`))return;
      if(!patch(()=>normalizeDb(x),{checkpoint:'Before profile backup import'}))throw Error('Import blocked because a recovery copy could not be saved.');
      setImportError('');
    }catch(e){setImportError(e.message)}
    ev.target.value='';
  }

  async function importHistoricalJson(ev){
    try{
      const file=ev.target.files?.[0];
      if(!file)return;
      if(file.size>5_000_000)throw Error('File exceeds the 5 MB historical-import limit.');
      const incoming=validateHistoricalImport(JSON.parse(await file.text()));
      const proposed=mergeHistoricalImport(db,incoming);
      const count=incoming.sessions.length;
      if(!confirm('Merge '+count+' dated workouts and '+incoming.weights.length+
        ' bodyweight entries into '+(activeProfile?.name||'this profile')+
        '? Existing data will be kept. Export a profile backup first if needed.'))return;
      setDb(p=>mergeHistoricalImport(p,incoming).db);
      const c=proposed.counts;
      setHistoryImportStatus('Imported '+c.newSessions+' new workout dates, '+
        c.addedExercises+' exercise entries and '+c.addedWeights+
        ' bodyweight measurements. '+c.skippedExistingExercises+
        ' existing exercises and '+c.skippedExistingWeights+
        ' same-day weight entries were left unchanged. Re-importing is safe.');
    }catch(e){setHistoryImportStatus('Import failed: '+String(e?.message||e));}
    finally{ev.target.value='';}
  }

  const headings={
    today:['Workout logger','Log every set, track overload, and protect recovery.'],
    calendar:['Rolling PPL schedule',`${db.settings.schedule.length} training days. Six sessions in continuous rotation.`],
    progress:['Strength & progress','See trends instead of guessing from individual sessions.'],
    calories:['Calorie & macro tracker','Calculate your daily targets and log nutrition.'],
    settings:['Preferences & backups','Your plan, goals, and local data.'],
  };
  const [title,subtitle]=headings[tab];
  const unit=unitName(db.settings.units);

  return <PanelScopeContext.Provider value={[profileState.activeProfileId,tab]}><div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><Dumbbell size={24}/></div><div><strong>POWERBUILD</strong><small>STRENGTH × PHYSIQUE</small></div></div>
      <nav>{[['today',Dumbbell,'Train'],['calendar',CalendarDays,'Schedule'],['progress',ChartNoAxesCombined,'Progress'],['calories',Flame,'Calorie tracker'],['settings',SettingsIcon,'Settings & backup']].map(([id,Icon,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={19}/>{label}</button>)}</nav>
      <ProfileSwitcher profiles={profileState.profiles} activeId={profileState.activeProfileId} onSwitch={switchProfile} onCreate={createProfile} onRename={renameProfile} onDelete={deleteProfile}/>
      <CloudPanel cloud={cloud}/>
      <div className="side-foot">Data is saved on this device first. Sign in to sync across devices. Keep a backup.</div>
    </aside>
    <main>
      {storageError&&<div className="recovery-banner warning" role="alert"><span>{storageError}</span><button className="secondary" onClick={exportJson}>Export current profile</button></div>}
      {undoPoint&&<div className="recovery-banner" role="status"><span>A recovery copy was saved before this change.</span><button className="secondary" onClick={undo}>Undo last change</button><button className="textbtn" onClick={()=>setUndoPoint(null)}>Dismiss</button></div>}
      <header><div><p className="eyebrow">POWERBUILD TRACKER</p><h1>{title}</h1><p className="muted">{subtitle}</p></div><span className="goalpill"><Target size={15}/> {toDisplayWeight(db.settings.targetWeight,db.settings.units,1)} {unit} · {db.settings.weightDeadline}</span></header>
      {tab==='today'&&<TrainTab {...{db,patch,date,setDate,scheduled,session,updateSession,start,showManual,setShowManual,manualType,setManualType,changeDate}}/>}
      {tab==='calendar'&&<ScheduleTab {...{db,setTab,setDate,viewWeek,setViewWeek,weekDates}}/>}
      {tab==='progress'&&<ProgressTab {...{db,patch,date,setDate,setTab,weightEntry,setWeightEntry,history,chartLift,setChartLift,chartData,finished,latestWeight}}/>}
      {tab==='calories'&&<CalorieTracker {...{db,patch,date,setDate,entry:calorieEntry,setEntry:setCalorieEntry}}/>}
      {tab==='settings'&&<SettingsTab {...{db,patch,patchSettings,exportJson,exportCsv,importJson,importError,cloneTemplates,importHistoricalJson,historyImportStatus}} onRestoreWorkspace={restoreWorkspace} profileId={profileState.activeProfileId} profileName={activeProfile?.name||'My profile'} cloudEnabled={!!cloud.user&&['synced','saving'].includes(cloud.status)}/>} 
      <footer>Powerbuild Tracker · Local-first workout log · Estimates are not medical or coaching guarantees.</footer>
    </main>
  </div></PanelScopeContext.Provider>;
}

createRoot(document.getElementById('root')).render(<App/>);

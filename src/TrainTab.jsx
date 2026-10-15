import React,{useState} from 'react';
import {Dumbbell,Plus,Trash2,Check,ChevronLeft,ChevronRight,Pencil} from 'lucide-react';
import {cycle,workouts,isoToday} from './data';
import {fromDisplayWeight,toDisplayWeight,unitName} from './units';

export default function TrainTab({db,patch,date,setDate,scheduled,session,updateSession,start,showManual,setShowManual,manualType,setManualType,changeDate}){
  const [newExerciseName,setNewExerciseName]=useState('');
  const units=unitName(db.settings.units);
  const allSets=session?.exercises.flatMap(e=>e.sets)||[];
  const completed=allSets.filter(x=>x.done).length;
  const total=allSets.length;
  const totalVolumeLb=session?.exercises.reduce((a,e)=>a+e.sets.reduce((b,s)=>b+(s.done?Number(s.weight)*Number(s.reps)||0:0),0),0)||0;
  const totalVolume=toDisplayWeight(totalVolumeLb,units,0);
  const editEx=(ei,fn)=>updateSession(s=>({...s,exercises:s.exercises.map((e,i)=>i===ei?fn(e):e)}));
  const setCell=(ei,si,key,value)=>updateSession(s=>({...s,exercises:s.exercises.map((e,i)=>i!==ei?e:{...e,sets:e.sets.map((v,j)=>j!==si?v:{...v,[key]:value})})}));
  const cloneTemplates=()=>JSON.parse(JSON.stringify(workouts));

  const addExercise=()=>{
    const name=newExerciseName.trim();
    if(!name||!session)return;
    const template=[name,3,'8–12','1–2 RIR','accessory'];
    const exercise={id:'custom-'+Date.now(),name,range:'8–12',target:'1–2 RIR',kind:'accessory',sets:Array.from({length:3},()=>({weight:'',reps:'',rpe:'',done:false,tag:''}))};
    patch(p=>({...p,templates:{...(p.templates||cloneTemplates()),[session.type]:[...((p.templates||workouts)[session.type]||[]),template]},sessions:p.sessions.map(s=>s.id===session.id?{...s,exercises:[...s.exercises,exercise]}:s)}));
    setNewExerciseName('');
  };
  const editExercise=(ei)=>{
    if(!session)return;
    const ex=session.exercises[ei];
    const name=prompt('Exercise name',ex.name);if(name===null||!name.trim())return;
    const range=prompt('Rep range',ex.range||'8–12');if(range===null)return;
    const target=prompt('Target / effort',ex.target||'1–2 RIR');if(target===null)return;
    patch(p=>{
      const templates=p.templates||cloneTemplates();
      const currentTemplate=[...(templates[session.type]||[])];
      const existing=currentTemplate[ei]||[ex.name,Math.max(1,ex.sets.length),ex.range||'8–12',ex.target||'1–2 RIR',ex.kind||'accessory'];
      currentTemplate[ei]=[name.trim(),existing[1]||Math.max(1,ex.sets.length),range.trim()||'8–12',target.trim()||'1–2 RIR',existing[4]||ex.kind||'accessory'];
      return {...p,templates:{...templates,[session.type]:currentTemplate},sessions:p.sessions.map(s=>s.id===session.id?{...s,exercises:s.exercises.map((e,i)=>i===ei?{...e,name:name.trim(),range:range.trim()||'8–12',target:target.trim()||'1–2 RIR'}:e)}:s)};
    });
  };
  const removeExercise=(ei)=>{
    if(!session)return;
    const ex=session.exercises[ei];
    if(!confirm(`Remove ${ex.name} from ${session.type}?`))return;
    patch(p=>{const templates=p.templates||cloneTemplates();return {...p,templates:{...templates,[session.type]:(templates[session.type]||[]).filter((_,i)=>i!==ei)},sessions:p.sessions.map(s=>s.id===session.id?{...s,exercises:s.exercises.filter((_,i)=>i!==ei)}:s)}});
  };

  return <>
    <div className="datebar"><button className="iconbtn" onClick={()=>changeDate(-1)}><ChevronLeft/></button><input aria-label="Workout date" type="date" value={date} onChange={e=>setDate(e.target.value)}/><button className="iconbtn" onClick={()=>changeDate(1)}><ChevronRight/></button><button className="secondary" onClick={()=>setDate(isoToday())}>Today</button><span className="spacer"/><span className="muted">Scheduled: <b>{scheduled||'Rest day'}</b></span></div>
    {!session?<div className="panel hero"><div className="heroicon"><Dumbbell size={28}/></div><h2>{scheduled||'Recovery day'}</h2><p>{scheduled?'Ready to train? Start this session to record every working set.':'Your schedule has a rest day. You can still log a workout manually.'}</p>{scheduled&&<button className="primary" onClick={()=>start(scheduled)}><Plus size={17}/> Start {scheduled}</button>}<button className="textbtn" onClick={()=>setShowManual(!showManual)}>{showManual?'Hide options':'Start another workout'}</button>{showManual&&<div className="manual"><select value={manualType} onChange={e=>setManualType(e.target.value)}>{cycle.map(c=><option key={c}>{c}</option>)}</select><button className="secondary" onClick={()=>start(manualType)}>Start selected</button></div>}</div>:<>
      <div className="summary"><div className="metric"><small>SESSION</small><strong>{session.type}</strong></div><div className="metric"><small>SETS COMPLETED</small><strong>{completed}<span> / {total}</span></strong></div><div className="metric"><small>VOLUME</small><strong>{Number(totalVolume||0).toLocaleString()} <span>{units}</span></strong></div><div className="metric"><small>STATUS</small><strong>{session.finished?'Finished':'In progress'}</strong></div></div>
      {session.exercises.map((e,ei)=><section className="panel exercise" key={e.id??ei}><div className="exhead"><div><h3>{e.name}</h3><p>{e.range} reps · {e.target}</p></div><div className="exactions"><button className="iconbtn subtle" title="Add a set" onClick={()=>editEx(ei,x=>({...x,sets:[...x.sets,{weight:'',reps:'',rpe:'',done:false,tag:''}]}))}><Plus size={18}/></button><button className="iconbtn subtle" title="Edit exercise" onClick={()=>editExercise(ei)}><Pencil size={15}/></button><button className="iconbtn subtle" title="Remove exercise" onClick={()=>removeExercise(ei)}><Trash2 size={15}/></button></div></div><div className="settable"><div className="setrow headings"><span>SET</span><span>WEIGHT ({units})</span><span>REPS</span><span>RPE</span><span>DONE</span><span></span></div>{e.sets.map((v,si)=><div className={'setrow '+(v.done?'isdone':'')} key={si}><span className="setnum">{si+1}{v.tag&&<small>{v.tag}</small>}</span><input type="number" min="0" step={units==='kg'?'0.5':'2.5'} placeholder="—" value={toDisplayWeight(v.weight,units,1)} onChange={ev=>setCell(ei,si,'weight',fromDisplayWeight(ev.target.value,units))}/><input type="number" min="0" step="1" placeholder="—" value={v.reps} onChange={ev=>setCell(ei,si,'reps',ev.target.value)}/><input type="number" min="1" max="10" step="0.5" placeholder="—" value={v.rpe} onChange={ev=>setCell(ei,si,'rpe',ev.target.value)}/><button className={'checkbtn '+(v.done?'checked':'')} onClick={()=>setCell(ei,si,'done',!v.done)} title="Mark set completed"><Check size={18}/></button><button className="iconbtn subtle" title="Remove set" onClick={()=>editEx(ei,x=>({...x,sets:x.sets.filter((_,i)=>i!==si)}))}><Trash2 size={15}/></button></div>)}</div></section>)}
      <section className="panel addexercise"><div><h3>Add exercise</h3><p className="muted">Add any exercise to this workout template. New sessions of {session.type} will keep it.</p></div><div className="manual"><input aria-label="New exercise name" placeholder="Exercise name" value={newExerciseName} onChange={e=>setNewExerciseName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addExercise()}}/><button className="secondary" onClick={addExercise}><Plus size={16}/> Add exercise</button></div></section>
      <section className="panel"><h3>Session notes</h3><textarea placeholder="Sleep, fatigue, technique, soreness, sticking points..." value={session.notes||''} onChange={e=>updateSession(s=>({...s,notes:e.target.value}))}/><div className="actions"><button className="primary" onClick={()=>updateSession(s=>({...s,finished:!s.finished}))}><Check size={17}/>{session.finished?'Reopen session':'Finish workout'}</button><button className="danger" onClick={()=>{if(confirm('Delete this workout and all its logged sets?'))patch(p=>({...p,sessions:p.sessions.filter(s=>s.id!==session.id)}))}}><Trash2 size={16}/> Delete workout</button></div></section>
    </>}
  </>;
}

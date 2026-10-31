import ResistanceFields from './ResistanceFields';
import {isBodyweight} from './resistance';
import {activeWorkoutNames,normalizeProgram} from './programLibrary';
import PreviousPerformance from './PreviousPerformance';
import {addSessionExercise,editSessionExercise,removeSessionExercise} from './workoutOperations';
import React,{useState,useEffect} from 'react';
import {Dumbbell,Plus,Trash2,Check,ChevronLeft,ChevronRight,Pencil} from 'lucide-react';
import {cycle,workouts,isoToday} from './data';
import {fromDisplayWeight,toDisplayWeight,unitName} from './units';
import CalorieSection from './CalorieSection';

export default function TrainTab({db,patch,date,setDate,scheduled,session,updateSession,start,showManual,setShowManual,manualType,setManualType,changeDate}){
  const [newExerciseName,setNewExerciseName]=useState('');
  const [updateFuture,setUpdateFuture]=useState(false);
  const [exerciseError,setExerciseError]=useState('');
  useEffect(()=>{setUpdateFuture(false);setExerciseError('');},[session?.id]);
  const units=unitName(db.settings.units),available=activeWorkoutNames(db),selectedManual=available.includes(manualType)?manualType:available[0]||'';
  const allSets=session?.exercises.flatMap(e=>e.sets)||[];
  const completed=allSets.filter(x=>x.done).length;
  const total=allSets.length;
  const totalVolumeLb=session?.exercises.reduce((a,e)=>a+e.sets.reduce((b,s)=>b+(s.done?Number(s.weight)*Number(s.reps)||0:0),0),0)||0;
  const totalVolume=toDisplayWeight(totalVolumeLb,units,0);
  const editEx=(ei,fn)=>updateSession(s=>({...s,exercises:s.exercises.map((e,i)=>i===ei?fn(e):e)}));
  const setCell=(ei,si,key,value)=>updateSession(s=>({...s,exercises:s.exercises.map((e,i)=>i!==ei?e:{...e,sets:e.sets.map((v,j)=>j!==si?v:{...v,[key]:value})})}));
  const changeExercise=(fn,options)=>{try{const next=normalizeProgram(fn(db),{newEntryDate:new Date().toISOString()});patch(()=>next,options);setExerciseError('');}catch(e){setExerciseError(e.message);}};
  const addExercise=()=>{if(!newExerciseName.trim()||!session)return;changeExercise(value=>addSessionExercise(value,session.id,newExerciseName,updateFuture,db.exerciseLibrary?.find(e=>e.name.toLowerCase()===newExerciseName.trim().toLowerCase())));setNewExerciseName('');};
  const editExercise=(ei)=>{
    const ex=session.exercises[ei];
    const name=prompt('Exercise name',ex.name);if(name===null||!name.trim())return;
    const range=prompt('Rep range',ex.range||'8–12');if(range===null)return;
    const target=prompt('Target / effort',ex.target||'1–2 RIR');if(target===null)return;
    changeExercise(value=>editSessionExercise(value,session.id,ex.id,{name:name.trim(),range:range.trim()||'8–12',target:target.trim()||'1–2 RIR'},updateFuture));
  };
  const changeResistance=(ex,changes)=>{if(ex.sets.some(s=>s.done||Number(s.weight)>0||Number(s.reps)>0)&&!confirm('Change how this exercise interprets weight? Existing numbers will be retained as '+(changes.resistance==='bodyweight'?'added weight':'external load')+'. A recovery copy will be saved.'))return;changeExercise(value=>editSessionExercise(value,session.id,ex.id,changes,updateFuture),{checkpoint:'Before changing exercise resistance'});};
  const removeExercise=(ei)=>{
    const ex=session.exercises[ei];
    if(confirm('Remove '+ex.name+' from this session'+(updateFuture?' and future '+session.type+' workouts':'')+'?'))changeExercise(value=>removeSessionExercise(value,session.id,ex.id,updateFuture));
  };

  return <>
    <div className="datebar"><button className="iconbtn" onClick={()=>changeDate(-1)}><ChevronLeft/></button><input aria-label="Workout date" type="date" value={date} onChange={e=>setDate(e.target.value)}/><button className="iconbtn" onClick={()=>changeDate(1)}><ChevronRight/></button><button className="secondary" onClick={()=>setDate(isoToday())}>Today</button><span className="spacer"/><span className="muted">Scheduled: <b>{scheduled||'Rest day'}</b></span></div>
    {!session?<CalorieSection title={scheduled||'Recovery day'} description="Start your scheduled session or choose another workout for the selected date." summary={scheduled||'Rest day'} className="train-empty-section"><div className="heroicon"><Dumbbell size={28}/></div><p>{scheduled?'Ready to train? Start this session to record every working set.':'Your schedule has a rest day. You can still log a workout manually.'}</p>{scheduled&&<button className="primary" onClick={()=>start(scheduled)}><Plus size={17}/> Start {scheduled}</button>}<button className="textbtn" onClick={()=>setShowManual(!showManual)}>{showManual?'Hide options':'Start another workout'}</button>{showManual&&<div className="manual"><select aria-label="Workout to start" value={selectedManual} onChange={e=>setManualType(e.target.value)}>{available.map(c=><option key={c}>{c}</option>)}</select><button className="secondary" disabled={!selectedManual} onClick={()=>start(selectedManual)}>Start selected</button></div>}</CalorieSection>:<>
      <CalorieSection title="Session overview" description="Track session type, sets completed, external-load volume and workout status." summary={completed+' / '+total+' sets · '+(session.finished?'Finished':'In progress')}>
      <div className="summary"><div className="metric"><small>SESSION</small><strong>{session.type}</strong></div><div className="metric"><small>SETS COMPLETED</small><strong>{completed}<span> / {total}</span></strong></div><div className="metric"><small>EXTERNAL-LOAD VOLUME</small><strong>{Number(totalVolume||0).toLocaleString()} <span>{units}</span></strong></div><div className="metric"><small>STATUS</small><strong>{session.finished?'Finished':'In progress'}</strong></div></div>
      <label className="weekpick"><input type="checkbox" checked={updateFuture} onChange={e=>setUpdateFuture(e.target.checked)}/> Apply exercise changes to future sessions</label>
      <p className="muted">Off: exercise changes affect this session only. On: also update the matching {session.type} template.</p>
      {exerciseError&&<p className="error" role="alert">{exerciseError}</p>}
      <p className="muted">Volume counts external load and added weight only; bodyweight-only reps remain logged without a guessed tonnage.</p><p className="muted">Set RPE: 10 = no reps left, 9 = about 1, 8 = about 2, 7 = about 3. Record actual set effort, not the prescribed target. Blank RPE stays unknown.</p>
      </CalorieSection>
      {session.exercises.map((e,ei)=><CalorieSection key={e.id??ei} collapseKey={'exercise:'+(e.templateId||e.id||e.name)} title={e.name} description={e.range+' reps · '+e.target+(isBodyweight(e)?' · Bodyweight + added weight':'')} summary={e.sets.filter(v=>v.done).length+' / '+e.sets.length+' sets'} className="train-exercise-section"><div className="exhead"><span className="muted">Exercise controls</span><div className="exactions"><button className="iconbtn subtle" title="Add a set" onClick={()=>editEx(ei,x=>({...x,sets:[...x.sets,{weight:isBodyweight(x)?0:'',reps:'',rpe:'',done:false,tag:''}]}))}><Plus size={18}/></button><button className="iconbtn subtle" title="Edit exercise" onClick={()=>editExercise(ei)}><Pencil size={15}/></button><button className="iconbtn subtle" title="Remove exercise" onClick={()=>removeExercise(ei)}><Trash2 size={15}/></button></div></div><ResistanceFields resistance={e.resistance} defaults={false} onChange={changes=>changeResistance(e,changes)}/><PreviousPerformance db={db} name={e.name} date={date} units={units} resistance={isBodyweight(e)?'bodyweight':'external'}/><div className="settable"><div className="setrow headings"><span>SET</span><span>{isBodyweight(e)?'ADDED WEIGHT':'WEIGHT'} ({units})</span><span>REPS</span><span>RPE</span><span>DONE</span><span></span></div>{e.sets.map((v,si)=><div className={'setrow '+(v.done?'isdone':'')} key={si}><span className="setnum">{si+1}{v.tag&&<small>{v.tag}</small>}</span><input type="number" min="0" step={units==='kg'?'0.5':'2.5'} aria-label={(isBodyweight(e)?'Added weight':'Weight')+' set '+(si+1)+' ('+units+')'} placeholder={isBodyweight(e)?'0':'—'} value={toDisplayWeight(v.weight,units,1)} onChange={ev=>setCell(ei,si,'weight',fromDisplayWeight(ev.target.value,units))}/><input type="number" min="0" step="1" placeholder="—" value={v.reps} onChange={ev=>setCell(ei,si,'reps',ev.target.value)}/><input type="number" min="1" max="10" step="0.5" placeholder="—" value={v.rpe} onChange={ev=>setCell(ei,si,'rpe',ev.target.value)}/><button className={'checkbtn '+(v.done?'checked':'')} onClick={()=>setCell(ei,si,'done',!v.done)} title="Mark set completed"><Check size={18}/></button><button className="iconbtn subtle" title="Remove set" onClick={()=>editEx(ei,x=>({...x,sets:x.sets.filter((_,i)=>i!==si)}))}><Trash2 size={15}/></button></div>)}</div></CalorieSection>)}
      <CalorieSection title="Add exercise" description={updateFuture?"Add an exercise to this session and future "+session.type+" workouts.":"Add an exercise to this session only."} summary={session.exercises.length+" current exercises"}><div className="manual"><input list="saved-exercise-names" aria-label="New exercise name" placeholder="Exercise name" value={newExerciseName} onChange={e=>setNewExerciseName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addExercise()}}/><datalist id="saved-exercise-names">{(db.exerciseLibrary||[]).filter(e=>!e.archived).map(e=><option key={e.id} value={e.name}/>)}</datalist><button className="secondary" onClick={addExercise}><Plus size={16}/> Add exercise</button></div></CalorieSection>
      <CalorieSection title="Session notes" description="Record fatigue, technique, recovery and other details for this workout." summary={session.notes?.trim()?session.notes.trim().split(/\s+/).length+' words':'No notes yet'}><textarea placeholder="Sleep, fatigue, technique, soreness, sticking points..." value={session.notes||''} onChange={e=>updateSession(s=>({...s,notes:e.target.value}))}/><div className="actions"><button className="primary" onClick={()=>updateSession(s=>({...s,finished:!s.finished}))}><Check size={17}/>{session.finished?'Reopen session':'Finish workout'}</button><button className="danger" onClick={()=>{if(confirm('Delete this workout and all its logged sets?'))patch(p=>({...p,sessions:p.sessions.filter(s=>s.id!==session.id)}))}}><Trash2 size={16}/> Delete workout</button></div></CalorieSection>
    </>}
  </>;
}

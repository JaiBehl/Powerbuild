import React,{useState} from 'react';
import CalorieSection from './CalorieSection';
import {exerciseChoices,exerciseNameKey,setExerciseAlias} from './exerciseCatalog';
export default function ExerciseAliases({db,patch}){
 const [from,setFrom]=useState(''),[to,setTo]=useState(''),[error,setError]=useState('');
 const aliases=db.exerciseAliases||{},names=exerciseChoices([...Object.values(db.templates).flat().map(row=>row[0]),...db.sessions.flatMap(s=>s.exercises.map(e=>e.name))],aliases);
 const save=()=>{try{const next=setExerciseAlias(aliases,from,to);patch({exerciseAliases:next});setFrom('');setTo('');setError('');}catch(e){setError(e.message);}};
 return <CalorieSection title="Exercise names & aliases" description="Link names for the same movement so history and goals agree. Keep different variations separate." summary={Object.keys(aliases).length+' custom links'}>
 <p className="muted">Standard barbell bench names share the touch-and-go series. Paused, incline and standing variations stay separate. To keep a standard name separate, link it to the same name.</p>
 <div className="formgrid"><label>Name used in your log<input aria-label="Exercise alias" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Track under this exercise<input aria-label="Canonical exercise name" list="canonical-exercises" value={to} onChange={e=>setTo(e.target.value)}/></label></div>
 <datalist id="canonical-exercises">{names.map(name=><option key={name} value={name}/>)}</datalist>
 <button className="secondary" onClick={save}>Save exercise link</button>
 {error&&<p className="error" role="alert">{error}</p>}
 <div className="history">{Object.entries(aliases).map(([alias,target])=><div className="between" key={alias}><span>{alias} → {target}</span><button className="secondary" aria-label={'Remove link '+alias} onClick={()=>patch(p=>{const next={...p.exerciseAliases};delete next[exerciseNameKey(alias)];return {...p,exerciseAliases:next};})}>Remove link</button></div>)}</div>
 </CalorieSection>;
}

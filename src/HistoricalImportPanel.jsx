import React,{useMemo,useState} from 'react';
import CalorieSection from './CalorieSection';
import {normalizeHistoricalImport,mergeHistoricalImport} from './historicalImport';
export default function HistoricalImportPanel({db,patch,profileId,profileName}){
 const [incoming,setIncoming]=useState(null),[mode,setMode]=useState('merge'),[removeMissing,setRemoveMissing]=useState(false),[includeLegacy,setIncludeLegacy]=useState(false),[message,setMessage]=useState('');
 const preview=useMemo(()=>incoming?mergeHistoricalImport(db,incoming,{mode,removeMissing,includeLegacy}):null,[db,incoming,mode,removeMissing,includeLegacy]);
 const read=async event=>{try{const file=event.target.files?.[0];if(!file)return;if(file.size>5000000)throw Error('File exceeds the 5 MB historical-import limit.');setIncoming(normalizeHistoricalImport(JSON.parse(await file.text())));setMessage('');}catch(e){setIncoming(null);setMessage('Import failed: '+e.message);}finally{event.target.value='';}};
 const apply=()=>{try{
  if(!incoming)return;
  if(!confirm(mode==='correct'?'Apply the previewed corrections/removals? Existing imported values may be replaced. A recovery copy will be saved first.':'Merge the previewed historical records into '+profileName+'? Existing records take precedence.'))return;
  const result=mergeHistoricalImport(db,incoming,{mode,removeMissing,includeLegacy});if(!patch(()=>result.db,{checkpoint:'Before historical '+mode}))throw Error('A recovery copy could not be saved; no changes applied.');setIncoming(null);setMessage('Import applied. '+result.counts.newSessions+' new workouts, '+result.counts.updatedExercises+' corrected exercises, '+result.counts.removedSessions+' removed imported workouts. Recovery copy saved.');
 }catch(e){setMessage('Import failed: '+e.message);}};
 return <CalorieSection title="Import Apple Notes workout history" description="Preview additions or corrections before changing your history. Existing records stay unless you explicitly choose correction." summary={db.sessions.length+' workouts saved'}>
 <p className="muted">Choose a converted historical JSON, not a raw Notes ZIP. Use the same import ID to correct an earlier batch. Decimal reps are floored; failed zero-rep attempts remain excluded from strength records.</p>
 <label className="secondary upload">Preview historical JSON<input aria-label="Historical JSON file" type="file" accept=".json,application/json" onChange={read} hidden/></label>
 {incoming&&<div className="food-add-box">
 <p>Import ID: <b>{incoming.metadata.importId}</b> · {incoming.sessions.length} dated workouts · {incoming.weights.length} weigh-ins</p>
 <label>Import mode<select aria-label="Import mode" value={mode} onChange={e=>setMode(e.target.value)}><option value="merge">Add missing records only</option><option value="correct">Correct this import batch</option></select></label>
 {mode==='correct'&&<><label className="weekpick"><input type="checkbox" checked={removeMissing} onChange={e=>setRemoveMissing(e.target.checked)}/> Remove records missing from this batch</label><label className="weekpick"><input type="checkbox" checked={includeLegacy} onChange={e=>setIncludeLegacy(e.target.checked)}/> Include older sessions marked with this import ID</label><p className="error">Correction replaces matching imported sets. Removal affects tracked records from this batch. Including older marked sessions can also affect manual edits on those dates: review the preview carefully. Older untracked missing weigh-ins are retained.</p></>}
 <p role="status">{preview.changes.length} proposed changes · {preview.counts.skippedExistingExercises} existing exercises kept · {preview.counts.skippedExistingWeights} weigh-ins kept</p>
 <div className="history">{preview.changes.slice(0,40).map((change,i)=><div key={i}>{change.date} · {change.action} · {change.detail}</div>)}</div>
 {preview.changes.length>40&&<p className="muted">Showing the first 40 changes of {preview.changes.length}.</p>}
 <div className="actions"><button className="primary" onClick={apply}>Apply previewed import</button><button className="secondary" onClick={()=>setIncoming(null)}>Cancel import</button></div>
 </div>}
 {message&&<p role="status" className={message.startsWith('Import failed')?'error':'muted'}>{message}</p>}
 </CalorieSection>;
}

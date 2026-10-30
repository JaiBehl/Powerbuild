import React from 'react';
import CalorieSection from './CalorieSection';
import {personalRecords} from './trainingStats';
import {exerciseChoices} from './exerciseCatalog';
import {formatWeight,unitName} from './units';
const display=(record,units)=>record?formatWeight(record.value,units,1)+' · '+record.date:'No record';
export default function PersonalRecords({db,date,setDate,lift,setLift}){
 const units=unitName(db.settings.units),result=personalRecords(db,lift,date);
 const names=exerciseChoices([...Object.values(db.templates).flat().map(e=>e[0]),...db.sessions.flatMap(s=>s.exercises.map(e=>e.name))],db.exerciseAliases);
 return <CalorieSection title="Personal records" description="Actual singles, estimated strength and rep PRs, with all-time and recent comparisons." summary={result.all.count+' qualifying sets'}>
 <div className="formgrid"><label>Exercise<select aria-label="Exercise for records" value={lift} onChange={e=>setLift(e.target.value)}>{names.map(name=><option key={name}>{name}</option>)}</select></label><label>Records through date<input aria-label="Records through date" type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
 <p className="muted">All time through {date}. Recent means the last 90 calendar days. Only completed, positive-load sets count. Actual singles and multi-rep estimates are separate.</p>
 <div className="records-scroll"><table className="records-table"><thead><tr><th>Record</th><th>All time</th><th>Last 90 days</th></tr></thead><tbody>
 <tr><th>Achieved single</th><td>{display(result.all.single,units)}</td><td>{display(result.recent.single,units)}</td></tr>
 <tr><th>Estimated 1RM (2–15 reps)</th><td>{display(result.all.estimated,units)}</td><td>{display(result.recent.estimated,units)}</td></tr>
 </tbody></table></div>
 <h3>Best load at each rep count</h3>
 {Object.keys(result.all.repPRs).length?<div className="records-scroll"><table className="records-table"><thead><tr><th>Reps</th><th>All time</th><th>Last 90 days</th></tr></thead><tbody>{Object.keys(result.all.repPRs).map(Number).sort((a,b)=>a-b).map(reps=><tr key={reps}><th>{reps}</th><td>{display(result.all.repPRs[reps],units)}</td><td>{display(result.recent.repPRs[reps],units)}</td></tr>)}</tbody></table></div>:<p className="empty">Complete a loaded set to create a record.</p>}
 </CalorieSection>;
}

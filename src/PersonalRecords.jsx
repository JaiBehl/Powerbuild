import React from 'react';
import CalorieSection from './CalorieSection';
import {personalRecords} from './trainingStats';
import {exerciseNames} from './exerciseCatalog';
import {formatWeight,unitName} from './units';
const display=(record,units)=>record?formatWeight(record.value,units,1)+' · '+record.date:'No record';
const estimateDisplay=(record,units)=>record?<>{display(record,units)}<small className="muted">{record.missingRpe?'RPE missing · assumes failure':record.reps+' reps @ RPE '+record.rpe+' · '+Number((10-record.rpe).toFixed(1))+' RIR'}</small></>:'No qualifying estimate';
export default function PersonalRecords({db,date,setDate,lift,setLift}){
 const units=unitName(db.settings.units),result=personalRecords(db,lift,date);
 const names=exerciseNames(db);
 return <CalorieSection title="Personal records" description="Actual singles, estimated strength and rep PRs, with all-time and recent comparisons." summary={result.all.count+' qualifying sets'}>
 <div className="formgrid"><label>Exercise<select aria-label="Exercise for records" value={lift} onChange={e=>setLift(e.target.value)}>{names.map(name=><option key={name}>{name}</option>)}</select></label><label>Records through date<input aria-label="Records through date" type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
 <p className="muted">All time through {date}. Recent means the last 90 calendar days. Achieved singles show the load actually lifted. Estimates use RPE 7–10 (10 − RPE = reps in reserve), up to 10 reps including reserve. Blank RPE assumes failure and may underestimate capacity; easy sets are excluded from predictions.</p>
 <div className="records-scroll"><table className="records-table"><thead><tr><th>Record</th><th>All time</th><th>Last 90 days</th></tr></thead><tbody>
 <tr><th>Achieved single</th><td>{display(result.all.single,units)}</td><td>{display(result.recent.single,units)}</td></tr>
 <tr><th>Estimated 1RM (RPE-aware)</th><td>{estimateDisplay(result.all.estimated,units)}</td><td>{estimateDisplay(result.recent.estimated,units)}</td></tr>
 </tbody></table></div>
 <h3>Best load at each rep count</h3>
 {Object.keys(result.all.repPRs).length?<div className="records-scroll"><table className="records-table"><thead><tr><th>Reps</th><th>All time</th><th>Last 90 days</th></tr></thead><tbody>{Object.keys(result.all.repPRs).map(Number).sort((a,b)=>a-b).map(reps=><tr key={reps}><th>{reps}</th><td>{display(result.all.repPRs[reps],units)}</td><td>{display(result.recent.repPRs[reps],units)}</td></tr>)}</tbody></table></div>:<p className="empty">Complete a loaded set to create a record.</p>}
 </CalorieSection>;
}

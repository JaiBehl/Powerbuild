import React,{useMemo} from 'react';
import CalorieSection from './CalorieSection';
import {personalRecords} from './trainingStats';
import {exerciseNames} from './exerciseCatalog';
import {formatWeight,unitName} from './units';
import {MAX_BODYWEIGHT_GAP_DAYS} from './recordBodyweight';
function BodyweightContext({bodyweight,units}){
 if(!bodyweight)return <small className="muted">BW unavailable · no weigh-in within {MAX_BODYWEIGHT_GAP_DAYS} days</small>;
 const source=bodyweight.method==='same-day'?'logged '+bodyweight.sources[0].date:bodyweight.method==='interpolated'?'interpolated '+bodyweight.sources.map(s=>s.date).join(' → '):'nearest '+bodyweight.sources[0].date+' ('+bodyweight.daysAway+(bodyweight.daysAway===1?' day':' days')+' away)';
 return <small className="muted">{bodyweight.estimated?'Est. BW':'BW'} {formatWeight(bodyweight.value,units,1)} · {source}</small>;
}
const display=(record,units)=>record?<>{formatWeight(record.value,units,1)+' · '+record.date}<BodyweightContext bodyweight={record.bodyweight} units={units}/></>:'No record';
function EstimateEffort({record}){return <small className="muted">{record.missingRpe?'RPE missing · assumes failure':record.reps+(record.reps===1?' rep':' reps')+' @ RPE '+record.rpe+' · '+Number((10-record.rpe).toFixed(1))+' RIR'}</small>;}
const estimateDisplay=(record,units)=>record?<>{display(record,units)}<EstimateEffort record={record}/></>:'No qualifying estimate';
const relativeDisplay=(record,units)=>record?<>{record.value.toFixed(3)}× BW · {record.date}<small className="muted">{record.kind==='estimated'?'Estimated 1RM':'Lifted'} {formatWeight(record.load,units,1)}</small><BodyweightContext bodyweight={record.bodyweight} units={units}/>{record.kind==='estimated'&&<EstimateEffort record={record}/>}</>:'No record with bodyweight';
function RecordControls({names,lift,setLift,date,setDate,relative=false}){
 const dateLabel=relative?'Relative records through date':'Records through date';
 return <div className="formgrid"><label>Exercise<select aria-label={relative?'Exercise for relative records':'Exercise for records'} value={lift} onChange={e=>setLift(e.target.value)}>{names.map(name=><option key={name}>{name}</option>)}</select></label><label>{dateLabel}<input aria-label={dateLabel} type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>;
}
export default function PersonalRecords({db,date,setDate,lift,setLift}){
 const units=unitName(db.settings.units),result=useMemo(()=>personalRecords(db,lift,date),[db,lift,date]);
 const names=exerciseNames(db),all=result.all.relative,recent=result.recent.relative;
 return <><CalorieSection title="Personal records" description="Achieved singles, RPE-aware strength estimates and rep PRs, with all-time and recent comparisons." summary={result.all.count+' qualifying sets'}>
 <RecordControls {...{names,lift,setLift,date,setDate}}/>
 <p className="muted">All time through {date}. Recent means the last 90 calendar days. Achieved singles show the load actually lifted. Estimates use RPE 7–10 (10 − RPE = reps in reserve), up to 10 reps including reserve. Blank RPE assumes failure and may underestimate capacity; easy sets are excluded from predictions.</p>
 <p className="muted">BW uses the same-day weigh-in average. Est. BW interpolates between weigh-ins within {MAX_BODYWEIGHT_GAP_DAYS} days on each side, or uses the nearest within {MAX_BODYWEIGHT_GAP_DAYS} days. Only weigh-ins through {date} are used; adding or editing them updates this context.</p>
 <div className="records-scroll"><table className="records-table"><thead><tr><th>Record</th><th>All time</th><th>Last 90 days</th></tr></thead><tbody>
 <tr><th>Achieved single</th><td>{display(result.all.single,units)}</td><td>{display(result.recent.single,units)}</td></tr>
 <tr><th>Estimated 1RM (RPE-aware)</th><td>{estimateDisplay(result.all.estimated,units)}</td><td>{estimateDisplay(result.recent.estimated,units)}</td></tr>
 </tbody></table></div>
 <h3>Best load at each rep count</h3>
 {Object.keys(result.all.repPRs).length?<div className="records-scroll"><table className="records-table"><thead><tr><th>Reps</th><th>All time</th><th>Last 90 days</th></tr></thead><tbody>{Object.keys(result.all.repPRs).map(Number).sort((a,b)=>a-b).map(reps=><tr key={reps}><th>{reps}</th><td>{display(result.all.repPRs[reps],units)}</td><td>{display(result.recent.repPRs[reps],units)}</td></tr>)}</tbody></table></div>:<p className="empty">Complete a loaded set to create a record.</p>}
 </CalorieSection>
 <CalorieSection title="Relative strength records" description="Best lift-to-bodyweight ratios for singles, RPE-aware estimates and rep records." summary={all.supported?all.count+(all.count===1?' set':' sets')+' with bodyweight':'Unsupported movement'}>
 <RecordControls {...{names,lift,setLift,date,setDate}} relative/>
 <p className="muted">{result.name} · all time through {date}, compared with the last 90 calendar days. Relative strength = lift ÷ bodyweight on the lift date. A 225 lb lift at 180 lb is 1.250× BW. Each record is selected by its ratio across all qualifying sets, independently of your absolute PR.</p>
 {!all.supported?<p className="empty">Relative records are unavailable for bodyweight or assisted movements because logged added load or assistance is not total resistance.</p>:<>
 <p className="muted">The same bodyweight matching rules as absolute PRs apply. Estimated bodyweights remain labelled; {all.missingBodyweight} {all.missingBodyweight===1?'set':'sets'} without nearby weigh-ins {all.missingBodyweight===1?'is':'are'} excluded. Ratios use unrounded values and stay the same in lb or kg. Compare the same exercise and equipment setup.</p>
 <div className="records-scroll"><table className="records-table" aria-label="Relative single and estimated records"><thead><tr><th>Record</th><th>All time</th><th>Last 90 days</th></tr></thead><tbody>
 <tr><th>Achieved single ÷ BW</th><td>{relativeDisplay(all.single,units)}</td><td>{relativeDisplay(recent.single,units)}</td></tr>
 <tr><th>Estimated 1RM ÷ BW (RPE-aware)</th><td>{relativeDisplay(all.estimated,units)}</td><td>{relativeDisplay(recent.estimated,units)}</td></tr>
 </tbody></table></div>
 <h3>Best relative load at each rep count</h3>
 {Object.keys(all.repPRs).length?<div className="records-scroll"><table className="records-table" aria-label="Relative rep records"><thead><tr><th>Reps</th><th>All time</th><th>Last 90 days</th></tr></thead><tbody>{Object.keys(all.repPRs).map(Number).sort((a,b)=>a-b).map(reps=><tr key={reps}><th>{reps}</th><td>{relativeDisplay(all.repPRs[reps],units)}</td><td>{relativeDisplay(recent.repPRs[reps],units)}</td></tr>)}</tbody></table></div>:<p className="empty">Complete a loaded set and log a weigh-in near its date to create a relative record.</p>}
 </>}
 </CalorieSection></>;
}

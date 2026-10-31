import React from 'react';
import CalorieSection from './CalorieSection';
import {weeklySummary} from './trends';
import {formatWeight,unitName} from './units';
export default function WeeklyReview({db,date,setDate}){
 const report=weeklySummary(db,date),units=unitName(db.settings.units);if(!report)return null;
 return <CalorieSection title="Weekly review" description="Seven days of training, food logs, cardio and bodyweight trends, ending on your selected date." summary={report.sessions+' finished workouts · '+report.foodDays+' food-log days'}>
 <label>Week ending<input aria-label="Week ending" type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
 <p className="muted">{report.since} – {report.until}. Volume includes external/added weight only, without guessed bodyweight tonnage. Food averages include logged days only; missing days are not treated as zero. Bodyweight averages give each recorded day equal weight.</p>
 <div className="summary">
 <div className="metric"><small>FINISHED WORKOUTS</small><strong>{report.sessions}</strong></div>
 <div className="metric"><small>COMPLETED SETS</small><strong>{report.sets}</strong></div>
 <div className="metric"><small>EXTERNAL-LOAD VOLUME</small><strong>{formatWeight(report.volume,units,0)}</strong></div>
 <div className="metric"><small>SEVEN-DAY WEIGHT AVERAGE</small><strong>{report.weight.average===null?'—':formatWeight(report.weight.average,units,1)}</strong><small>{report.weight.days} recorded days</small></div>
 <div className="metric"><small>AVERAGE CALORIES EATEN</small><strong>{report.averageCalories===null?'—':Math.round(report.averageCalories)}<span> kcal</span></strong></div>
 <div className="metric"><small>AVERAGE PROTEIN</small><strong>{report.averageProtein===null?'—':Math.round(report.averageProtein)}<span> g</span></strong></div>
 <div className="metric"><small>CUSTOM CARDIO</small><strong>{Math.round(report.cardioMinutes)}<span> min</span></strong><small>{Math.round(report.cardioCalories)} kcal logged</small></div>
 <div className="metric"><small>WEIGHT AVERAGE CHANGE</small><strong>{report.weightChange===null?'—':(report.weightChange>0?'+':'')+formatWeight(report.weightChange,units,1)}</strong><small>versus the preceding seven days</small></div>
 </div>
 </CalorieSection>;
}

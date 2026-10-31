import {programCycle} from './programLibrary';
import React from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {cycle,workouts,isoToday,scheduledWorkout} from './data';
import CalorieSection from './CalorieSection';

export default function ScheduleTab({db,setTab,setDate,viewWeek,setViewWeek,weekDates}){
  const rotation=programCycle(db.settings);
  const completedInWeek=weekDates.filter(d=>db.sessions.some(s=>s.date===d&&s.finished)).length;
  const plannedInWeek=weekDates.filter(d=>!!scheduledWorkout(d,db.settings)).length;
  return <>
    <CalorieSection title="Weekly rotation"
      description="Browse your training calendar and open any date to log or review a workout."
      summary={completedInWeek+' / '+plannedInWeek+' planned sessions'}>
      <div className="schedule-nav between">
        <span className="muted">{weekDates[0]} – {weekDates[6]}</span>
        <div className="actions">
          <button className="iconbtn" aria-label="Previous week" onClick={()=>setViewWeek(x=>x-1)}><ChevronLeft/></button>
          <button className="secondary" onClick={()=>setViewWeek(0)}>Current</button>
          <button className="iconbtn" aria-label="Next week" onClick={()=>setViewWeek(x=>x+1)}><ChevronRight/></button>
        </div>
      </div>
      <div className="weekgrid">{weekDates.map((d,i)=>{
        const planned=scheduledWorkout(d,db.settings);
        const session=db.sessions.find(s=>s.date===d);
        return <button key={d} className={'daycard '+(d===isoToday()?'today':'')} onClick={()=>{setDate(d);setTab('today')}}>
          <small>{['MON','TUE','WED','THU','FRI','SAT','SUN'][i]}</small>
          <strong>{Number(d.slice(-2))}</strong>
          <span>{session?.type||planned||'Rest'}</span>
          {session?.finished&&<em>✓ Done</em>}
        </button>;
      })}</div>
      <p className="muted note">Completed or manually logged sessions appear on their dates. The planned rotation advances on training days even when a workout is skipped. Change the rotation offset under Settings if needed.</p>
    </CalorieSection>
    <CalorieSection title="Workout cycle"
      description="Preview the reusable workouts in your current repeating training rotation."
      summary={rotation.length+' rotation slots'}>
      <div className="cyclegrid">{rotation.map((name,i)=><div className="cycleitem" key={name+i}>
        <span>{i+1}</span><strong>{name}</strong>
        <small>{(db.templates?.[name]||workouts[name]||[]).length} exercises</small>
      </div>)}</div>
    </CalorieSection>
  </>;
}

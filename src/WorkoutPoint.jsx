import React from 'react';
export default function WorkoutPoint({cx,cy,payload,openWorkout,onTouch,active=false}){
 if(!Number.isFinite(cx)||!Number.isFinite(cy)||!payload?.date||!Number.isFinite(payload.value))return null;
 return <circle cx={cx} cy={cy} r={active?6:4} fill="#84b2ff" stroke="#dceaff" strokeWidth={active?2:1} role={active?undefined:'button'} tabIndex={active?-1:0} aria-hidden={active||undefined} aria-label={active?undefined:'Open workout '+payload.date} style={{cursor:'pointer',touchAction:'manipulation'}} onDoubleClick={e=>{e.stopPropagation();openWorkout(payload.date);}} onTouchEnd={e=>onTouch(e,payload.date)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openWorkout(payload.date);}}}/>;
}

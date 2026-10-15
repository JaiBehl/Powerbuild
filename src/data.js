export const cycle=['Push A','Pull A','Legs A','Push B','Pull B','Legs B'];

export const workouts={
  'Push A':[
    ['Barbell bench press',4,'3–5 top / 4–6 backoff','Top RPE 8; backoffs 2 RIR','strength'],
    ['Supported seated barbell OHP',3,'5–8','2 RIR'],
    ['Incline machine or DB press',2,'6–10','1–2 RIR'],
    ['Cable lateral raise',3,'12–20','0–2 RIR'],
    ['Overhead cable triceps extension',2,'10–15','1 RIR'],
    ['Cable pec fly',2,'10–15','1 RIR'],
  ],
  'Pull A':[
    ['Chest-supported upper-back row',3,'6–10','1–2 RIR'],
    ['Neutral-grip lat pulldown',3,'8–12','1–2 RIR'],
    ['Reverse pec deck',3,'12–20','0–2 RIR'],
    ['Preacher curl',3,'8–12','1 RIR'],
    ['Incline dumbbell curl',2,'10–15','1 RIR'],
    ['Forearm flexion/extension',2,'12–20','1 RIR'],
  ],
  'Legs A':[
    ['Barbell back squat',4,'3–5 top / 4–6 backoff','Top RPE 8; backoffs 2–3 RIR','strength'],
    ['Seated leg curl',3,'8–12','1–2 RIR'],
    ['Leg extension',3,'10–15','1 RIR'],
    ['Standing calf raise',3,'8–12','1 RIR'],
    ['Hip adduction',2,'10–15','1–2 RIR'],
    ['Cable crunch',3,'10–15','1–2 RIR'],
  ],
  'Push B':[
    ['Supported seated barbell OHP',4,'3–5 top / 4–6 backoff','Top RPE 8; backoffs 2 RIR','strength'],
    ['Touch-and-go bench press',3,'5–8','2 RIR'],
    ['Incline press',2,'8–12','1–2 RIR'],
    ['Cable lateral raise',3,'12–20','0–2 RIR'],
    ['Cable pec fly',2,'10–15','1 RIR'],
    ['Triceps pushdown',2,'10–15','1 RIR'],
  ],
  'Pull B':[
    ['Pull-up or lat pulldown',3,'6–10','1–2 RIR'],
    ['Chest-supported row',3,'8–12','1–2 RIR'],
    ['Single-arm cable lat pulldown',2,'10–15','1–2 RIR'],
    ['Cable rear-delt fly',2,'12–20','0–2 RIR'],
    ['Incline dumbbell curl',3,'8–12','1 RIR'],
    ['Preacher or cable curl',2,'10–15','1 RIR'],
    ['Forearm flexion/extension',2,'12–20','1 RIR'],
  ],
  'Legs B':[
    ['Barbell back squat',3,'5–8','RPE 6.5–8'],
    ['Romanian deadlift',2,'6–10','2–3 RIR'],
    ['Seated or lying leg curl',3,'10–15','1–2 RIR'],
    ['Leg extension',3,'12–15','1 RIR'],
    ['Seated calf raise',3,'10–15','1 RIR'],
    ['Hanging leg raise',3,'8–15','1–2 RIR'],
  ],
};

export const initialSettings={
  startDate:'2026-10-12',
  startWeight:180,
  targetWeight:160,
  weightDeadline:'2027-04-12',
  strengthDeadline:'2027-10-12',
  units:'lb',
  schedule:[1,2,3,5,6],
  cycleOffset:0,
};

export const legacyStrengthGoals=(deadline=initialSettings.strengthDeadline)=>[
  {id:'legacy-squat-goal',exercise:'Barbell back squat',targetWeight:405,deadline},
  {id:'legacy-bench-goal',exercise:'Touch-and-go bench press',targetWeight:315,deadline},
  {id:'legacy-ohp-goal',exercise:'Supported seated barbell OHP',targetWeight:225,deadline},
];

export const isoToday=()=>{
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export function scheduledWorkout(date,settings){
  const start=new Date(settings.startDate+'T12:00:00'),end=new Date(date+'T12:00:00');
  const diff=Math.round((end-start)/86400000);
  if(diff<0)return null;
  let n=0;
  for(let i=0;i<=diff;i++){
    const day=new Date(start.getTime()+i*86400000).getDay();
    const mon=(day+6)%7+1;
    if(settings.schedule.includes(mon))n++;
  }
  const d=new Date(date+'T12:00:00');
  if(!settings.schedule.includes(((d.getDay()+6)%7)+1))return null;
  return cycle[((n-1+(settings.cycleOffset||0))%6+6)%6];
}

export function createSession(type,date,templates=workouts){
  return {
    id:(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)),
    date,
    type,
    notes:'',
    finished:false,
    exercises:(templates[type]||workouts[type]).map((e,i)=>({
      id:i,
      name:e[0],
      range:e[2],
      target:e[3],
      kind:e[4]||'accessory',
      sets:Array.from({length:e[1]},(_,j)=>({weight:'',reps:'',rpe:'',done:false,tag:e[4]==='strength'?(j===0?'Top':'Backoff'):''})),
    })),
  };
}

export function e1rm(w,r){
  const a=Number(w),b=Number(r);
  return a>0&&b>0&&b<=15?a*(1+b/30):null;
}

function renderSchedule(){
  const order = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const plan = {Monday:'Train',Tuesday:'Train',Wednesday:'Train',Thursday:'Rest',Friday:'Train',Saturday:'Train',Sunday:'Rest'};
  const today = new Intl.DateTimeFormat('en-US',{weekday:'long'}).format(new Date());
  document.getElementById('schedule').innerHTML = `
    <div class="grid two">
      <div class="card"><h2>Rolling 5-day PPL</h2><div class="notice">Train Mon / Tue / Wed / Fri / Sat. Rest Thu / Sun. Keep moving through the six-workout rotation — don’t restart at Push A every Monday.</div><div class="stack" style="margin-top:14px">${order.map(d=>`<div class="day ${d===today?'today':''}"><div class="row between"><b>${d}</b><span class="badge">${plan[d]}</span></div>${plan[d]==='Train'?'<div class="muted small">Continue the next workout in your current 6-session rotation.</div>':'<div class="muted small">Recovery / light activity.</div>'}</div>`).join('')}</div></div>
      <div class="card"><h2>Strength structure</h2><div class="stack"><div class="day"><b>Main strength lift</b><div class="muted">Top set 3–5 reps @ RPE ~8, then 3 backoff sets of 4–6.</div></div><div class="day"><b>Accessories</b><div class="muted">Use double progression: add reps first, then load once you own the top of the range.</div></div><div class="day"><b>Powerbuilder balance</b><div class="muted">Prioritize squat, bench, and seated barbell OHP strength while preserving enough accessory volume for aesthetics.</div></div></div></div>
    </div>`;
}

function renderProgress(){
  const g=state.strengthGoals;
  const bw=state.bodyweightLogs;
  const last=bw.length?bw[bw.length-1].weight:state.goal.currentWeight;
  const goalPct=clamp(((state.goal.currentWeight-last)/(state.goal.currentWeight-state.goal.targetWeight||1))*100,0,100);
  document.getElementById('progress').innerHTML = `
    <div class="grid three">
      <div class="card kpi"><div class="label">BODYWEIGHT</div><div class="stat">${last.toFixed(1)} lb</div><div class="muted small">Goal ${state.goal.targetWeight} lb by ${state.goal.deadline}</div></div>
      <div class="card kpi"><div class="label">BODYWEIGHT PROGRESS</div><div class="stat">${Math.round(goalPct)}%</div><div class="progressbar" style="margin-top:12px"><span style="width:${goalPct}%"></span></div></div>
      <div class="card kpi"><div class="label">STRENGTH DEADLINE</div><div class="stat">${g.deadline}</div><div class="muted small">At a target bodyweight of ${state.goal.targetWeight} lb</div></div>
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><h2>Strength goals</h2><div class="stack"><div class="day"><div class="row between"><b>Squat</b><span class="stat" style="font-size:24px">${g.squat} lb</span></div></div><div class="day"><div class="row between"><b>Bench press</b><span class="stat" style="font-size:24px">${g.bench} lb</span></div><div class="muted small">Touch-and-go target</div></div><div class="day"><div class="row between"><b>Seated barbell OHP</b><span class="stat" style="font-size:24px">${g.ohp} lb</span></div><div class="muted small">Upright back support</div></div></div></div>
      <div class="card"><h2>Log bodyweight</h2><div class="row"><input id="bwInput" type="number" step="0.1" min="100" max="400" value="${last.toFixed(1)}"><button class="btn primary" onclick="logBodyweight()">Save</button></div><div class="divider"></div>${bw.length?bw.slice(-10).reverse().map(x=>`<div class="row between day"><span>${x.date}</span><b>${x.weight.toFixed(1)} lb</b></div>`).join(''):'<div class="empty">No weigh-ins logged yet.</div>'}</div>
    </div>`;
}
window.logBodyweight=function(){ const n=+document.getElementById('bwInput').value; if(n>0){ state.bodyweightLogs.push({date:todayISO(),weight:n}); state.goal.currentWeight=n; state.calorie.weight=n; saveState(); }};

function sliderField(id,label,min,max,step,value,suffix){
  return `<div class="field"><div class="row between"><label for="${id}">${label}</label><b id="${id}-v">${value}${suffix}</b></div><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></div>`;
}
function renderCalories(){
  const c=state.calorie, m=maintenanceEstimate(), g=goalCalc();
  const paceWarning=Math.abs(g.weekly) > 2 ? '<span class="danger">Aggressive pace</span>' : Math.abs(g.weekly)>1.25 ? '<span class="warn">Moderately aggressive</span>' : '<span class="good">Reasonable pace</span>';
  document.getElementById('calories').innerHTML=`
    <div class="grid two">
      <div class="card"><h2>Daily activity</h2><div class="stack">
        ${sliderField('weight','Body weight',150,200,1,c.weight,' lb')}
        ${sliderField('walk','Miles walked',0,10,.1,c.walkMiles,' mi')}
        <div class="field"><label>Walking pace</label><select id="walkPace"><option value="2.4" ${c.walkPace==2.4?'selected':''}>2.4 mph</option><option value="2.7" ${c.walkPace==2.7?'selected':''}>2.7 mph</option><option value="3" ${c.walkPace==3?'selected':''}>3.0 mph</option></select></div>
        <div class="row"><input id="lifted" type="checkbox" ${c.lifted?'checked':''}><label for="lifted">Lifted weights today</label></div>
        <div id="liftHoursWrap">${sliderField('liftHours','Lifting duration',1,3,.25,c.liftHours,' hr')}</div>
        ${sliderField('run','Miles ran',0,2,.05,c.runMiles,' mi')}
        <div class="muted small">Running estimate assumes a 5:00 min/mile pace (12 mph).</div>
      </div></div>
      <div class="stack">
        <div class="grid two"><div class="card kpi"><div class="label">EST. MAINTENANCE</div><div class="stat">${fmt(m.total)}</div><div class="muted small">kcal/day</div></div><div class="card kpi"><div class="label">GOAL CALORIES</div><div class="stat">${fmt(g.calories)}</div><div class="muted small">${g.mode} target</div></div></div>
        <div class="card"><h2>Calorie breakdown</h2><div class="stack"><div class="row between"><span>Base maintenance</span><b>${fmt(m.base)}</b></div><div class="row between"><span>Walking</span><b>+${fmt(m.walking)}</b></div><div class="row between"><span>Lifting</span><b>+${fmt(m.lifting)}</b></div><div class="row between"><span>Running</span><b>+${fmt(m.running)}</b></div></div></div>
        <div class="card"><div class="row between"><h2>Goal pace</h2>${paceWarning}</div><div class="stat">${Math.abs(g.weekly).toFixed(2)} lb/week</div><div class="muted">${g.mode==='Cut'?'Loss':g.mode==='Bulk'?'Gain':'Maintenance'} pace over ${g.days} days.</div></div>
      </div>
    </div>
    <div class="grid three" style="margin-top:14px"><div class="card"><div class="label">PROTEIN</div><div class="stat">${g.protein}g</div></div><div class="card"><div class="label">CARBS</div><div class="stat">${g.carbs}g</div></div><div class="card"><div class="label">FAT</div><div class="stat">${g.fat}g</div></div></div>`;
  bindCalorieControls();
}
function bindCalorieControls(){
  const bindRange=(id,key)=>{const e=document.getElementById(id); if(!e)return; e.addEventListener('input',()=>{state.calorie[key]=+e.value; const out=document.getElementById(id+'-v'); if(out) out.textContent=e.value+(id==='weight'?' lb':id==='walk'||id==='run'?' mi':' hr'); localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}); e.addEventListener('change',saveState);};
  bindRange('weight','weight'); bindRange('walk','walkMiles'); bindRange('liftHours','liftHours'); bindRange('run','runMiles');
  const p=document.getElementById('walkPace'); if(p)p.onchange=()=>{state.calorie.walkPace=+p.value;saveState();};
  const l=document.getElementById('lifted'); if(l)l.onchange=()=>{state.calorie.lifted=l.checked;saveState();};
}

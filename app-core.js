const STORAGE_KEY = 'powerbuild-app-v1';

const defaultState = {
  activeTab: 'train',
  rotationIndex: 0,
  trainDate: null,
  sessionStarted: false,
  goal: { currentWeight: 180, targetWeight: 160, deadline: '2027-04-12' },
  strengthGoals: { squat: 405, bench: 315, ohp: 225, deadline: '2027-10-12' },
  calorie: { weight: 180, walkMiles: 3.5, walkPace: 3.0, lifted: true, liftHours: 2, runMiles: 0, protein: 180, fat: 65 },
  bodyweightLogs: [],
  workoutLogs: [],
  rotation: [
    { name: 'Push A', focus: 'Bench strength', exercises: [
      { name:'Bench Press', prescription:'Top set 3–5 @ RPE ~8 + 3 backoff sets 4–6' },
      { name:'Seated Barbell OHP', prescription:'3–4 sets, strength emphasis' },
      { name:'Incline Press', prescription:'3 sets, double progression' },
      { name:'Lateral Raise', prescription:'3–4 sets, hypertrophy' },
      { name:'Pushdown', prescription:'3 sets, hypertrophy' }
    ]},
    { name: 'Pull A', focus: 'Upper-back + lats', exercises: [
      { name:'Barbell Row', prescription:'3–4 hard sets' },
      { name:'Lat Pulldown', prescription:'3 sets, double progression' },
      { name:'Seated Row', prescription:'3 sets' },
      { name:'Rear Delt', prescription:'3 sets' },
      { name:'Longhead Curl', prescription:'3 sets' }
    ]},
    { name: 'Legs A', focus: 'Squat strength', exercises: [
      { name:'Back Squat', prescription:'Top set 3–5 @ RPE ~8 + 3 backoff sets 4–6' },
      { name:'Ham Curl', prescription:'3–4 sets' },
      { name:'Leg Extension', prescription:'3 sets' },
      { name:'Calf Raise', prescription:'4 sets' },
      { name:'Ab Crunch Machine', prescription:'3 sets' }
    ]},
    { name: 'Push B', focus: 'OHP + chest', exercises: [
      { name:'Seated Barbell OHP', prescription:'Top set 3–5 @ RPE ~8 + backoffs' },
      { name:'Bench Press', prescription:'Volume work 4–6 reps' },
      { name:'Incline Press', prescription:'3 sets' },
      { name:'Lateral Raise', prescription:'3–4 sets' },
      { name:'Overhead Single-Arm Cable', prescription:'3 sets' }
    ]},
    { name: 'Pull B', focus: 'Lats + arms', exercises: [
      { name:'Single-Arm Lat Pulldown', prescription:'3 sets each side' },
      { name:'Upper Back Row', prescription:'3 sets' },
      { name:'Pull-Up', prescription:'3 sets' },
      { name:'Rear Delt', prescription:'3 sets' },
      { name:'Shorthead Curl', prescription:'3 sets' }
    ]},
    { name: 'Legs B', focus: 'Squat + posterior chain', exercises: [
      { name:'Back Squat', prescription:'Strength/volume' },
      { name:'Deadlift', prescription:'Controlled heavy work' },
      { name:'Ham Curl', prescription:'3 sets' },
      { name:'Hip Adduction', prescription:'3 sets' },
      { name:'Hip Abduction', prescription:'3 sets' }
    ]}
  ]
};

let state = loadState();
if (!state.trainDate) state.trainDate = todayISO();
if (typeof state.sessionStarted !== 'boolean') state.sessionStarted = false;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return deepMerge(structuredClone(defaultState), saved || {});
  } catch { return structuredClone(defaultState); }
}
function deepMerge(target, src) {
  if (!src || typeof src !== 'object') return target;
  Object.keys(src).forEach(k => {
    if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) target[k] = deepMerge(target[k], src[k]);
    else target[k] = src[k];
  });
  return target;
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); renderAll(); }
function fmt(n) { return Math.round(n).toLocaleString(); }
function clamp(n,a,b){ return Math.min(b,Math.max(a,n)); }
function round5(n){ return Math.max(0, Math.round(n/5)*5); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function daysUntil(date){ const a = new Date(); a.setHours(0,0,0,0); const b = new Date(date+'T00:00:00'); return Math.max(1, Math.ceil((b-a)/86400000)); }
function goalMode(){ const d=state.goal.targetWeight-state.goal.currentWeight; return Math.abs(d)<0.25?'Maintain':d<0?'Cut':'Bulk'; }

function maintenanceEstimate() {
  const c = state.calorie;
  const scale = c.weight / 180;
  const base = 2300 + (c.weight - 180) * 8;
  const walking = c.walkMiles * 62.6 * scale * (0.92 + 0.08*(c.walkPace/3));
  const lifting = c.lifted ? c.liftHours * 200 * scale : 0;
  const running = c.runMiles * 120 * scale;
  return { base, walking, lifting, running, total: base+walking+lifting+running };
}
function goalCalc() {
  const m = maintenanceEstimate().total;
  const days = daysUntil(state.goal.deadline);
  const deltaLb = state.goal.targetWeight - state.goal.currentWeight;
  const dailyDelta = deltaLb * 3500 / days;
  const calories = clamp(m + dailyDelta, 1200, 6000);
  const protein = state.calorie.protein;
  const fat = state.calorie.fat;
  const carbs = round5((calories - protein*4 - fat*9)/4);
  const weekly = deltaLb / days * 7;
  return { days, deltaLb, dailyDelta, calories, protein, fat, carbs, weekly, mode:goalMode() };
}

function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active', p.id===tab));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));

function formatDisplayDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
}
function shiftDate(days) {
  const d = new Date(`${state.trainDate || todayISO()}T00:00:00`);
  d.setDate(d.getDate()+days);
  state.trainDate = d.toISOString().slice(0,10);
  state.sessionStarted = false;
  window._showWorkoutChooser = false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderTrain();
}

function workoutHeader() {
  return `<div class="page-heading">
    <div>
      <div class="page-kicker">POWERBUILD TRACKER</div>
      <h1>Workout logger</h1>
      <p class="page-subtitle">Log every set, track overload, and protect recovery.</p>
    </div>
    <div class="goal-pill" id="headerGoal">${state.goal.targetWeight} lb · ${state.goal.deadline}</div>
  </div>`;
}

function renderTrain(){
  const w = state.rotation[state.rotationIndex % state.rotation.length];
  const el = document.getElementById('train');
  const chooser = window._showWorkoutChooser ? `
    <div class="workout-chooser">
      ${state.rotation.map((item,index)=>`<button class="workout-choice" onclick="startWorkout(${index})"><b>${item.name}</b><span>${item.focus}</span></button>`).join('')}
    </div>` : '';

  const dateBar = `
    <div class="date-toolbar">
      <div class="date-controls">
        <button class="btn icon subtle" onclick="shiftTrainDate(-1)" aria-label="Previous day">‹</button>
        <input class="date-input" id="trainDateInput" type="date" value="${state.trainDate}" onchange="setTrainDate(this.value)" />
        <button class="btn icon subtle" onclick="shiftTrainDate(1)" aria-label="Next day">›</button>
        <button class="btn subtle" onclick="goTrainToday()">Today</button>
      </div>
      <div class="scheduled-label">Scheduled: <b>${w.name}</b></div>
    </div>`;

  if (!state.sessionStarted) {
    el.innerHTML = `${workoutHeader()}${dateBar}
      <div class="card hero-workout">
        <div class="hero-inner">
          <div class="hero-glyph">⚒</div>
          <h2>${w.name}</h2>
          <p>Ready to train? Start this session to record every working set.</p>
          <div class="hero-actions">
            <button class="btn primary" onclick="startWorkout(${state.rotationIndex % state.rotation.length})">＋ Start ${w.name}</button>
            <button class="btn ghost" onclick="toggleWorkoutChooser()">Start another workout</button>
          </div>
          ${chooser}
        </div>
      </div>
      <div class="footer-note">Powerbuild Tracker · Local-first workout log · Estimates are not medical or coaching guarantees.</div>`;
    return;
  }

  el.innerHTML = `${workoutHeader()}${dateBar}
    <div class="card training-card">
      <div class="training-header row between wrap">
        <div>
          <div class="page-kicker" style="margin-bottom:5px">ACTIVE SESSION</div>
          <h2 style="margin-bottom:3px">${w.name}</h2>
          <div class="training-meta">${w.focus} · ${formatDisplayDate(state.trainDate)}</div>
        </div>
        <span class="badge">Workout ${state.rotationIndex%state.rotation.length+1} / ${state.rotation.length}</span>
      </div>
      <div id="exerciseList">${w.exercises.map((x,i)=>`
        <div class="exercise">
          <div class="exercise-title-row">
            <div><h3>${x.name}</h3><div class="small muted" style="margin-top:4px">${x.prescription || ''}</div></div>
            <div class="exercise-actions">
              <button class="btn ghost" onclick="editWorkoutExercise(${state.rotationIndex % state.rotation.length},${i})">Edit</button>
              <button class="btn ghost" onclick="removeWorkoutExercise(${state.rotationIndex % state.rotation.length},${i})">Remove</button>
            </div>
          </div>
          <div class="set-grid">
            <input type="number" min="0" step="2.5" placeholder="Weight" id="wt-${i}" />
            <input type="number" min="0" step="1" placeholder="Reps" id="reps-${i}" />
            <input type="number" min="1" max="10" step="0.5" placeholder="RPE" id="rpe-${i}" />
            <button class="btn subtle" onclick="addSet(${i})">Add set</button>
          </div>
        </div>`).join('')}</div>
      <div class="custom-add">
        <div class="row between wrap"><div><b>Add exercise</b><div class="small muted">Type anything and add it to this workout.</div></div><span class="chip">${w.name}</span></div>
        <div class="custom-add-grid">
          <input id="newExerciseName" type="text" placeholder="Exercise name" autocomplete="off" />
          <input id="newExercisePrescription" type="text" placeholder="Notes / sets / reps (optional)" autocomplete="off" />
          <button class="btn primary" onclick="addExerciseToWorkout(${state.rotationIndex % state.rotation.length})">＋ Add exercise</button>
        </div>
      </div>
      <div class="training-actions">
        <button class="btn primary" onclick="finishWorkout()">Finish workout & advance</button>
        <button class="btn subtle" onclick="advanceWorkout()">Skip / advance</button>
        <button class="btn ghost" onclick="cancelWorkout()">End session</button>
      </div>
    </div>
    <div class="footer-note">Powerbuild Tracker · Local-first workout log · Estimates are not medical or coaching guarantees.</div>`;
}

window.shiftTrainDate = shiftDate;
window.setTrainDate = function(value){ if(!value) return; state.trainDate=value; state.sessionStarted=false; window._showWorkoutChooser=false; localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); renderTrain(); };
window.goTrainToday = function(){ state.trainDate=todayISO(); state.sessionStarted=false; window._showWorkoutChooser=false; localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); renderTrain(); };
window.toggleWorkoutChooser = function(){ window._showWorkoutChooser=!window._showWorkoutChooser; renderTrain(); };
window.startWorkout = function(index){ if(Number.isInteger(index)) state.rotationIndex=index; state.sessionStarted=true; window._showWorkoutChooser=false; window._pendingSets=window._pendingSets||[]; saveState(); };
window.cancelWorkout = function(){ state.sessionStarted=false; window._pendingSets=[]; saveState(); };

window.addSet = function(i){
  const w = state.rotation[state.rotationIndex % state.rotation.length];
  const wt = +document.getElementById(`wt-${i}`).value || 0;
  const reps = +document.getElementById(`reps-${i}`).value || 0;
  const rpe = +document.getElementById(`rpe-${i}`).value || null;
  if(!window._pendingSets) window._pendingSets=[];
  window._pendingSets.push({exercise:w.exercises[i].name, weight:wt, reps, rpe, time:new Date().toISOString()});
  document.getElementById(`wt-${i}`).value='';
  document.getElementById(`reps-${i}`).value='';
  document.getElementById(`rpe-${i}`).value='';
};
window.finishWorkout = function(){
  const w=state.rotation[state.rotationIndex%state.rotation.length];
  state.workoutLogs.push({date:state.trainDate||todayISO(),name:w.name,sets:window._pendingSets||[]});
  window._pendingSets=[];
  state.rotationIndex=(state.rotationIndex+1)%state.rotation.length;
  state.sessionStarted=false;
  saveState();
};
window.advanceWorkout = function(){ state.rotationIndex=(state.rotationIndex+1)%state.rotation.length; state.sessionStarted=false; window._pendingSets=[]; saveState(); };

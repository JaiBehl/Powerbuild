function renderSettings(){
  const g=state.goal,s=state.strengthGoals,c=state.calorie;
  document.getElementById('settings').innerHTML=`
    <div class="grid two">
      <div class="card"><h2>Bodyweight goal</h2><div class="stack"><div class="field"><label>Current weight (lb)</label><input id="currentGoalWeight" type="number" step="0.1" value="${g.currentWeight}"></div><div class="field"><label>Target weight (lb)</label><input id="targetGoalWeight" type="number" step="0.1" value="${g.targetWeight}"></div><div class="field"><label>Deadline</label><input id="goalDeadline" type="date" value="${g.deadline}"></div><button class="btn primary" onclick="saveGoal()">Save goal</button><div class="notice">The app automatically switches between Cut, Bulk, and Maintain based on current vs. target weight.</div></div></div>
      <div class="card"><h2>Macro defaults</h2><div class="stack"><div class="field"><label>Protein (g)</label><input id="proteinInput" type="number" min="100" max="300" step="5" value="${c.protein}"></div><div class="field"><label>Fat (g)</label><input id="fatInput" type="number" min="30" max="150" step="5" value="${c.fat}"></div><button class="btn primary" onclick="saveMacros()">Save macros</button><div class="muted small">Carbs fill the remaining calories after protein and fat.</div></div></div>
      <div class="card"><h2>Strength goals</h2><div class="grid two"><div class="field"><label>Squat</label><input id="sqGoal" type="number" value="${s.squat}"></div><div class="field"><label>Bench</label><input id="bnGoal" type="number" value="${s.bench}"></div><div class="field"><label>Seated OHP</label><input id="ohpGoal" type="number" value="${s.ohp}"></div><div class="field"><label>Deadline</label><input id="strDeadline" type="date" value="${s.deadline}"></div></div><button class="btn primary" style="margin-top:10px" onclick="saveStrengthGoals()">Save strength goals</button></div>
      <div class="card"><h2>Settings & Backup</h2><div class="stack"><button class="btn" onclick="exportData()">Export backup</button><label class="btn" style="text-align:center">Import backup<input id="importFile" type="file" accept="application/json" style="display:none"></label><button class="btn danger" onclick="resetApp()">Reset all app data</button><div class="muted small">Data is stored in this browser on this device. Export a backup before clearing browser data or changing devices.</div></div></div>
    </div>`;
  document.getElementById('importFile').addEventListener('change',importData);
}
window.saveGoal=function(){ state.goal.currentWeight=+document.getElementById('currentGoalWeight').value; state.goal.targetWeight=+document.getElementById('targetGoalWeight').value; state.goal.deadline=document.getElementById('goalDeadline').value; state.calorie.weight=state.goal.currentWeight; saveState(); };
window.saveMacros=function(){ state.calorie.protein=+document.getElementById('proteinInput').value; state.calorie.fat=+document.getElementById('fatInput').value; saveState(); };
window.saveStrengthGoals=function(){ state.strengthGoals.squat=+document.getElementById('sqGoal').value; state.strengthGoals.bench=+document.getElementById('bnGoal').value; state.strengthGoals.ohp=+document.getElementById('ohpGoal').value; state.strengthGoals.deadline=document.getElementById('strDeadline').value; saveState(); };
window.exportData=function(){ const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`powerbuild-backup-${todayISO()}.json`; a.click(); URL.revokeObjectURL(a.href); };
function importData(e){ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{try{state=deepMerge(structuredClone(defaultState),JSON.parse(r.result));saveState();}catch{alert('That backup file could not be read.');}}; r.readAsText(f); }
window.resetApp=function(){ if(confirm('Reset all Powerbuild data on this browser?')){ localStorage.removeItem(STORAGE_KEY); state=structuredClone(defaultState); renderAll(); switchTab('train'); }};

function renderAll(){
  document.getElementById('headerGoal').textContent=`${goalMode()} • ${state.goal.targetWeight} lb`;
  renderTrain(); renderSchedule(); renderProgress(); renderCalories(); renderSettings(); switchTab(state.activeTab || 'train');
}
renderAll();

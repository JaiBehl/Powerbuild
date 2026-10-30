// Merge a generated Apple Notes archive into one Powerbuild profile without replacing
// existing workouts, settings, goals, calories, or locally recorded bodyweight.
export const HISTORICAL_IMPORT_FORMAT='powerbuild-historical-import-v1';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const importedMarker=(id,date)=>'[Apple Notes import: '+id+' / '+date+']';

export function validateHistoricalImport(value){
  if(!value||value.format!==HISTORICAL_IMPORT_FORMAT||
    !Array.isArray(value.sessions)||!Array.isArray(value.weights)||
    !value.metadata?.importId||
    value.sessions.length>5000||value.weights.length>30000){
    throw Error('Not a supported Powerbuild historical-import JSON file.');
  }
  for(const s of value.sessions){
    if(!DATE.test(s?.date||'')||!Array.isArray(s.exercises)||
      s.exercises.length>200||s.exercises.some(e=>!e?.name||!Array.isArray(e.sets)||e.sets.length>300)){
      throw Error('An imported workout contains an invalid date or exercise structure.');
    }
  }
  for(const w of value.weights){
    if(!DATE.test(w?.date||'')||!Number.isFinite(Number(w.weight))||
      Number(w.weight)<=0||Number(w.weight)>1000){
      throw Error('An imported bodyweight entry is invalid.');
    }
  }
  return value;
}

export function mergeHistoricalImport(db,raw){
  const incoming=validateHistoricalImport(raw);
  const existingSessions=Array.isArray(db.sessions)?db.sessions:[];
  const sessions=[...existingSessions];
  const dates=new Map(sessions.map((s,i)=>[s.date,i]));
  const counts={newSessions:0,addedExercises:0,addedWeights:0,skippedExistingExercises:0,skippedExistingWeights:0};
  const importId=incoming.metadata.importId;

  for(const source of incoming.sessions){
    const marker=importedMarker(importId,source.date);
    const i=dates.get(source.date);
    if(i===undefined){
      dates.set(source.date,sessions.length);
      sessions.push({...source,notes:marker+'\n'+String(source.notes||'')});
      counts.newSessions++;
      counts.addedExercises+=source.exercises.length;
      continue;
    }
    const current=sessions[i];
    const exercises=Array.isArray(current.exercises)?current.exercises:[];
    const knownIds=new Set(exercises.map(x=>String(x.id)));
    const knownNames=new Set(exercises.map(x=>x.name.toLocaleLowerCase().trim()));
    const additions=[];
    for(const ex of source.exercises){
      if(knownIds.has(String(ex.id))||knownNames.has(ex.name.toLocaleLowerCase().trim())){
        counts.skippedExistingExercises++;
        continue;
      }
      additions.push(ex);
      knownIds.add(String(ex.id));
      knownNames.add(ex.name.toLocaleLowerCase().trim());
    }
    // Preserve source text even when an existing same-name exercise is kept.
    // Subsequent re-imports do not append the same notes twice.
    const notes=String(current.notes||'').includes(marker)?
      String(current.notes||''):
      [current.notes,marker+'\n'+String(source.notes||'')].filter(Boolean).join('\n\n');
    sessions[i]={...current,notes,exercises:[...exercises,...additions]};
    counts.addedExercises+=additions.length;
  }

  const weights=[...(Array.isArray(db.weights)?db.weights:[])];
  const dateSet=new Set(weights.map(w=>w.date));
  const idSet=new Set(weights.map(w=>String(w.id)));
  for(const weight of incoming.weights){
    if(idSet.has(String(weight.id))||dateSet.has(weight.date)){
      // Keep existing same-day measurements if there is a potential conflict.
      counts.skippedExistingWeights++;
      continue;
    }
    weights.push(weight);
    dateSet.add(weight.date);
    idSet.add(String(weight.id));
    counts.addedWeights++;
  }

  sessions.sort((a,b)=>a.date.localeCompare(b.date));
  weights.sort((a,b)=>a.date.localeCompare(b.date));
  return {db:{...db,sessions,weights},counts};
}

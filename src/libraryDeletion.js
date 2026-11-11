import {programCycle} from './programLibrary.js';
const key=name=>String(name||'').trim().toLowerCase();
export function deleteExerciseDefinition(db,id){
 const entry=db.exerciseLibrary?.find(e=>e.id===id);if(!entry)throw Error('Exercise no longer exists.');
 return {...db,exerciseLibrary:db.exerciseLibrary.filter(e=>e.id!==id),deletedExerciseIds:[...new Set([...(db.deletedExerciseIds||[]),id])],deletedExerciseNames:[...new Set([...(db.deletedExerciseNames||[]),key(entry.name)])]};
}
export function deleteWorkoutDefinition(db,id){
 const found=Object.entries(db.workoutMeta||{}).find(([,m])=>m.id===id);if(!found)throw Error('Workout no longer exists.');
 const [name]=found,templates={...db.templates},workoutMeta={...db.workoutMeta};delete templates[name];delete workoutMeta[name];
 const settings={...db.settings,workoutCycle:programCycle(db.settings).map(n=>n===name?null:n),weekdayWorkouts:Object.fromEntries(Object.entries(db.settings.weekdayWorkouts||{}).map(([d,n])=>[d,n===name?null:n]))};
 return {...db,templates,workoutMeta,settings};
}
export function deleteSavedSchedule(db,id){if(!db.savedSchedules?.some(e=>e.id===id))throw Error('Split no longer exists.');return {...db,savedSchedules:db.savedSchedules.filter(e=>e.id!==id)};}
export function confirmLibraryDeletion(kind,name,detail){return window.prompt('Permanently delete '+kind+' “'+name+'”?\n\n'+detail+'\n\nA recovery copy must be saved first. Existing backups may still contain it. Type the exact name to confirm:', '')===name;}

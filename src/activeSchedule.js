import {cycle} from './data.js';
export function scheduledWorkoutNames(settings){return [...new Set((settings.scheduleMode==='weekdays'?Object.values(settings.weekdayWorkouts||{}):Array.isArray(settings.workoutCycle)?settings.workoutCycle:cycle).filter(Boolean))];}

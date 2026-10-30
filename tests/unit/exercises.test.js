import test from 'node:test';import assert from 'node:assert/strict';
import {resolveExerciseName,setExerciseAlias,buildStrengthHistory} from '../../src/exerciseCatalog.js';
const session=(date,name,weight)=>({date,exercises:[{name,sets:[{weight,reps:5,done:true}]}]});
test('standard bench names share history and do not rewrite source logs',()=>{const sessions=[session('2026-10-29','Barbell bench press',180),session('2026-10-30','Touch-and-go bench press',190)];const h=buildStrengthHistory(sessions);assert.equal(Object.keys(h).length,1);assert.equal(Object.keys(h['Touch-and-go bench press']).length,2);assert.equal(sessions[0].exercises[0].name,'Barbell bench press');});
test('paused/incline/standing variations remain separate',()=>{for(const name of ['Paused bench press','Incline bench press','Standing barbell OHP'])assert.equal(resolveExerciseName(name),name);});
test('custom links are case insensitive, reversible and can opt out of defaults',()=>{let a=setExerciseAlias({},' DB press ','Dumbbell bench press');assert.equal(resolveExerciseName('db   press',a),'Dumbbell bench press');a=setExerciseAlias(a,'Barbell bench press','Barbell bench press');assert.equal(resolveExerciseName('Barbell bench press',a),'Barbell bench press');});
test('cycles are rejected without altering existing links',()=>{const a=setExerciseAlias({},'A','B');assert.throws(()=>setExerciseAlias(a,'B','A'),/cycle/);assert.deepEqual(a,{a:'B'});});

import {exerciseNames,selectedExerciseName} from '../../src/exerciseCatalog.js';
import {makeDb} from '../fixtures.js';
test('removing an alias leaves record and chart selectors on a valid movement',()=>{const db=makeDb();db.exerciseAliases=setExerciseAlias({},'Barbell bench press','Custom flat press');assert.ok(exerciseNames(db).includes('Custom flat press'));db.exerciseAliases={};const selected=selectedExerciseName('Custom flat press',db);assert.equal(selected,'Touch-and-go bench press');assert.ok(exerciseNames(db).includes(selected));});

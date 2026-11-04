import test from 'node:test';import assert from 'node:assert/strict';
import {makeDb,makeSession} from '../fixtures.js';
import {normalizeTemplates,editSessionExercise,removeSessionExercise,addSessionExercise,moveSessionExercise} from '../../src/workoutOperations.js';
test('editing and removing a session exercise leave future templates intact by default',()=>{const s=makeSession();const db=makeDb({sessions:[s]});const edited=editSessionExercise(db,s.id,s.exercises[0].id,{name:'Only today'});assert.deepEqual(edited.templates,db.templates);const removed=removeSessionExercise(db,s.id,s.exercises[0].id);assert.deepEqual(removed.templates,db.templates);assert.equal(db.sessions[0].exercises.length,s.exercises.length);});
test('old reordered session updates the correct template by unique name',()=>{const s=makeSession();s.exercises.reverse();s.exercises.forEach(e=>delete e.templateId);const db=makeDb({sessions:[s]});const target=s.exercises.find(e=>e.name==='Supported seated barbell OHP');const edited=editSessionExercise(db,s.id,target.id,{name:'Supported press'},true);assert.equal(edited.templates['Push A'][0][0],'Barbell bench press');assert.equal(edited.templates['Push A'][1][0],'Supported press');});
test('stable identity remains correct after rename and reorder',()=>{const db=makeDb({templates:normalizeTemplates(makeDb().templates),sessions:[makeSession()]});const s=db.sessions[0],ex=s.exercises[0];let value=editSessionExercise(db,s.id,ex.id,{name:'Renamed bench'},true);value.templates['Push A'].reverse();value=removeSessionExercise(value,s.id,ex.id,true);assert.equal(value.templates['Push A'].some(row=>row[0]==='Renamed bench'),false);assert.equal(value.templates['Push A'].some(row=>row[0]==='Supported seated barbell OHP'),true);});
test('ambiguous legacy link refuses to modify templates',()=>{const s=makeSession();delete s.exercises[0].templateId;const db=makeDb({sessions:[s]});db.templates['Push A'].push([...db.templates['Push A'][0]]);assert.throws(()=>editSessionExercise(db,s.id,s.exercises[0].id,{name:'Unsafe'},true),/uniquely linked/);});
test('adding to only a session or to its future template is explicit',()=>{const db=makeDb({sessions:[makeSession()]});const s=db.sessions[0];assert.equal(addSessionExercise(db,s.id,'Synthetic curl').templates['Push A'].length,6);assert.equal(addSessionExercise(db,s.id,'Synthetic curl',true).templates['Push A'].length,7);});

test('reordering a session moves entire exercises with completed sets but not its template or other sessions',()=>{
 const s=makeSession(),later=makeSession('Push A','2026-10-31');
 s.exercises[0].sets[0]={weight:185,reps:5,rpe:8,done:true,tag:'Top'};
 const db=makeDb({sessions:[s,later]});
 const before=structuredClone(db);
 const moved=moveSessionExercise(db,s.id,s.exercises[0].id,1);
 assert.equal(moved.sessions[0].exercises[0].name,'Supported seated barbell OHP');
 assert.equal(moved.sessions[0].exercises[1].id,s.exercises[0].id);
 assert.deepEqual(moved.sessions[0].exercises[1].sets[0],{weight:185,reps:5,rpe:8,done:true,tag:'Top'});
 assert.deepEqual(moved.sessions[1],later);
 assert.deepEqual(moved.templates,db.templates);
 assert.deepEqual(db,before);
 assert.equal(moveSessionExercise(moved,s.id,s.exercises[0].id,-1).sessions[0].exercises[0].name,'Barbell bench press');
 assert.equal(moveSessionExercise(db,s.id,s.exercises[0].id,-1),db);
 assert.throws(()=>moveSessionExercise(db,s.id,s.exercises[0].id,2),/up or down/);
});

test('opted-in session reorder swaps linked workout template rows by identity and keeps other session logs unchanged',()=>{
 const s=makeSession(),later=makeSession('Push A','2026-11-01');
 const db=makeDb({sessions:[s,later]});
 const moved=moveSessionExercise(db,s.id,s.exercises[0].id,1,true);
 assert.equal(moved.templates['Push A'][0][0],'Supported seated barbell OHP');
 assert.equal(moved.templates['Push A'][1][0],'Barbell bench press');
 assert.deepEqual(moved.sessions[1],later);
 assert.equal(moved.workoutMeta['Push A'].revisions.length,1);
 assert.equal(db.templates['Push A'][0][0],'Barbell bench press');
});

test('future template reorder resolves legacy names rather than using a session index',()=>{
 const s=makeSession();s.exercises.reverse();s.exercises.forEach(e=>delete e.templateId);
 const db=makeDb({sessions:[s]});
 const bench=s.exercises.find(e=>e.name==='Barbell bench press');
 const next=moveSessionExercise(db,s.id,bench.id,-1,true);
 assert.equal(next.templates['Push A'][0][0],'Supported seated barbell OHP');
 assert.equal(next.templates['Push A'][1][0],'Barbell bench press');
 assert.equal(next.sessions[0].exercises.at(-2).name,'Barbell bench press');
 const duplicate=makeDb({sessions:[s]});
 duplicate.templates['Push A'].push([...duplicate.templates['Push A'][0]]);
 assert.throws(()=>moveSessionExercise(duplicate,s.id,bench.id,-1,true),/uniquely linked/);
 assert.equal(duplicate.sessions[0].exercises.at(-1).name,'Barbell bench press');
 assert.equal(duplicate.templates['Push A'][0][0],'Barbell bench press');
});

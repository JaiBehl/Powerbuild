import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateStrength,e1rm,strengthModel} from '../../src/strengthEstimation.js';
import {buildStrengthHistory} from '../../src/exerciseCatalog.js';
import {personalRecords} from '../../src/trainingStats.js';
import {makeDb} from '../fixtures.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('published population points invert to their stated percentages',()=>{
  // Effective repetitions can be fractional through RPE, not fractional reps.
  close(e1rm(95,3,9.72),100); // 3.28 reps at 95%, general Fig 2
  close(e1rm(90,4,9.89,'bench'),100); // 4.11 at 90%, Fig 3
  close(e1rm(90,8,9.31,'Leg press'),100); // 8.69 at 90%, Fig 4
});
test('RPE adjusts capacity using reps in reserve, including half-point effort',()=>{
  close(e1rm(200,5,8,'bench'),e1rm(200,7,10,'bench'));
  const a=e1rm(200,5,8.5,'bench');assert.ok(a>e1rm(200,5,9,'bench')&&a<e1rm(200,5,8,'bench'));
  assert.equal(estimateStrength(200,5,8).repsToFailure,7);
});
test('singles preserve achievement and only predict capacity when effort supports it',()=>{
  assert.equal(e1rm(225,1),225);assert.equal(e1rm(225,1,10),225);
  assert.ok(e1rm(225,1,8)>225);assert.equal(estimateStrength(225,1).kind,'achieved');
});
test('blank RPE is an explicit failure assumption rather than a fabricated effort',()=>{
  for(const rpe of ['',null,undefined,' ']){const p=estimateStrength(200,5,rpe);assert.equal(p.missingRpe,true);assert.equal(p.rpe,null);close(p.value,e1rm(200,5,10));}
});
test('invalid, easy and excessive effective-rep sets do not produce predictions',()=>{
  for(const [w,r,rpe] of [[0,5,8],[Infinity,5,8],[200,0,8],[200,1.5,8],[200,11,10],[200,9,8],[200,5,6.5],[200,5,0],[200,5,11],[200,5,'bad'],[200,5,true],[null,5,8]])assert.equal(e1rm(w,r,rpe),null);
});
test('all curves are monotonic in load, reps and reserve without unit dependence',()=>{
  for(const name of ['bench','Barbell back squat','Leg press']){
    let previous=0;for(let reps=1;reps<=10;reps++){const n=e1rm(200,reps,10,name);assert.ok(n>=previous&&n>=200);previous=n;close(e1rm(100,reps,10,name),n/2);}
  }
  assert.equal(strengthModel('Supported seated barbell OHP'),'general');
  assert.equal(strengthModel('Incline dumbbell bench press'),'general');
});
test('chart, goals and records share RPE and alias resolution without altering logs',()=>{
  const sessions=[{date:'2026-10-30',exercises:[{name:'Custom press',sets:[{weight:200,reps:5,rpe:8,done:true},{weight:500,reps:5,rpe:6,done:true},{weight:600,reps:5,rpe:8,done:false}]}]}];
  const db=makeDb({sessions,exerciseAliases:{'custom press':'Touch-and-go bench press'}}),before=structuredClone(db);
  const value=buildStrengthHistory(sessions,db.exerciseAliases)['Touch-and-go bench press']['2026-10-30'];
  close(value,239.4822006472492);close(personalRecords(db,'Custom press','2026-10-30').all.estimated.value,value);assert.deepEqual(db,before);
});
test('easy singles and high-rep achievements survive while prediction gates exclude them',()=>{
  const sessions=[{date:'2026-10-30',exercises:[{name:'bench',sets:[{weight:225,reps:1,rpe:6,done:true},{weight:150,reps:15,rpe:10,done:true}]}]}];
  const db=makeDb({sessions}),r=personalRecords(db,'bench','2026-10-30').all;
  assert.equal(r.single.value,225);assert.equal(r.repPRs[15].value,150);assert.equal(r.estimated,null);
  assert.equal(buildStrengthHistory(sessions)['Touch-and-go bench press']['2026-10-30'],225);
});

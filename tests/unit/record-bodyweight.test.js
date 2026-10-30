import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyweightAtDate,createBodyweightResolver} from '../../src/recordBodyweight.js';
import {personalRecords} from '../../src/trainingStats.js';
import {makeDb} from '../fixtures.js';
const entry=(date,weight)=>({date,weight});
const session=(date,weight,reps)=>({date,exercises:[{name:'Barbell bench press',sets:[{weight,reps,done:true,rpe:8}]}]});
test('same-day bodyweight averages valid measurements without mutating the log',()=>{
 const weights=[entry('2026-10-01',178),entry('2026-10-01','182'),entry('2026-10-01',null),entry('2026-10-01',0),entry('2026-10-01',Infinity),entry('2026-02-30',120),entry('2026-10-01',true)];const before=structuredClone(weights);
 assert.deepEqual(bodyweightAtDate(weights,'2026-10-01'),{value:180,method:'same-day',estimated:false,sources:[entry('2026-10-01',180)]});assert.deepEqual(weights,before);
});
test('interpolation uses actual calendar spacing across months and leap days',()=>{
 const weights=[entry('2024-03-03',184),entry('2024-02-28',174)];
 const result=bodyweightAtDate(weights,'2024-02-29','2024-03-03');assert.equal(result.value,176.5);assert.equal(result.method,'interpolated');assert.equal(result.estimated,true);assert.deepEqual(result.sources,[weights[1],weights[0]]);
});
test('nearby one-sided weigh-ins are labelled estimates including their distance',()=>{
 const before=bodyweightAtDate([entry('2026-10-01',180)],'2026-10-03');assert.equal(before.value,180);assert.equal(before.method,'nearest');assert.equal(before.daysAway,2);
 const after=bodyweightAtDate([entry('2026-10-04',182)],'2026-10-03','2026-10-04');assert.equal(after.value,182);assert.equal(after.daysAway,1);
});
test('missing/stale weights never silently substitute current or default bodyweight',()=>{
 const weights=[entry('2026-01-01',160),entry('2026-10-01',200)];assert.equal(bodyweightAtDate(weights,'2026-05-01','2026-10-30'),null);assert.equal(bodyweightAtDate([],'2026-10-30'),null);
 assert.equal(bodyweightAtDate([entry('2026-10-01',180)],'2026-10-31').value,180);assert.equal(bodyweightAtDate([entry('2026-10-01',180)],'2026-11-01'),null);
});
test('through-date cutoff excludes future measurements even when they match a later lookup',()=>{
 const resolve=createBodyweightResolver([entry('2026-10-01',180),entry('2026-10-11',200)],'2026-10-06');assert.equal(resolve('2026-10-06').value,180);assert.equal(resolve('2026-10-06').method,'nearest');assert.equal(resolve('2026-10-11'),null);assert.equal(resolve('not-a-date'),null);
});
test('one nearby measurement is used when the other bracketing point is stale',()=>{
 const result=bodyweightAtDate([entry('2026-01-01',150),entry('2026-10-05',180)],'2026-10-01','2026-10-30');assert.equal(result.method,'nearest');assert.equal(result.value,180);assert.equal(result.daysAway,4);
});
test('each absolute record keeps bodyweight for its own achievement date',()=>{
 const db=makeDb({weights:[entry('2026-01-01',200),entry('2026-10-01',180),entry('2026-10-11',190)],sessions:[session('2026-01-01',225,1),session('2026-10-06',210,5)]});const before=structuredClone(db),result=personalRecords(db,'Touch-and-go bench press','2026-10-30');
 assert.equal(result.all.single.bodyweight.value,200);assert.equal(result.all.estimated.bodyweight.value,185);assert.equal(result.all.repPRs[5].bodyweight.method,'interpolated');assert.equal(result.recent.single,null);assert.deepEqual(db,before);
 const noWeight=personalRecords(makeDb({sessions:[session('2026-01-01',225,1)]}),'Barbell bench press','2026-10-30');assert.equal(noWeight.all.single.value,225);assert.equal(noWeight.all.single.bodyweight,null);
});

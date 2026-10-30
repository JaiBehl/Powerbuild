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
test('relative singles and rep PRs select their own sets rather than dividing absolute winners',()=>{
 const db=makeDb({weights:[entry('2026-01-01',200),entry('2026-10-01',170)],sessions:[session('2026-01-01',225,1),session('2026-10-01',215,1),session('2026-01-01',200,5),session('2026-10-01',190,5)]});
 const r=personalRecords(db,'Touch-and-go bench press','2026-10-30');assert.equal(r.all.single.value,225);assert.equal(r.all.relative.single.load,215);assert.equal(r.all.relative.single.value,215/170);assert.equal(r.all.repPRs[5].value,200);assert.equal(r.all.relative.repPRs[5].load,190);assert.equal(r.all.relative.repPRs[5].value,190/170);assert.equal(r.recent.relative.single.date,'2026-10-01');
});
test('RPE-aware relative estimates use prediction at the set date and preserve missing-effort labels',()=>{
 const a=session('2026-10-01',200,5),b=session('2026-10-11',180,5);b.exercises[0].sets[0].rpe='';
 const db=makeDb({weights:[entry('2026-10-01',200),entry('2026-10-11',170)],sessions:[a,b]});const r=personalRecords(db,'Barbell bench press','2026-10-30').all;
 assert.equal(r.estimated.date,'2026-10-01');assert.equal(r.relative.estimated.date,'2026-10-11');assert.equal(r.relative.estimated.value,r.relative.estimated.load/170);assert.equal(r.relative.estimated.missingRpe,true);
});
test('relative records use interpolated bodyweight and omit unavailable, failed and future sets',()=>{
 const failed=session('2026-10-06',900,0),future=session('2026-10-31',900,1);
 const db=makeDb({weights:[entry('2026-10-01',170),entry('2026-10-11',190)],sessions:[session('2026-01-01',500,1),session('2026-10-06',225,1),failed,future]});const r=personalRecords(db,'Barbell bench press','2026-10-30').all;
 assert.equal(r.single.value,500);assert.equal(r.single.bodyweight,null);assert.equal(r.relative.single.value,225/180);assert.equal(r.relative.single.bodyweight.method,'interpolated');assert.equal(r.relative.count,1);assert.equal(r.relative.missingBodyweight,1);
});
test('relative comparisons retain full precision and keep the earliest equal-ratio achievement',()=>{
 const db=makeDb({weights:[entry('2026-10-01',200),entry('2026-10-02',200),entry('2026-10-03',200)],sessions:[session('2026-10-03',200.02,1),session('2026-10-02',200.02,1),session('2026-10-01',200.01,1)]});
 const r=personalRecords(db,'Barbell bench press','2026-10-30').all.relative.single;assert.equal(r.date,'2026-10-02');assert.equal(r.value,200.02/200);
});
test('lb and kg preserve relative ranking without writing derived fields into backups',()=>{
 const db=makeDb({weights:[entry('2026-10-01',180)],sessions:[session('2026-10-01',225,1)]}),before=structuredClone(db);const pounds=personalRecords(db,'Barbell bench press','2026-10-30');
 db.settings.units='kg';const kilograms=personalRecords(db,'Barbell bench press','2026-10-30');assert.equal(kilograms.all.relative.single.value,pounds.all.relative.single.value);assert.equal(kilograms.all.relative.single.value,1.25);db.settings.units=before.settings.units;assert.deepEqual(db,before);
 const noWeight=personalRecords(makeDb({sessions:db.sessions}),'Barbell bench press','2026-10-30');assert.equal(noWeight.all.relative.single,null);assert.equal(noWeight.all.relative.count,0);
});
test('bodyweight and assisted movements keep absolute loads but do not rank added load as total resistance',()=>{
 for(const name of ['Weighted pull-up','Assisted chin-up','Bodyweight squat','Dips']){
  const s=session('2026-10-01',45,1);s.exercises[0].name=name;const r=personalRecords(makeDb({weights:[entry('2026-10-01',180)],sessions:[s]}),name,'2026-10-30').all;
  assert.equal(r.single.value,45);assert.equal(r.relative.supported,false);assert.equal(r.relative.single,null);assert.deepEqual(r.relative.repPRs,{});
 }
});

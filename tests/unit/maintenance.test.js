import test from 'node:test';
import assert from 'node:assert/strict';
import {restingMetabolism,maintenanceEstimate} from '../../src/maintenance.js';
import {calculateNutrition,updateDayPlan,normalizeDayPlans} from '../../src/nutrition.js';
import {validateProfileDb} from '../../src/backupSafety.js';
import {makeDb} from '../fixtures.js';
const close=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
test('reference maintenance is derived from athlete RMR and net activity, not a fixed anchor',()=>{
  const n=calculateNutrition(makeDb(),'2026-10-30');
  close(n.rmr,2108.4119772213694);assert.equal(n.baseline,2530);
  close(n.walkExtra,314.30034275372975);close(n.liftExtra,321.48359224461257);assert.equal(n.maintenance,3166);
});
test('equations preserve their sex terms and restrict the athlete age domain',()=>{
  close(restingMetabolism(180,71,25,'male').rmr-restingMetabolism(180,71,25,'female').rmr,799.257/4.184);
  close(restingMetabolism(180,71,25,'male','mifflin').rmr-restingMetabolism(180,71,25,'female','mifflin').rmr,166);
  assert.equal(restingMetabolism(180,71,36,'male').method,'mifflin');
  assert.equal(restingMetabolism(180,71,17,'male').adult,false);
  for(const equation of ['tenHaaf','mifflin']){
    const reference=restingMetabolism(180,71,25,'male',equation).rmr;
    assert.ok(restingMetabolism(180,72,25,'male',equation).rmr>reference);
    assert.ok(restingMetabolism(185,71,25,'male',equation).rmr>reference);
    assert.ok(restingMetabolism(180,71,26,'male',equation).rmr<reference);
  }
});
test('zero activity adds no calories and manual baselines remain independent of formulas',()=>{
  const settings={baselineMode:'custom',customBaseline:2300,milesWalked:0,milesRun:0,lifted:false,liftHours:3,liftMet:6};
  assert.equal(maintenanceEstimate(settings,180).maintenance,2300);
  assert.equal(maintenanceEstimate({...settings,rmrEquation:'mifflin'},180).baseline,2300);
  assert.equal(maintenanceEstimate(settings,180,100).maintenance,2400);
});
test('walking and running scale with mass and walking accounts for pace and height',()=>{
  const a=maintenanceEstimate({milesWalked:4,milesRun:1,walkMinutesPerMile:22.5},180);
  const b=maintenanceEstimate({milesWalked:4,milesRun:1,walkMinutesPerMile:22.5},360);
  close(b.walkExtra,a.walkExtra*2);close(b.runExtra,a.runExtra*2);
  assert.notEqual(a.walkExtra,maintenanceEstimate({milesWalked:4,walkMinutesPerMile:18},180).walkExtra);
  assert.ok(a.walkExtra>maintenanceEstimate({milesWalked:4,heightIn:80},180).walkExtra);
  close(a.runExtra,131.39750864185748);
});
test('lifting uses net METs with session duration and bodyweight, not a fixed hourly bonus',()=>{
  const s={lifted:true,liftHours:1,liftMet:3.5};const a=maintenanceEstimate(s,180);
  close(maintenanceEstimate({...s,liftMet:6},180).liftExtra,a.liftExtra*2);
  close(maintenanceEstimate({...s,liftHours:2},180).liftExtra,a.liftExtra*2);
  close(maintenanceEstimate(s,360).liftExtra,a.liftExtra*2);
  assert.equal(maintenanceEstimate({...s,lifted:false},180).liftExtra,0);
});
test('known total maintenance replaces all activity rather than adding it twice',()=>{
  const n=maintenanceEstimate({maintenanceMode:'custom',customMaintenance:2700,customBaseline:2300,baselineMode:'custom',milesWalked:15,milesRun:10,lifted:true,liftHours:3,liftMet:6},180,500);
  assert.equal(n.maintenance,2700);assert.ok(n.estimatedMaintenance>5000);
  const invalid=maintenanceEstimate({maintenanceMode:'custom',customMaintenance:0},180);
  assert.equal(invalid.maintenanceMode,'custom');assert.equal(invalid.maintenanceOverrideValid,false);assert.equal(invalid.maintenance,invalid.estimatedMaintenance);
});
test('new model choices and known maintenance are isolated by date and survive backups',()=>{
  let db=updateDayPlan(makeDb(),'2026-10-29',{calorieSettings:{rmrEquation:'mifflin',walkMinutesPerMile:20,liftMet:6,maintenanceMode:'custom',customMaintenance:3000}});
  const before=structuredClone(db);db=normalizeDayPlans(JSON.parse(JSON.stringify(validateProfileDb(db))));
  assert.equal(calculateNutrition(db,'2026-10-29').maintenance,3000);assert.equal(calculateNutrition(db,'2026-10-30').rmrMethod,'tenHaaf');
  assert.deepEqual(db,before);assert.equal(calculateNutrition(db,'2026-10-30').cs.liftMet,3.5);
});
test('invalid model inputs stay finite and malformed new backup fields are rejected',()=>{
  const n=maintenanceEstimate({heightIn:Infinity,age:NaN,baselineFactor:'bad',milesWalked:-4,milesRun:Infinity,lifted:true,liftHours:Infinity,liftMet:'bad',walkMinutesPerMile:0},NaN,Infinity);
  for(const key of ['rmr','baseline','walkExtra','runExtra','liftExtra','maintenance'])assert.equal(Number.isFinite(n[key]),true);
  for(const key of ['baselineFactor','customMaintenance','walkMinutesPerMile','liftMet'])assert.throws(()=>validateProfileDb(makeDb({calorieSettings:{[key]:'invalid'}})),/number/);
});

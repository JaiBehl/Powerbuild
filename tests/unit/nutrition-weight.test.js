import test from 'node:test';import assert from 'node:assert/strict';
import {makeDb} from '../fixtures.js';
import {calculateNutrition,normalizeDayPlans,setNutritionWeightMode,updateDayPlan} from '../../src/nutrition.js';
test('reconnecting yesterday follows new weigh-ins on future dates and survives normalization and backup round trips',()=>{
 let db=makeDb({calorieSettings:{weightMode:'manual',bodyWeight:220,milesWalked:4},weights:[{date:'2026-10-29',weight:180}]});
 db=setNutritionWeightMode(db,'2026-10-29','auto');db.weights.push({date:'2026-10-30',weight:185});db=normalizeDayPlans(JSON.parse(JSON.stringify(db)));
 assert.equal(calculateNutrition(db,'2026-10-29').weight,180);const n=calculateNutrition(db,'2026-10-30');assert.equal(n.weight,185);assert.equal(n.cs.weightMode,'auto');assert.equal(db.calorieSettings.weightMode,'auto');assert.equal(db.calorieSettings.bodyWeight,null);assert.notEqual(n.maintenance,calculateNutrition(db,'2026-10-29').maintenance);
});
test('reconnecting preserves other saved manual days and food/cardio/target settings',()=>{
 let db=makeDb({calorieSettings:{weightMode:'manual',bodyWeight:220},weights:[{date:'2026-10-29',weight:180}]});db=updateDayPlan(db,'2026-10-28',{calorieSettings:{weightMode:'manual',bodyWeight:210,customCalorieTarget:2000,calorieTargetMode:'custom'}});db.calories[0].items=[{id:'food',calories:100}];db.calories[0].cardio=[{id:'cardio',calories:50}];const saved=structuredClone(db.calories[0]);
 db=setNutritionWeightMode(db,'2026-10-29','auto');assert.deepEqual(db.calories.find(d=>d.date==='2026-10-28'),saved);assert.equal(calculateNutrition(db,'2026-10-28').weight,210);assert.equal(calculateNutrition(db,'2026-10-28').target,2000);assert.equal(calculateNutrition(db,'2026-10-30').weight,180);
});
test('selecting manual weight starts with the current weigh-in rather than an old parked override',()=>{
 const db=makeDb({calorieSettings:{weightMode:'auto',bodyWeight:220},weights:[{date:'2026-10-30',weight:185}]});const next=setNutritionWeightMode(db,'2026-10-30','manual');assert.equal(calculateNutrition(next,'2026-10-30').weight,185);assert.equal(calculateNutrition(next,'2026-10-30').weightSource,'manual');assert.equal(next.calorieSettings.weightMode,'auto');assert.throws(()=>setNutritionWeightMode(db,'2026-10-30','invalid'));
});
test('automatic nutrition weight ignores invalid/future measurements, uses the newest same-day entry, and identifies fallback',()=>{
 const weights=[{date:'2026-10-29',weight:180},{date:'2026-10-30',weight:185},{date:'2026-10-30',weight:186},{date:'2026-10-30',weight:0},{date:'2026-10-30',weight:Infinity},{date:'2026-10-31',weight:190},{date:'not-a-date',weight:500}];const db=makeDb({weights});const before=structuredClone(db);const n=calculateNutrition(db,'2026-10-30');assert.equal(n.weight,186);assert.equal(n.weightSource,'weigh-in');assert.equal(n.weightDate,'2026-10-30');assert.equal(calculateNutrition(db,'2026-10-29').weight,180);assert.deepEqual(db,before);
 const fallback=calculateNutrition(makeDb(),'2026-10-30');assert.equal(fallback.weight,180);assert.equal(fallback.weightSource,'fallback');assert.equal(fallback.weightDate,null);
});

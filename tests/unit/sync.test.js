import test from 'node:test';import assert from 'node:assert/strict';
import {makeDb} from '../fixtures.js';
import {mergeCloudSnapshots,validCloudSnapshot} from '../../src/syncMerge.js';
const snap=()=>({profileState:{profiles:[{id:'test',name:'Test'}],activeProfileId:'test'},profileData:{test:makeDb()}});
test('separate device records merge without dropping either',()=>{const base=snap(),a=structuredClone(base),b=structuredClone(base);a.profileData.test.weights.push({date:'2026-10-29',weight:180});b.profileData.test.calories.push({date:'2026-10-30',items:[{id:'food',calories:100}],cardio:[]});const result=mergeCloudSnapshots(base,a,b);assert.deepEqual(result.conflicts,[]);assert.equal(result.snapshot.profileData.test.weights.length,1);assert.equal(result.snapshot.profileData.test.calories.length,1);});
test('different edits to the same value require a choice',()=>{const base=snap();base.profileData.test.weights=[{date:'2026-10-30',weight:180}];const a=structuredClone(base),b=structuredClone(base);a.profileData.test.weights[0].weight=185;b.profileData.test.weights[0].weight=190;assert.ok(mergeCloudSnapshots(base,a,b).conflicts.some(p=>p.includes('weight')));});
test('a deletion is preserved against unchanged remote but conflicts against edits',()=>{const base=snap();base.profileData.test.weights=[{date:'2026-10-30',weight:180}];const a=structuredClone(base),b=structuredClone(base);a.profileData.test.weights=[];assert.equal(mergeCloudSnapshots(base,a,b).snapshot.profileData.test.weights.length,0);b.profileData.test.weights[0].weight=190;assert.ok(mergeCloudSnapshots(base,a,b).conflicts.length);});
test('different new records with date identities are combined',()=>{const base=snap(),a=structuredClone(base),b=structuredClone(base);a.profileData.test.weights=[{date:'2026-10-29',weight:180}];b.profileData.test.weights=[{date:'2026-10-30',weight:181}];assert.equal(mergeCloudSnapshots(base,a,b).snapshot.profileData.test.weights.length,2);});
test('snapshot validation rejects missing profile databases and malformed sessions',()=>{assert.equal(validCloudSnapshot(snap()),true);const a=snap();a.profileData.test.sessions=[{}];assert.equal(validCloudSnapshot(a),false);delete a.profileData.test;assert.equal(validCloudSnapshot(a),false);});

test('independent foods and cardio added on the same new date can combine',()=>{const base=snap(),a=structuredClone(base),b=structuredClone(base);a.profileData.test.calories=[{date:'2026-10-30',items:[{id:'food',calories:100}],cardio:[]}];b.profileData.test.calories=[{date:'2026-10-30',items:[],cardio:[{id:'cardio',calories:200}]}];const result=mergeCloudSnapshots(base,a,b);assert.deepEqual(result.conflicts,[]);assert.equal(result.snapshot.profileData.test.calories[0].items.length,1);assert.equal(result.snapshot.profileData.test.calories[0].cardio.length,1);});
test('concurrent opaque template changes are not silently combined',()=>{const base=snap(),a=structuredClone(base),b=structuredClone(base);a.profileData.test.templates['Push A'][0][0]='Local bench';b.profileData.test.templates['Push A'][0][0]='Remote bench';assert.ok(mergeCloudSnapshots(base,a,b).conflicts.length);});

test('concurrent new workouts on the same date require a choice instead of creating duplicate dates',()=>{
 const base=snap(),a=structuredClone(base),b=structuredClone(base);
 a.profileData.test.sessions=[{id:'device-a-workout',date:'2026-10-30',type:'Push A',exercises:[]}];
 b.profileData.test.sessions=[{id:'device-b-workout',date:'2026-10-30',type:'Push B',exercises:[]}];
 const result=mergeCloudSnapshots(base,a,b);assert.ok(result.conflicts.length);assert.equal(result.snapshot.profileData.test.sessions.length,1);
});

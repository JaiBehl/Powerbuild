import test from 'node:test';
import assert from 'node:assert/strict';
import {cycle,initialSettings,createSession,scheduledWorkout,e1rm} from '../../src/data.js';
import {fromDisplayWeight,toDisplayWeight,displayMacroRate,storeMacroRate} from '../../src/units.js';
import {makeLoggedFood,savedFoodFrom,sumFoods,parseServings,portionOfLoggedFood} from '../../src/foodLibrary.js';
import {mergeHistoricalImport,validateHistoricalImport} from '../../src/historicalImport.js';
test('schedule continues across weeks and excludes rest days',()=>{assert.deepEqual(['2026-10-12','2026-10-13','2026-10-14','2026-10-16','2026-10-17','2026-10-19'].map(d=>scheduledWorkout(d,initialSettings)),cycle);assert.equal(scheduledWorkout('2026-10-15',initialSettings),null);});
test('sessions do not share mutable sets',()=>{const s=createSession('Push A','2026-10-30');s.exercises[0].sets[0].done=true;assert.equal(createSession('Push A','2026-10-30').exercises[0].sets[0].done,false);});
test('weight and macro rates round trip without rewriting lb',()=>{assert.ok(Math.abs(fromDisplayWeight(toDisplayWeight(180,'kg',8),'kg')-180)<1e-6);assert.ok(Math.abs(storeMacroRate(displayMacroRate(1,'kg',8),'kg')-1)<1e-7);});
test('food fractions sum and preserve their saved-template snapshot',()=>{const food=savedFoodFrom({name:'Synthetic food',meal:'Breakfast',calories:'',protein:20,carbs:30,fat:10},'food');const half=makeLoggedFood(food,.5,'half');const quarter=makeLoggedFood(food,.25,'quarter');assert.equal(sumFoods([half,quarter]).calories,217.5);food.calories=900;assert.equal(half.perServing.calories,290);assert.equal(portionOfLoggedFood(half).calories,290);});
test('invalid servings and nutrient entries are rejected',()=>{for(const n of [0,-1,101,'1/2','Infinity'])assert.throws(()=>parseServings(n));assert.throws(()=>makeLoggedFood({name:'bad',protein:-1}));});
test('Epley rejects failed and high-rep sets',()=>{assert.equal(e1rm(100,0),null);assert.equal(e1rm(100,16),null);assert.equal(e1rm(100,5),100*(1+5/30));});
test('history merge preserves existing same-day data and repeats safely',()=>{const db={settings:{keep:true},sessions:[],weights:[],calories:[]};const data={format:'powerbuild-historical-import-v1',metadata:{importId:'synthetic'},sessions:[{id:'s',date:'2026-01-01',notes:'Example',exercises:[{id:'ex',name:'Bench',sets:[]}]}],weights:[{id:'w',date:'2026-01-01',weight:180}]};validateHistoricalImport(data);const a=mergeHistoricalImport(db,data).db;assert.deepEqual(mergeHistoricalImport(a,data).db,a);assert.equal(a.settings,db.settings);assert.equal(db.sessions.length,0);});

test('completed singles use actual load rather than an inflated estimate',()=>{assert.equal(e1rm(225,1),225);assert.equal(e1rm(315,1),315);assert.equal(e1rm(225,1.5),null);assert.equal(e1rm(Infinity,5),null);});

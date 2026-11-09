import test from 'node:test';import assert from 'node:assert/strict';
import {makeDb,makeSession} from '../fixtures.js';import {validateProfileDb,removesData} from '../../src/backupSafety.js';import {saveWorkspaceSnapshot,profileDataKey,PROFILE_META_KEY} from '../../src/profiles.js';
test('backup validation accepts legacy optional fields and rejects malformed nested data',()=>{const a=makeDb();delete a.savedFoods;delete a.calories;assert.equal(validateProfileDb(a),a);const b=makeDb({sessions:[{date:'2026-01-01',exercises:'invalid'}]});assert.throws(()=>validateProfileDb(b),/array/);const c=makeDb();c.settings.schedule=[9];assert.throws(()=>validateProfileDb(c),/weekdays/);});
test('removing workouts, sets, foods or goals is a recovery-worthy operation',()=>{const db=makeDb({sessions:[makeSession()],strengthGoals:[{id:'g'}],calories:[{date:'2026-10-30',items:[{id:'f'}],cardio:[]}]});assert.equal(removesData(db,{...db,sessions:[]}),true);assert.equal(removesData(db,{...db,strengthGoals:[]}),true);assert.equal(removesData(db,{...db,calories:[]}),true);assert.equal(removesData(db,{...db,settings:{...db.settings,targetWeight:170}}),false);});
test('all-profile writes roll back if a later write fails',()=>{const meta={profiles:[{id:'a'},{id:'b'}],activeProfileId:'a'},values=new Map([[profileDataKey('a'),'old-a'],[profileDataKey('b'),'old-b'],[PROFILE_META_KEY,'old-meta']]);const storage={getItem:k=>values.get(k)||null,removeItem:k=>values.delete(k),setItem:(k,v)=>{if(k===profileDataKey('b')&&v.includes('new'))throw Error('quota');values.set(k,v);}};assert.throws(()=>saveWorkspaceSnapshot(meta,{a:{new:true},b:{new:true}},storage));assert.equal(values.get(profileDataKey('a')),'old-a');assert.equal(values.get(PROFILE_META_KEY),'old-meta');});

test('malformed settings, goals, saved foods and daily plans are rejected before import',()=>{
 for(const patch of [{settings:'broken'},{strengthGoals:[null]},{savedFoods:[null]},{calorieSettings:{milesWalked:'NaN'}},{calorieSettings:{lifted:'false'}},{calories:[{date:'2026-10-30',items:[],plan:'broken'}]}])assert.throws(()=>validateProfileDb(makeDb(patch)));
});

test('workspace rollback releases later writes before restoring an earlier larger profile',()=>{
 const meta={profiles:[{id:'a',name:'Alpha'},{id:'b',name:'Beta'}],activeProfileId:'a'};
 const values=new Map([
  [profileDataKey('a'),JSON.stringify({notes:'a'.repeat(100)})],
  [profileDataKey('b'),JSON.stringify({notes:''})],
  [PROFILE_META_KEY,JSON.stringify(meta)],
 ]);
 const before=new Map(values),size=()=>[...values.values()].reduce((sum,v)=>sum+v.length,0);
 const limit=size(),writes=[];
 const storage={getItem:k=>values.get(k)??null,removeItem:k=>values.delete(k),setItem:(k,v)=>{
  if(size()-(values.get(k)?.length||0)+v.length>limit)throw Error('quota');
  writes.push(k);values.set(k,v);
 }};
 const incoming={...meta,profiles:[{id:'a',name:'A longer name'},{id:'b',name:'Beta'}]};
 assert.throws(()=>saveWorkspaceSnapshot(incoming,{a:{notes:''},b:{notes:'b'.repeat(100)}},storage),/Could not save all profiles/);
 assert.deepEqual(values,before);
 assert.deepEqual(writes,[profileDataKey('a'),profileDataKey('b'),profileDataKey('b'),profileDataKey('a')]);
});

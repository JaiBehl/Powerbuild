import {validateProfileDb} from './backupSafety.js';
export const stableStringify=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,v[k]])):v);
const absent=Symbol('absent'),same=(a,b)=>a===b||(a!==absent&&b!==absent&&stableStringify(a)===stableStringify(b));
export function validCloudSnapshot(x){
 try{if(x?.profileData)Object.values(x.profileData).forEach(validateProfileDb);}catch{return false;}
 return !!(x&&Array.isArray(x.profileState?.profiles)&&x.profileState.profiles.length&&x.profileData&&x.profileState.profiles.every(p=>typeof p.id==='string'&&x.profileData[p.id]?.settings&&Array.isArray(x.profileData[p.id].sessions)&&Array.isArray(x.profileData[p.id].weights)&&Array.isArray(x.profileData[p.id].calories)&&x.profileData[p.id].sessions.every(s=>s&&Array.isArray(s.exercises)&&s.exercises.every(e=>e&&typeof e.name==='string'&&Array.isArray(e.sets)))));
}
export function mergeCloudSnapshots(base,local,remote){
 const conflicts=[];
 const walk=(b,l,r,path)=>{
  if(same(l,r))return l;if(same(l,b))return r;if(same(r,b))return l;
  if(b===absent&&[l,r].every(x=>x&&typeof x==='object'&&!Array.isArray(x)))b={};
  if(b===absent&&Array.isArray(l)&&Array.isArray(r))b=[];
  if([b,l,r].every(x=>x!==absent&&x&&typeof x==='object'&&!Array.isArray(x))){
   return Object.fromEntries([...new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])].flatMap(k=>{
    const value=walk(Object.hasOwn(b,k)?b[k]:absent,Object.hasOwn(l,k)?l[k]:absent,Object.hasOwn(r,k)?r[k]:absent,path+'.'+k);
    return value===absent?[]:[[k,value]];
   }));
  }
  if([b,l,r].every(Array.isArray)){
   const arrays=[b,l,r],all=arrays.flat();
   const field=['id','date'].find(k=>all.every(x=>x&&typeof x==='object'&&!Array.isArray(x)&&x[k]!==undefined)&&arrays.every(a=>new Set(a.map(x=>String(x[k]))).size===a.length));
   if(field){
    const maps=arrays.map(a=>new Map(a.map(x=>[String(x[field]),x]))),keys=[...new Set([...maps[0].keys(),...maps[1].keys(),...maps[2].keys()])];
    return keys.flatMap(k=>{const value=walk(...maps.map(m=>m.has(k)?m.get(k):absent),path+'['+k+']');return value===absent?[]:[value];});
   }
  }
  conflicts.push(path);return l;
 };
 const snapshot=walk(base,local,remote,'account');
 return {snapshot,conflicts};
}

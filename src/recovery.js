const prefix='powerbuild-recovery-v1:';
export function listRecoveryPoints(scope,storage=globalThis.localStorage){
 try{const x=JSON.parse(storage.getItem(prefix+scope));return Array.isArray(x)?x.filter(p=>p?.id&&p.data):[];}catch{return [];}
}
export function saveRecoveryPoint(scope,label,data,storage=globalThis.localStorage){
 const point={id:globalThis.crypto?.randomUUID?.()||'recovery-'+Date.now()+'-'+Math.random(),createdAt:new Date().toISOString(),label,data:structuredClone(data)};
 const points=[point,...listRecoveryPoints(scope,storage)].slice(0,5);
 while(points.length>1&&JSON.stringify(points).length>2000000)points.pop();
 while(points.length){
  try{storage.setItem(prefix+scope,JSON.stringify(points));return point;}
  catch{if(points.length===1)throw Error('Could not save a recovery copy. Export a JSON backup and free browser storage before replacing data.');points.pop();}
 }
}

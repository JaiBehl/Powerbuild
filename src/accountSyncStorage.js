import {listRecoveryPoints,makeRecoveryPoint} from './recovery.js';

const databaseName='powerbuild-cloud-sync';
const storeName='accounts';

async function updateRecord(key,update){
  const db=await new Promise((resolve,reject)=>{
    const request=indexedDB.open(databaseName,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(storeName);
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  try{
    return await new Promise((resolve,reject)=>{
      const transaction=db.transaction(storeName,'readwrite');
      const store=transaction.objectStore(storeName);
      const read=store.get(key);
      let next;
      read.onsuccess=()=>{
        next=update(read.result);
        if(next!==read.result)store.put(next,key);
      };
      transaction.oncomplete=()=>resolve(next);
      transaction.onabort=()=>reject(transaction.error||Error('Account storage transaction was interrupted.'));
    });
  }finally{db.close();}
}

export async function loadAccountSync(id){
  const baseKey='powerbuild-cloud-last-v1:'+id;
  const recoveryKey='powerbuild-recovery-v1:account:'+id;
  const legacyBase=localStorage.getItem(baseKey);
  const legacyRecovery=localStorage.getItem(recoveryKey);
  let base=null;
  try{base=JSON.parse(legacyBase);}catch{}
  const recoveries=listRecoveryPoints('account:'+id);
  const [savedBase,savedRecoveries]=await Promise.all([
    updateRecord('base:'+id,saved=>saved??(base?{base,revision:0}:undefined)),
    updateRecord('recovery:'+id,saved=>{
      if(!recoveries.length)return saved;
      return [...(saved||[]),...recoveries.filter(point=>!saved?.some(existing=>existing.id===point.id))];
    }),
  ]);
  // Free the old space only after the IndexedDB transactions commit.
  if(legacyBase!==null&&localStorage.getItem(baseKey)===legacyBase)localStorage.removeItem(baseKey);
  if(legacyRecovery!==null&&localStorage.getItem(recoveryKey)===legacyRecovery)localStorage.removeItem(recoveryKey);
  return {base:savedBase?.base??null,recoveries:savedRecoveries??[]};
}

export function saveAccountBase(id,base,revision){
  return updateRecord('base:'+id,saved=>saved&&revision<saved.revision?saved:{base,revision});
}

export function saveAccountRecoveries(id,copies){
  const points=copies.map(([label,data])=>makeRecoveryPoint(label,data)).reverse();
  return updateRecord('recovery:'+id,saved=>[...points,...(saved||[])].slice(0,5));
}

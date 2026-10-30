import React,{useState} from 'react';
import CalorieSection from './CalorieSection';
import {listRecoveryPoints,saveRecoveryPoint} from './recovery';
export default function RecoveryPanel({db,patch,profileId,profileName,onRestoreWorkspace}){
 const [version,setVersion]=useState(0),[message,setMessage]=useState('');
 const points=listRecoveryPoints('profile:'+profileId),workspace=listRecoveryPoints('workspace');
 const save=()=>{try{saveRecoveryPoint('profile:'+profileId,'Manual recovery copy',db);setVersion(version+1);setMessage('Recovery copy saved.');}catch(e){setMessage(e.message);}};
 const restore=point=>{if(!confirm('Restore this recovery copy into '+profileName+'? The current version will be saved first.'))return;try{if(patch(()=>point.data,{checkpoint:'Before restoring recovery copy',validate:true})){setVersion(v=>v+1);setMessage('Recovery copy restored.');}}catch(e){setMessage(e.message);}};
 const download=point=>{const url=URL.createObjectURL(new Blob([JSON.stringify(point.data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='powerbuild-recovery-'+point.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return <CalorieSection title="Recovery copies" description="Restore or download device copies saved before deletions, imports and resets." summary={points.length+' profile copies'}>
 <p className="muted">Copies are stored on this browser, are limited by available storage, and are not a replacement for downloaded backups. Account sync recovery copies are in the sidebar.</p>
 <button className="secondary" onClick={save}>Save recovery copy now</button>
 <div className="recovery-list">{points.map(point=><div className="recovery-item" key={point.id}><span>{point.label} · {new Date(point.createdAt).toLocaleString()}</span><div className="actions"><button className="secondary" onClick={()=>restore(point)}>Restore profile copy</button><button className="secondary" onClick={()=>download(point)}>Download profile copy</button></div></div>)}</div>
 {workspace.length>0&&<><h3>All-profile recovery</h3><p className="muted">These copies can recover a deleted profile and the profile list.</p><div className="recovery-list">{workspace.map(point=><div className="recovery-item" key={point.id}><span>{point.label} · {new Date(point.createdAt).toLocaleString()}</span><button className="secondary" onClick={()=>{if(confirm('Restore all profiles from this device copy? Current profiles will be backed up first.')){try{onRestoreWorkspace(point);setVersion(v=>v+1);}catch(e){setMessage(e.message);}}}}>Restore all profiles</button></div>)}</div></>}
 {message&&<p role="status">{message}</p>}
 </CalorieSection>;
}

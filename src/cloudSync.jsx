import React,{useCallback,useEffect,useRef,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {Cloud,CloudOff,CheckCircle2,AlertTriangle,LogOut} from 'lucide-react';
import {loadProfileDb} from './profiles';
import {loadAccountSync,saveAccountBase,saveAccountRecoveries} from './accountSyncStorage';
import {mergeCloudSnapshots,stableStringify,validCloudSnapshot} from './syncMerge';
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase=url&&key?createClient(url,key):null;
const parse=value=>{try{return JSON.parse(value);}catch{return null;}};
const download=(name,data)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
export function useCloudSync({db,profileState,applySnapshot}){
 const [user,setUser]=useState(null),[status,setStatus]=useState(supabase?'checking':'unconfigured'),[error,setError]=useState(''),[message,setMessage]=useState(''),[remote,setRemote]=useState(null),[conflicts,setConflicts]=useState([]),[refresh,setRefresh]=useState(0),[recoveries,setRecoveries]=useState([]);
 const owner=useRef(null),revision=useRef(0),base=useRef(null),busy=useRef(null),apply=useRef(applySnapshot);apply.current=applySnapshot;
 const snapshot={profileState,profileData:Object.fromEntries(profileState.profiles.map(p=>[p.id,p.id===profileState.activeProfileId?db:loadProfileDb(p.id,()=>({}))]))};
 const json=stableStringify(snapshot),current=useRef(json);current.current=json;
 const backup=useCallback(async(id,copies,active)=>{
  let points;
  try{points=await saveAccountRecoveries(id,copies);}
  catch{throw Error('Could not save account recovery copies on this device. Download your device copy before retrying.');}
  if(active())setRecoveries(points);
 },[]);
 const remember=useCallback(async(id,payload,version)=>{
  revision.current=Number(version);base.current=payload;
  try{await saveAccountBase(id,payload,revision.current);}
  catch{throw Error('Could not save the sync checkpoint on this device. Download your device copy before retrying.');}
 },[]);
 const receive=useCallback(async(row,id,active,initial=false)=>{
  if(!active())return;
  if(!validCloudSnapshot(row?.payload))throw Error('Cloud data format is invalid. Local data was left untouched.');
  const before=current.current,remoteJson=stableStringify(row.payload),local=parse(before),known=base.current;
  if(remoteJson===before){
   await remember(id,row.payload,row.revision);
   if(active()){setRemote(null);setConflicts([]);setStatus('synced');}
   return;
  }
  const result=known?mergeCloudSnapshots(known,local,row.payload):null;
  if(result&&!result.conflicts.length){
   await backup(id,[['Device before combining cloud changes',local],['Cloud before combining device changes',row.payload]],active);
   if(!active())return;
   if(current.current!==before)throw Error('Device data changed during the cloud check. Sync will retry.');
   apply.current(result.snapshot,{preserveUi:!initial});current.current=stableStringify(result.snapshot);
   await remember(id,row.payload,row.revision);
   if(active()){
    setRemote(null);setConflicts([]);setError('');setMessage('Combined separate device changes.');setStatus('synced');
   }
  }else{setRemote(row);setConflicts(result?.conflicts||[]);setStatus(known?'conflict':'choose');setError('');}
 },[backup,remember]);
 useEffect(()=>{
  if(!supabase)return;
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   const id=session?.user?.id||null;
   if(owner.current!==id){owner.current=id;revision.current=0;base.current=null;busy.current=null;setRemote(null);setConflicts([]);setRecoveries([]);}
   setUser(session?.user||null);
  });
  return ()=>subscription.unsubscribe();
 },[]);
 useEffect(()=>{
  if(!supabase)return;if(!user){setStatus('signed-out');return;}
  const id=user.id;let canceled=false;setStatus('checking');setError('');
  const active=()=>!canceled&&owner.current===id;
  (async()=>{try{
   const account=await loadAccountSync(id);
   if(!active())return;
   base.current??=account.base;setRecoveries(account.recoveries);
   const {data,error}=await supabase.from('powerbuild_cloud_state').select('payload,revision').eq('user_id',id).maybeSingle();
   if(canceled||owner.current!==id)return;if(error)throw error;
   if(!data){revision.current=0;setRemote(null);setStatus('empty');return;}
   await receive(data,id,active,true);
  }catch(e){if(!canceled&&owner.current===id){setError('Could not check cloud data: '+e.message);setStatus('offline');}}})();
  return ()=>{canceled=true;};
 },[user?.id,refresh,receive]);
 const upload=useCallback(async expected=>{
  if(!supabase||!user||owner.current!==user.id||busy.current)return;
  const id=user.id,task={};busy.current=task;setStatus('saving');setError('');
  const active=()=>owner.current===id&&busy.current===task;
  const content=current.current;
  try{
   const {data,error}=await supabase.rpc('powerbuild_save_state',{p_expected_revision:expected,p_payload:parse(content)});
   if(owner.current!==id||busy.current!==task)return;if(error)throw error;
   await remember(id,parse(content),data);
   if(active()){setRemote(null);setConflicts([]);setStatus('synced');}
  }catch(e){
   if(owner.current!==id||busy.current!==task)return;
   if(String(e.message).includes('SYNC_CONFLICT')){
    try{const {data,error}=await supabase.from('powerbuild_cloud_state').select('payload,revision').eq('user_id',id).maybeSingle();if(owner.current!==id||busy.current!==task)return;if(error)throw error;if(data)await receive(data,id,active);else{setStatus('empty');setRemote(null);}}
    catch(fetchError){if(owner.current===id&&busy.current===task){setError(fetchError.message);setStatus('offline');}}
   }else{setError('Could not sync: '+e.message+'. You can download a device copy from this panel.');setStatus('offline');}
  }finally{if(busy.current===task)busy.current=null;}
 },[user?.id,receive,remember]);
 useEffect(()=>{
  if(status!=='synced'||!user||current.current===stableStringify(base.current))return;
  let timer;
  const send=()=>{if(busy.current)timer=setTimeout(send,900);else upload(revision.current);};
  timer=setTimeout(send,900);return ()=>clearTimeout(timer);
 },[json,status,user?.id,upload]);
 useEffect(()=>{
  if(!supabase||!user||status!=='synced')return;const id=user.id;let canceled=false;
  const poll=async()=>{
   if(busy.current)return;
   const active=()=>!canceled&&owner.current===id;
   let task;
   try{
    const {data,error}=await supabase.from('powerbuild_cloud_state').select('payload,revision').eq('user_id',id).maybeSingle();
    if(!active()||busy.current)return;
    if(error)throw error;
    if(data&&Number(data.revision)>revision.current){
     task={};busy.current=task;
     await receive(data,id,()=>active()&&busy.current===task);
    }
   }catch(e){if(active()&&(!busy.current||busy.current===task)){setError('Cloud check failed: '+e.message);setStatus('offline');}}
   finally{if(task&&busy.current===task)busy.current=null;}
  };
  const timer=setInterval(poll,12000),visible=()=>{if(document.visibilityState==='visible')poll();};
  document.addEventListener('visibilitychange',visible);return ()=>{canceled=true;clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[status,user?.id,receive]);
 useEffect(()=>{if(status!=='offline'||!user)return;const timer=setTimeout(()=>setRefresh(v=>v+1),10000);return ()=>clearTimeout(timer);},[status,user?.id]);
 async function signIn(email,password,create){
  setError('');setMessage('');
  try{const {data,error}=create?await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}}):await supabase.auth.signInWithPassword({email,password});if(error)throw error;if(create&&!data.session)setMessage('Check your email to confirm your account, then sign in.');}catch(e){setError(e.message);}
 }
 async function resendVerification(email){
  setError('');setMessage('');if(!email?.trim()){setError('Enter your email address to resend confirmation.');return;}
  const {error}=await supabase.auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:window.location.origin}});
  if(error)setError(error.message);else setMessage('Confirmation email requested. Use the newest email link, then sign in.');
 }
 const signOut=async()=>{const {error}=await supabase.auth.signOut();if(error)setError(error.message);};
 async function runRecoveryAction(action){
  if(!user||owner.current!==user.id||busy.current)return;
  const id=user.id,task={},before=current.current;
  const active=()=>owner.current===id&&busy.current===task;
  const ready=()=>{
   if(!active())return false;
   if(current.current!==before)throw Error('Device data changed while making recovery copies. Retry sync and review both copies again.');
   return true;
  };
  busy.current=task;setStatus('checking');
  try{await action(id,parse(before),active,ready);}
  catch(e){if(active()){setError(e.message);setStatus('error');}}
  finally{if(busy.current===task)busy.current=null;}
 }
 const useCloud=()=>{
  if(!remote)return;
  return runRecoveryAction(async(id,local,active,ready)=>{
   if(!validCloudSnapshot(remote.payload))throw Error('Invalid cloud data.');
   await backup(id,[['Device before choosing cloud copy',local],['Cloud copy chosen',remote.payload]],active);
   if(!ready())return;
   apply.current(remote.payload);current.current=stableStringify(remote.payload);
   await remember(id,remote.payload,remote.revision);
   if(active()){setRemote(null);setConflicts([]);setError('');setStatus('synced');}
  });
 };
 const useDevice=()=>{
  if(remote&&!confirm('Replace the cloud copy with this device data? Recovery copies of both versions will be saved first.'))return;
  return runRecoveryAction(async(id,local,active,ready)=>{
   const copies=[['Device before choosing device copy',local]];
   if(remote)copies.push(['Cloud before choosing device copy',remote.payload]);
   await backup(id,copies,active);
   if(!ready())return;
   busy.current=null;
   await upload(remote?Number(remote.revision):0);
  });
 };
 const restore=pointId=>{
  const point=recoveries.find(p=>p.id===pointId);
  if(!point||!validCloudSnapshot(point.data))return;
  if(!confirm('Restore this account recovery copy on this device? It will sync after checking the cloud revision.'))return;
  return runRecoveryAction(async(id,local,active,ready)=>{
   await backup(id,[['Before account recovery restore',local]],active);
   if(!ready())return;
   apply.current(point.data);current.current=stableStringify(point.data);
   setRemote(null);setConflicts([]);setError('');setRefresh(v=>v+1);
  });
 };
 return {configured:!!supabase,user,status,error,message,conflicts,recoveries,restore,signIn,signOut,resendVerification,useCloud,useDevice,retry:()=>setRefresh(v=>v+1),downloadDevice:()=>download('powerbuild-device-account.json',parse(current.current)),downloadCloud:()=>remote&&download('powerbuild-cloud-account.json',remote.payload)};
}

export function CloudPanel({cloud}){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [register,setRegister]=useState(false);
  const [showRecovery,setShowRecovery]=useState(false);
  const {configured,user,status,error,message}=cloud;
  if(!configured)return <div className="cloud-panel"><div className="cloud-heading"><CloudOff size={16}/> Cloud sync unavailable</div><p>Add the Supabase URL and publishable key to Vercel to enable account syncing.</p></div>;
  return <div className="cloud-panel">
    <div className="cloud-heading"><Cloud size={16}/> CLOUD SYNC</div>
    {!user?<form onSubmit={e=>{e.preventDefault();cloud.signIn(email,password,register);}}>
      <p>Sign in with the same account on your Mac and phone.</p>
      <input type="email" autoComplete="email" placeholder="Email" required value={email} onChange={e=>setEmail(e.target.value)}/>
      <input type="password" autoComplete={register?'new-password':'current-password'} placeholder="Password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)}/>
      <button className="cloud-button" type="submit">{register?'Create account':'Sign in'}</button>
      <button className="cloud-link" type="button" onClick={()=>setRegister(v=>!v)}>{register?'Already have an account? Sign in':'Create an account'}</button>
      <button className="cloud-link" type="button" onClick={()=>cloud.resendVerification(email)}>Resend confirmation email</button>
    </form>:<>
      <div className="cloud-email" title={user.email}>{user.email}</div>
      {(status==='synced'||status==='saving')&&<p className="cloud-state"><CheckCircle2 size={14}/> {status==='saving'?'Saving to cloud…':'Cloud sync active'}</p>}
      {status==='checking'&&<p>Checking cloud data…</p>}
      {status==='empty'&&<><p>No cloud backup yet. On your Mac with existing logs, upload this device first.</p><button className="cloud-button" onClick={cloud.useDevice}>Upload this device</button></>}
      {(status==='choose'||status==='conflict')&&<><p><AlertTriangle size={14}/> {status==='choose'?'Cloud data and device data differ. Choose which to keep.':'Sync conflict: changes exist on multiple devices.'}</p>{cloud.conflicts.length>0&&<p>Conflicting values: {cloud.conflicts.slice(0,3).join(', ')}</p>}<button className="cloud-button" onClick={cloud.useCloud}>Use cloud data</button><button className="cloud-button cloud-secondary" onClick={cloud.useDevice}>Keep this device data</button><button className="cloud-link" onClick={cloud.downloadDevice}>Download this device copy</button><button className="cloud-link" onClick={cloud.downloadCloud}>Download cloud copy</button></>}
      {(status==='offline'||status==='error')&&<><button className="cloud-button" onClick={cloud.retry}>Retry sync</button><button className="cloud-link" onClick={cloud.downloadDevice}>Download this device copy</button></>}
      <button className="cloud-link" onClick={()=>setShowRecovery(v=>!v)}>Account recovery copies ({cloud.recoveries.length})</button>
      {showRecovery&&<div className="cloud-recovery-list">{cloud.recoveries.map(point=><div key={point.id}><p>{point.label} · {new Date(point.createdAt).toLocaleString()}</p><button className="cloud-button cloud-secondary" onClick={()=>cloud.restore(point.id)}>Restore account copy</button></div>)}</div>}
      <button className="cloud-link cloud-signout" onClick={cloud.signOut}><LogOut size={13}/> Sign out</button>
    </>}
    {message&&<p className="cloud-note">{message}</p>}
    {error&&<p className="cloud-error">{error}</p>}
  </div>;
}

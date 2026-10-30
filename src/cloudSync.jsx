import React,{useCallback,useEffect,useRef,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {Cloud,CloudOff,CheckCircle2,AlertTriangle,LogOut} from 'lucide-react';
import {loadProfileDb} from './profiles';

const url=import.meta.env.VITE_SUPABASE_URL;
const publishableKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase=url&&publishableKey?createClient(url,publishableKey):null;
const lastSyncKey=(id)=>'powerbuild-cloud-last-v1:'+id;
const validSnapshot=(x)=>x&&x.profileState&&Array.isArray(x.profileState.profiles)&&x.profileState.profiles.length>0&&x.profileData&&typeof x.profileData==='object';
const sorted=(x)=>Array.isArray(x)?x.map(sorted):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().filter(k=>x[k]!==undefined).map(k=>[k,sorted(x[k])])):x;
const stableStringify=(x)=>JSON.stringify(sorted(x));

export function useCloudSync({db,profileState,applySnapshot}){
  const [user,setUser]=useState(null);
  const [status,setStatus]=useState(supabase?'checking':'unconfigured');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [remote,setRemote]=useState(null);
  const revision=useRef(0);
  const lastSynced=useRef(null);
  const busy=useRef(false);
  const applyRef=useRef(applySnapshot);
  applyRef.current=applySnapshot;

  const snapshot={
    profileState,
    profileData:Object.fromEntries(profileState.profiles.map(p=>[
      p.id,
      p.id===profileState.activeProfileId?db:loadProfileDb(p.id,()=>({}))
    ])),
  };
  const snapshotJson=stableStringify(snapshot);
  const currentSnapshot=useRef(snapshotJson);
  currentSnapshot.current=snapshotJson;

  const acceptRemote=useCallback((row,id)=>{
    if(!validSnapshot(row?.payload))throw Error('Cloud backup has an invalid format. Your local data was left untouched.');
    revision.current=Number(row.revision);
    lastSynced.current=stableStringify(row.payload);
    localStorage.setItem(lastSyncKey(id),lastSynced.current);
    applyRef.current(row.payload);
    setRemote(null);
    setError('');
    setStatus('synced');
  },[]);

  useEffect(()=>{
    if(!supabase)return;
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      setUser(session?.user||null);
    });
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!supabase)return;
    if(!user){
      setStatus('signed-out');
      setRemote(null);
      revision.current=0;
      lastSynced.current=null;
      return;
    }
    let canceled=false;
    setStatus('checking');
    setError('');
    (async()=>{
      const {data,error:fetchError}=await supabase.from('powerbuild_cloud_state')
        .select('payload,revision').eq('user_id',user.id).maybeSingle();
      if(canceled)return;
      if(fetchError){setError(fetchError.message);setStatus('error');return;}
      if(!data){setRemote(null);revision.current=0;setStatus('empty');return;}
      if(!validSnapshot(data.payload)){setError('Cloud data format is invalid. Local data is safe.');setStatus('error');return;}
      const cloudJson=stableStringify(data.payload);
      const known=localStorage.getItem(lastSyncKey(user.id));
      if(cloudJson===currentSnapshot.current){
        revision.current=Number(data.revision);
        lastSynced.current=cloudJson;
        localStorage.setItem(lastSyncKey(user.id),cloudJson);
        setStatus('synced');
      }else if(known===currentSnapshot.current){
        try{acceptRemote(data,user.id);}catch(e){setError(e.message);setStatus('error');}
      }else{
        setRemote(data);
        setStatus('choose');
      }
    })();
    return ()=>{canceled=true;};
  },[user?.id,acceptRemote]);

  const upload=useCallback(async(expected)=>{
    if(!supabase||!user||busy.current)return;
    busy.current=true;
    setStatus('saving');
    setError('');
    const content=currentSnapshot.current;
    try{
      const {data,error:saveError}=await supabase.rpc('powerbuild_save_state',{
        p_expected_revision:expected,
        p_payload:JSON.parse(content),
      });
      if(saveError)throw saveError;
      revision.current=Number(data);
      lastSynced.current=content;
      localStorage.setItem(lastSyncKey(user.id),content);
      setRemote(null);
      setStatus('synced');
    }catch(e){
      if(String(e.message).includes('SYNC_CONFLICT')){
        const {data:latest}=await supabase.from('powerbuild_cloud_state')
          .select('payload,revision').eq('user_id',user.id).maybeSingle();
        setRemote(latest||null);
        setStatus('conflict');
        setError('Another device changed your data. Choose which version to keep.');
      }else{
        setStatus('offline');
        setError('Could not sync: '+e.message+'. Your data is still saved on this device.');
      }
    }finally{busy.current=false;}
  },[user?.id]);

  useEffect(()=>{
    if(status!=='synced'||!user||currentSnapshot.current===lastSynced.current)return;
    const timer=setTimeout(()=>upload(revision.current),900);
    return ()=>clearTimeout(timer);
  },[snapshotJson,status,user?.id,upload]);

  useEffect(()=>{
    if(!supabase||!user||status!=='synced')return;
    let canceled=false;
    const poll=async()=>{
      if(busy.current)return;
      const {data,error:fetchError}=await supabase.from('powerbuild_cloud_state')
        .select('payload,revision').eq('user_id',user.id).maybeSingle();
      if(canceled||fetchError||!data||Number(data.revision)<=revision.current)return;
      if(currentSnapshot.current!==lastSynced.current){
        setRemote(data);
        setError('This device and another device both have unsynced changes.');
        setStatus('conflict');
      }else{
        try{acceptRemote(data,user.id);}catch(e){setError(e.message);setStatus('error');}
      }
    };
    const timer=setInterval(poll,12000);
    const onFocus=()=>{if(document.visibilityState==='visible')poll();};
    document.addEventListener('visibilitychange',onFocus);
    return ()=>{canceled=true;clearInterval(timer);document.removeEventListener('visibilitychange',onFocus);};
  },[status,user?.id,acceptRemote]);

  useEffect(()=>{
    if(status!=='offline')return;
    const timer=setTimeout(()=>setStatus('synced'),10000);
    return ()=>clearTimeout(timer);
  },[status]);

  async function signIn(email,password,create){
    if(!supabase)return;
    setError('');
    setMessage('');
    const {data,error:authError}=create
      ?await supabase.auth.signUp({email,password})
      :await supabase.auth.signInWithPassword({email,password});
    if(authError){setError(authError.message);return;}
    if(create&&!data.session)setMessage('Check your email to confirm your account, then sign in.');
  }

  async function signOut(){
    if(!supabase)return;
    const {error:authError}=await supabase.auth.signOut();
    if(authError)setError(authError.message);
  }

  const useCloud=()=>{
    if(!remote||!user)return;
    try{acceptRemote(remote,user.id);}catch(e){setError(e.message);setStatus('error');}
  };
  const useDevice=()=>{
    if(!user)return;
    if(remote&&!window.confirm('Replace the cloud copy with this device data? Export a backup first if needed.'))return;
    upload(remote?Number(remote.revision):0);
  };

  return {configured:!!supabase,user,status,error,message,signIn,signOut,useCloud,useDevice,retry:()=>setStatus('synced')};
}

export function CloudPanel({cloud}){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [register,setRegister]=useState(false);
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
    </form>:<>
      <div className="cloud-email" title={user.email}>{user.email}</div>
      {(status==='synced'||status==='saving')&&<p className="cloud-state"><CheckCircle2 size={14}/> {status==='saving'?'Saving to cloud…':'Cloud sync active'}</p>}
      {status==='checking'&&<p>Checking cloud data…</p>}
      {status==='empty'&&<><p>No cloud backup yet. On your Mac with existing logs, upload this device first.</p><button className="cloud-button" onClick={cloud.useDevice}>Upload this device</button></>}
      {(status==='choose'||status==='conflict')&&<><p><AlertTriangle size={14}/> {status==='choose'?'Cloud data and device data differ. Choose which to keep.':'Sync conflict: changes exist on multiple devices.'}</p><button className="cloud-button" onClick={cloud.useCloud}>Use cloud data</button><button className="cloud-button cloud-secondary" onClick={cloud.useDevice}>Keep this device data</button></>}
      {(status==='offline'||status==='error')&&<button className="cloud-button" onClick={cloud.retry}>Retry sync</button>}
      <button className="cloud-link cloud-signout" onClick={cloud.signOut}><LogOut size={13}/> Sign out</button>
    </>}
    {message&&<p className="cloud-note">{message}</p>}
    {error&&<p className="cloud-error">{error}</p>}
  </div>;
}

import React,{useState} from 'react';
import {ChevronDown,Pencil,Plus,Trash2,UserRound} from 'lucide-react';
import './profile.css';

export default function ProfileSwitcher({profiles,activeId,onSwitch,onCreate,onRename,onDelete}){
  const [open,setOpen]=useState(false);
  const [name,setName]=useState('');
  const active=profiles.find(p=>p.id===activeId)||profiles[0];

  function submit(e){
    e.preventDefault();
    const clean=name.trim();
    if(!clean)return;
    const created=onCreate(clean);
    if(created!==false){setName('');setOpen(false)}
  }

  return <div className="profiles">
    <button className="profile-current" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>
      <span className="profile-avatar"><UserRound size={17}/></span>
      <span className="profile-current-copy"><small>PROFILE</small><strong>{active?.name||'My profile'}</strong></span>
      <ChevronDown size={16} className={open?'profile-chevron open':'profile-chevron'}/>
    </button>

    {open&&<div className="profile-menu">
      <div className="profile-list">
        {profiles.map(p=><div className={p.id===activeId?'profile-row active':'profile-row'} key={p.id}>
          <button className="profile-select" onClick={()=>{onSwitch(p.id);setOpen(false)}}>
            <UserRound size={15}/><span>{p.name}</span>{p.id===activeId&&<small>Current</small>}
          </button>
          <button className="profile-icon" title={`Rename ${p.name}`} aria-label={`Rename ${p.name}`} onClick={()=>onRename(p.id)}><Pencil size={13}/></button>
          {p.id!==activeId&&profiles.length>1&&<button className="profile-icon danger-icon" title={`Delete ${p.name}`} aria-label={`Delete ${p.name}`} onClick={()=>onDelete(p.id)}><Trash2 size={13}/></button>}
        </div>)}
      </div>
      <form className="profile-create" onSubmit={submit}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="New profile name" maxLength={30}/>
        <button className="profile-add" type="submit" title="Create profile"><Plus size={15}/></button>
      </form>
      <p className="profile-help">Profiles keep separate logs. When signed in, all profiles sync to your account.</p>
    </div>}
  </div>;
}

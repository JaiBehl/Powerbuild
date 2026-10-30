import React,{useEffect,useState} from 'react';
import {Plus,Trash2} from 'lucide-react';
import './cardio.css';

const emptyDraft={name:'',durationMinutes:'',calories:''};

export default function CardioLog({date,setDate,entries,onChange,totalCalories,compact=false}){
  const [draft,setDraft]=useState(emptyDraft);

  useEffect(()=>{setDraft(emptyDraft)},[date]);

  const updateEntry=(id,key,value)=>{
    onChange(entries.map(item=>item.id===id?{...item,[key]:value}:item));
  };

  const removeEntry=(id)=>onChange(entries.filter(item=>item.id!==id));

  const addEntry=()=>{
    const name=draft.name.trim();
    const durationMinutes=Number(draft.durationMinutes);
    const calories=Number(draft.calories);
    if(!name||durationMinutes<=0||calories<=0)return;
    const id=globalThis.crypto?.randomUUID?.()||`cardio-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    onChange([...entries,{id,name,durationMinutes,calories}]);
    setDraft(emptyDraft);
  };

  return <div className="cardio-section">
    {compact?<div className="cardio-date-only">
      <label>Cardio date<input aria-label="Cardio date" type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    </div>:<>
    <div className="between cardio-heading">
      <div>
        <h3>Custom cardio</h3>
        <p className="muted">Log any cardio session for this date. Enter the calories burned you want added to maintenance.</p>
      </div>
      <div className="cardio-date-total">
        <input aria-label="Cardio date" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
        <strong>{Math.round(totalCalories).toLocaleString()} kcal</strong>
      </div>
    </div>

    </>}
    {entries.length>0&&<div className="cardio-list">
      {entries.map(item=><div className="cardio-row" key={item.id}>
        <label>Exercise
          <input value={item.name} onChange={e=>updateEntry(item.id,'name',e.target.value)} placeholder="Stairmaster"/>
        </label>
        <label>Duration (min)
          <input type="number" min="0" step="1" value={item.durationMinutes} onChange={e=>updateEntry(item.id,'durationMinutes',e.target.value===''?'':Number(e.target.value))}/>
        </label>
        <label>Calories burned
          <input type="number" min="0" step="1" value={item.calories} onChange={e=>updateEntry(item.id,'calories',e.target.value===''?'':Number(e.target.value))}/>
        </label>
        <button className="iconbtn subtle" title="Remove cardio entry" onClick={()=>removeEntry(item.id)}><Trash2 size={16}/></button>
      </div>)}
    </div>}

    <div className="cardio-add-row">
      <label>Exercise
        <input placeholder="Bike, incline walk, basketball..." value={draft.name} onChange={e=>setDraft(p=>({...p,name:e.target.value}))}/>
      </label>
      <label>Duration (min)
        <input type="number" min="1" step="1" placeholder="30" value={draft.durationMinutes} onChange={e=>setDraft(p=>({...p,durationMinutes:e.target.value}))}/>
      </label>
      <label>Calories burned
        <input type="number" min="1" step="1" placeholder="250" value={draft.calories} onChange={e=>setDraft(p=>({...p,calories:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter')addEntry()}}/>
      </label>
      <button className="secondary cardio-add-button" onClick={addEntry}><Plus size={16}/> Add cardio</button>
    </div>
    <p className="muted cardio-helper">Duration is kept for your log; the calorie total you enter is what gets added. If the same activity is already counted in miles walked or miles run, lower those sliders to avoid double-counting.</p>
  </div>;
}

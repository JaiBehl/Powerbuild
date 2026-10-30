import React from 'react';

const PRESETS=[['¼',0.25],['½',0.5],['1',1],['2',2],['3',3]];

export default function ServingPicker({value,onChange,label='Servings'}){
  const current=String(value??'1');
  return <div className="serving-picker">
    <label>{label}
      <input type="number" min="0.01" max="100" step="any" inputMode="decimal" value={current} aria-label={label} onChange={e=>onChange(e.target.value)}/>
    </label>
    <div className="serving-presets" role="group" aria-label="Quick serving amounts">
      {PRESETS.map(([text,num])=><button key={text} type="button" title={num+' servings'} aria-pressed={Number(current)===num} className={Number(current)===num?'is-selected':''} onClick={()=>onChange(String(num))}>{text}×</button>)}
    </div>
  </div>;
}

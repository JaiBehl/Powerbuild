import React from 'react';
import {fromDisplayWeight,toDisplayWeight,unitName} from './units';
export default function ResistanceFields({resistance='external',defaultAddedWeight=0,units='lb',onChange,defaults=true}){
 const bodyweight=resistance==='bodyweight';return <div className="resistance-fields"><label className="weekpick"><input type="checkbox" role="switch" aria-label="Bodyweight exercise" checked={bodyweight} onChange={e=>onChange({resistance:e.target.checked?'bodyweight':'external'})}/> Bodyweight exercise</label><p className="muted">{bodyweight?'Bodyweight + optional added weight. Zero added weight means bodyweight only.':'Weighted exercise: log the external load.'}</p>{bodyweight&&defaults&&<label>Default added weight ({unitName(units)})<input type="number" min="0" step={units==='kg'?'0.5':'2.5'} value={toDisplayWeight(defaultAddedWeight,units,1)} onChange={e=>onChange({defaultAddedWeight:fromDisplayWeight(e.target.value,units)})}/></label>}</div>;
}

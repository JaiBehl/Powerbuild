import React from 'react';
import {previousPerformance} from './trainingStats';
import {formatWeight} from './units';

function setLabel(set,units){
 const weight=set.resistance==='bodyweight'?
   (Number(set.weight)>0?'BW + '+formatWeight(set.weight,units,1):'Bodyweight'):
   formatWeight(set.weight,units,1);
 return weight+' × '+set.reps+(set.rpe?' @ '+set.rpe+' RPE':'');
}
function shortDate(date){
 const parts=String(date||'').split('-');
 return parts.length===3?Number(parts[1])+'/'+Number(parts[2])+'/'+parts[0]:date;
}

export default function PreviousPerformance({db,name,date,units,resistance}){
 const previous=previousPerformance(db,name,date,resistance);
 if(!previous||!previous.sets?.length)return null;
 const first=previous.sets[0];
 const remaining=previous.sets.length-1;
 return <details className="previous-performance">
   <summary aria-label={'Previous finished session for '+name}>
     <span className="previous-performance-label">Previous</span>
     <span className="previous-performance-date">{shortDate(previous.date)} · {previous.type}</span>
     <strong>{setLabel(first,units)}{remaining>0?' · +'+remaining+' sets':''}</strong>
   </summary>
   <p className="previous-performance-sets">{previous.sets.map(s=>setLabel(s,units)).join(' · ')}</p>
 </details>;
}

import React from 'react';
import {previousPerformance} from './trainingStats';
import {formatWeight} from './units';
export default function PreviousPerformance({db,name,date,units,resistance}){
 const previous=previousPerformance(db,name,date,resistance);
 return <div className="previous-performance"><small>PREVIOUS FINISHED SESSION</small>{previous?<><span>{previous.date} · {previous.type}</span><p>{previous.sets.map(s=>(s.resistance==='bodyweight'?(Number(s.weight)>0?'BW + '+formatWeight(s.weight,units,1):'Bodyweight'):formatWeight(s.weight,units,1))+' × '+s.reps+(s.rpe?' @ '+s.rpe+' RPE':'')).join(' · ')}</p></>:<p>No previous finished session for this movement.</p>}</div>;
}

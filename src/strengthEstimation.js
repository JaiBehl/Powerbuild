// Nuzzo et al., Sports Medicine 54 (2024), Figs 2–4.
// https://doi.org/10.1007/s40279-023-01937-7 (CC BY 4.0)
// Pairs: [mean repetitions to failure, %1RM]. Inverting/interpolating
// population means is our approximation, not a validated individual
// prediction equation. The [1,100] boundary is the definition of a 1RM.
const tables={
  general:[[1,100],[3.28,95],[4.94,90],[7.15,85],[9.75,80],[12.37,75]],
  bench:[[1,100],[2.59,95],[4.11,90],[6.23,85],[8.82,80],[11.51,75]],
  legPress:[[1,100],[7.04,95],[8.69,90],[10.69,85]],
};
const numeric=value=>typeof value==='number'||(typeof value==='string'&&value.trim()!=='')?Number(value):NaN;
export function strengthModel(exercise=''){
  const name=String(exercise).trim().toLowerCase().replace(/\s+/g,' ');
  if(['bench','bench press','barbell bench press','touch-and-go bench press'].includes(name))return 'bench';
  if(['leg press','machine leg press','45-degree leg press','45 degree leg press'].includes(name))return 'legPress';
  return 'general';
}
export function estimateStrength(weight,reps,rpe='',exercise=''){
  const w=numeric(weight),r=numeric(reps),missingRpe=rpe===null||rpe===undefined||(typeof rpe==='string'&&rpe.trim()==='');
  if(!Number.isFinite(w)||w<=0||!Number.isInteger(r)||r<1)return null;
  const effort=missingRpe?null:numeric(rpe),model=strengthModel(exercise);
  // A single with unknown effort is an achievement, not a tested maximum.
  if(r===1&&(missingRpe||effort===10))return {value:w,kind:'achieved',model,repsToFailure:1,rpe:effort,missingRpe};
  // Conservative product gates, not universal biological cutoffs.
  if(r>10||(!missingRpe&&(!Number.isFinite(effort)||effort<7||effort>10)))return null;
  const repsToFailure=r+(missingRpe?0:10-effort);
  if(repsToFailure>10)return null;
  const table=tables[model],index=table.findIndex(([n])=>n>=repsToFailure);
  if(index<1)return null;
  const [low,high]=[table[index-1],table[index]];
  const percent=low[1]+(high[1]-low[1])*(repsToFailure-low[0])/(high[0]-low[0]);
  const value=w*100/percent;
  return Number.isFinite(value)?{value,kind:'estimated',model,repsToFailure,rpe:effort,missingRpe}:null;
}
export function e1rm(weight,reps,rpe='',exercise=''){
  return estimateStrength(weight,reps,rpe,exercise)?.value??null;
}

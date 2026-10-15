export const LB_PER_KG=2.2046226218;

export const unitName=(units)=>units==='kg'?'kg':'lb';

export function toDisplayWeight(lb,units,decimals=1){
  if(lb===''||lb===null||lb===undefined||Number.isNaN(Number(lb)))return '';
  const value=units==='kg'?Number(lb)/LB_PER_KG:Number(lb);
  const factor=10**decimals;
  return Math.round(value*factor)/factor;
}

export function fromDisplayWeight(value,units){
  if(value===''||value===null||value===undefined)return '';
  const n=Number(value);
  if(Number.isNaN(n))return '';
  return units==='kg'?n*LB_PER_KG:n;
}

export function formatWeight(lb,units,decimals=1){
  const value=toDisplayWeight(lb,units,decimals);
  if(value==='')return '—';
  return `${value} ${unitName(units)}`;
}

export function toDisplayRate(lbPerWeek,units,decimals=2){
  const value=units==='kg'?Number(lbPerWeek)/LB_PER_KG:Number(lbPerWeek);
  const factor=10**decimals;
  return Math.round(value*factor)/factor;
}

export function displayMacroRate(perLb,units,decimals=2){
  const value=units==='kg'?Number(perLb)*LB_PER_KG:Number(perLb);
  const factor=10**decimals;
  return Math.round(value*factor)/factor;
}

export function storeMacroRate(displayValue,units){
  const n=Number(displayValue);
  if(Number.isNaN(n))return 0;
  return units==='kg'?n/LB_PER_KG:n;
}

// Existing logged sets keep their original load interpretation unless explicitly edited.
export const isBodyweight=e=>e?.resistance==='bodyweight';
export const defaultResistance=name=>!(/\bor\b|assisted|pulldown/i.test(name||''))&&/push[ -]?up|pull[ -]?up|chin[ -]?up|\bdips?\b|inverted row|body[ -]?weight|hanging leg raise/i.test(name||'')?'bodyweight':'external';
export function resistanceConfig(value={},name=''){
 value=value&&typeof value==='object'?value:{};
 const resistance=['external','bodyweight'].includes(value.resistance)?value.resistance:defaultResistance(name);
 const n=Number(value.defaultAddedWeight);return {resistance,defaultAddedWeight:Number.isFinite(n)&&n>=0?n:0};
}
export const calisthenicExercises=['Push-up','Pull-up','Chin-up','Dip','Inverted row','Bodyweight squat'];

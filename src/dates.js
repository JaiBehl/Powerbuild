export function isISODate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;
}
export function addCalendarDays(value,days){if(!isISODate(value))throw Error('Invalid calendar date.');const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function startOfWeek(value){const day=new Date(value+'T12:00:00Z').getUTCDay();return addCalendarDays(value,-((day+6)%7));}

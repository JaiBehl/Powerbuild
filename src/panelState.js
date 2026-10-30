const KEY='powerbuild-panel-state-v1';
export const panelKey=(scope,section)=>JSON.stringify([...(Array.isArray(scope)?scope:['default','app']),String(section)]);
const read=storage=>{try{const x=JSON.parse(storage.getItem(KEY));return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}catch{return {};}};
export function readPanelCollapsed(key,fallback=false,storage=globalThis.localStorage){const value=read(storage)[key];return typeof value==='boolean'?value:fallback;}
export function savePanelCollapsed(key,value,storage=globalThis.localStorage){
 try{const all=read(storage);delete all[key];all[key]=!!value;const entries=Object.entries(all).slice(-200);storage.setItem(KEY,JSON.stringify(Object.fromEntries(entries)));return true;}catch{return false;}
}

export const libraryId=()=>globalThis.crypto?.randomUUID?.()||'library-'+Date.now()+'-'+Math.random().toString(36).slice(2);
export const libraryDate=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Existing / imported';
export function validLibraryName(value){const name=String(value||'').trim();if(!name||name.length>100||['__proto__','constructor','prototype'].includes(name.toLowerCase()))throw Error('Enter a name of 1–100 characters.');return name;}

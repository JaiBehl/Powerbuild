export const PROFILE_META_KEY='powerbuild-profiles-v1';
const PROFILE_DATA_PREFIX='powerbuild-tracker-v1:profile:';

export const profileDataKey=(id)=>`${PROFILE_DATA_PREFIX}${id}`;

export function ensureProfiles(loadLegacy,freshDb){
  try{
    const saved=JSON.parse(localStorage.getItem(PROFILE_META_KEY));
    if(saved&&Array.isArray(saved.profiles)&&saved.profiles.length){
      const activeExists=saved.profiles.some(p=>p.id===saved.activeProfileId);
      return {
        profiles:saved.profiles,
        activeProfileId:activeExists?saved.activeProfileId:saved.profiles[0].id,
      };
    }
  }catch{}

  const id='primary';
  const profile={id,name:'My profile',createdAt:new Date().toISOString()};
  const existing=loadLegacy?.()||freshDb();
  try{localStorage.setItem(profileDataKey(id),JSON.stringify(existing));}catch{}
  const meta={profiles:[profile],activeProfileId:id};
  try{localStorage.setItem(PROFILE_META_KEY,JSON.stringify(meta));}catch{}
  return meta;
}

export function loadProfileDb(id,freshDb){
  try{
    const parsed=JSON.parse(localStorage.getItem(profileDataKey(id)));
    if(parsed&&Array.isArray(parsed.sessions)) return parsed;
  }catch{}
  return freshDb();
}

export function saveProfileDb(id,db){
  if(!id)return;
  localStorage.setItem(profileDataKey(id),JSON.stringify(db));
}

export function saveProfileMeta(meta){
  localStorage.setItem(PROFILE_META_KEY,JSON.stringify(meta));
}

export function removeProfileDb(id){
  localStorage.removeItem(profileDataKey(id));
}

export function saveWorkspaceSnapshot(meta,data,storage=globalThis.localStorage){
 const writes=[...meta.profiles.map(p=>[profileDataKey(p.id),JSON.stringify(data[p.id])]),[PROFILE_META_KEY,JSON.stringify(meta)]];
 const old=writes.map(([key])=>[key,storage.getItem(key)]);
 try{for(const [key,value]of writes)storage.setItem(key,value);}
 catch(error){for(const [key,value]of old){try{if(value===null)storage.removeItem(key);else storage.setItem(key,value);}catch{}}throw Error('Could not save all profiles on this device. Recovery copies were retained. '+error.message);}
}

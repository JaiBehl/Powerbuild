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
  localStorage.setItem(profileDataKey(id),JSON.stringify(existing));
  const meta={profiles:[profile],activeProfileId:id};
  localStorage.setItem(PROFILE_META_KEY,JSON.stringify(meta));
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

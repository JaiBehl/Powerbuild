import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
export async function inspectProduction(origin,fetcher=fetch){
 const base=new URL(origin),htmlResponse=await fetcher(base.href,{signal:AbortSignal.timeout(15000),cache:'no-store'});
 if(!htmlResponse.ok)throw Error('Production HTML returned '+htmlResponse.status);
 const html=await htmlResponse.text(),scripts=[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)];
 const asset=scripts.map(match=>new URL(match[1],base)).find(url=>url.origin===base.origin&&url.pathname.startsWith('/assets/')&&url.pathname.endsWith('.js'));
 if(!asset)throw Error('Production HTML does not reference a Vite application bundle.');
 const bundleResponse=await fetcher(asset.href,{signal:AbortSignal.timeout(15000),cache:'no-store'});
 if(!bundleResponse.ok)throw Error('Production bundle returned '+bundleResponse.status);
 const bundle=await bundleResponse.text(),required=['Personal records','Relative strength records','Est. BW','Weekly review','Recovery copies','Follow weigh-ins','Saved Foods','RPE-aware','Resting metabolism formula'];
 const missing=required.filter(label=>!bundle.includes(label));if(missing.length)throw Error('Production bundle is missing release features: '+missing.join(', '));
 return {origin:base.origin,asset:asset.pathname,features:required};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 let last;
 for(let attempt=1;attempt<=12;attempt++){
  try{console.log(JSON.stringify(await inspectProduction(process.argv[2]||'https://powerbuild-flexible-goals.vercel.app')));last=null;break;}
  catch(error){last=error;console.log('Waiting for production ('+attempt+'/12): '+error.message);if(attempt<12)await new Promise(resolve=>setTimeout(resolve,10000));}
 }
 if(last){console.error(last.message);process.exitCode=1;}
}

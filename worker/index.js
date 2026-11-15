import {calculate,validate,InputError} from './model.js';
import {roverEnergy} from '../public/simulation-model.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 try {
 if(path==='/api/intelligence')return intelligenceResponse(request,env);
 if(path.startsWith('/api/')){
  if(path==='/api/health')return json({status:'ok',storage:env.BUCKET?'available':'unavailable'});
  if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed'},405);
  if(request.method==='POST'){
   if(request.headers.get('Origin') && request.headers.get('Origin')!==url.origin)return json({error:'Origin not allowed'},403);
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Use application/json'},415);
  }
  if(path==='/api/energy' || path==='/api/routes' || path==='/api/estimate' || path==='/api/missions' && request.method==='POST'){
   const reader=request.body?.getReader();let chunks=[],size=0;
   if(reader)while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>32768){await reader.cancel();return json({error:'Request too large'},413)}chunks.push(value)}
   const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
   let input;try{input=JSON.parse(new TextDecoder().decode(bytes))}catch{return json({error:'Invalid JSON'},400)}
   if(path==='/api/energy'){try{return json(roverEnergy(input))}catch(e){return json({error:e.message},400)}}
   if(path==='/api/routes'){try{return json(routeAlternatives(TERRAIN,input,HAZARDS))}catch(e){return json({error:e.message},400)}}
   const plan=validate(input),estimate=calculate(plan);
   if(path==='/api/estimate')return json({estimate});
   const user=request.headers.get('oai-authenticated-user-id');if(!user)return json({error:'Sign in to save missions'},401);
   if(!env.BUCKET)return json({error:'Mission storage is unavailable'},503);
   const id=crypto.randomUUID(),createdAt=new Date().toISOString(),mission={id,...plan,createdAt};
   await env.BUCKET.put('missions/'+encodeURIComponent(user)+'/'+id+'.json',JSON.stringify(mission),{httpMetadata:{contentType:'application/json'}});
   return json({mission,estimate},201);
  }
  if(path==='/api/missions' && request.method==='GET'){
   const user=request.headers.get('oai-authenticated-user-id');if(!user)return json({error:'Sign in to view saved missions'},401);
   if(!env.BUCKET)return json({error:'Mission storage is unavailable'},503);
   const prefix='missions/'+encodeURIComponent(user)+'/',listed=await env.BUCKET.list({prefix,limit:100});
   const missions=(await Promise.all(listed.objects.map(async o=>{const object=await env.BUCKET.get(o.key);return object?JSON.parse(await object.text()):null}))).filter(Boolean).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
   return json({missions,hasMore:listed.truncated});
  }
  return json({error:'Endpoint not found'},404);
 }
 const key=path==='/'?'/index.html':path;
 if(!ASSETS[key])return new Response('Not found',{status:404});
 const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',woff2:'font/woff2',webp:'image/webp',png:'image/png',jpg:'image/jpeg',json:'application/json; charset=utf-8',svg:'image/svg+xml',wasm:'application/wasm'};
 return new Response(Uint8Array.from(atob(ASSETS[key]),c=>c.charCodeAt(0)),{headers:{'Content-Type':types[key.split('.').pop()]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'}});
 }catch(e){return json({error:e instanceof InputError?e.message:'Unable to complete request'},e instanceof InputError?400:500)}
}};

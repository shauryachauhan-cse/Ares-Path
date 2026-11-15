// Reproducible A* on a bounded CTX elevation grid. No operational safety claim.
export function routeAlternatives(terrain,input,hazards=null){

 if(input.via?.length){
  if(!Array.isArray(input.via)||input.via.length>98)throw new Error('Use up to 98 intermediate waypoints.');
  const stops=[input.start,...input.via,input.end],legs=[];
  for(let i=1;i<stops.length;i++)legs.push(routeAlternatives(terrain,{...input,start:stops[i-1],end:stops[i],via:[]},hazards));
  const routes=legs[0].routes.map(r=>{
   const parts=legs.map(l=>l.routes.find(p=>p.id===r.id));if(parts.some(p=>!p))return null;
   const total=parts.reduce((n,p)=>n+p.oneWayKm,0);let offset=0;
   const profile=parts.flatMap((p,i)=>{const v=p.profile.map(q=>({...q,fraction:(offset+q.fraction*p.oneWayKm)/total}));offset+=p.oneWayKm;return i?v.slice(1):v});
   return {...r,waypoints:parts.flatMap((p,i)=>i?p.waypoints.slice(1):p.waypoints),profile,oneWayKm:total,ascentMeters:parts.reduce((n,p)=>n+p.ascentMeters,0),descentMeters:parts.reduce((n,p)=>n+p.descentMeters,0),roundTripAscentMeters:parts.reduce((n,p)=>n+p.roundTripAscentMeters,0),maxModeledSlopeDegrees:Math.max(...parts.map(p=>p.maxModeledSlopeDegrees)),averageModeledSlopeDegrees:parts.reduce((n,p)=>n+p.averageModeledSlopeDegrees*p.oneWayKm,0)/total,modelScore:parts.reduce((n,p)=>n+p.modelScore,0),endpointSnapMeters:{start:parts[0].endpointSnapMeters.start,end:parts.at(-1).endpointSnapMeters.end}};
  }).filter(Boolean);if(!routes.length)throw new Error('No common route objective connects every waypoint.');
  return {...legs[0],routes,recommendedId:routes.reduce((a,b)=>a.modelScore<b.modelScore?a:b).id};
 }
 const {width:W,height:H,bounds:b,values:z}=terrain;
 const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=b[0]&&p[0]<=b[2]&&p[1]>=b[1]&&p[1]<=b[3];
 if(!point(input.start)||!point(input.end))throw new Error('Choose start and target inside the elevation coverage.');
 const limit=input.maxSlopeDegrees??15;if(!Number.isFinite(limit)||limit<5||limit>30)throw new Error('Slope limit must be between 5 and 30 degrees.');
 const exclusions=input.exclusions??[];if(!Array.isArray(exclusions)||exclusions.length>20||exclusions.some(e=>!point(e.center)||!Number.isFinite(e.radiusMeters)||e.radiusMeters<50||e.radiusMeters>1000))throw new Error('Use up to 20 exclusion circles, each 50–1000 m.');
 const dx=(b[2]-b[0])*Math.PI/180*3396190*Math.cos((b[1]+b[3])/2*Math.PI/180)/W,dy=(b[3]-b[1])*Math.PI/180*3396190/H;
 const coord=i=>[b[0]+(i%W+.5)*(b[2]-b[0])/W,b[3]-(Math.floor(i/W)+.5)*(b[3]-b[1])/H];
 const cell=p=>Math.min(H-1,Math.floor((b[3]-p[1])/(b[3]-b[1])*H))*W+Math.min(W-1,Math.floor((p[0]-b[0])/(b[2]-b[0])*W));
 const start=cell(input.start),end=cell(input.end);if(start===end)throw new Error('Choose a destination at least one planning-grid cell away.');const blocked=Uint8Array.from(input.avoidMappedHazards===false?new Uint8Array(W*H):(hazards?.values??new Uint8Array(W*H))),slope=new Float32Array(W*H);
 for(let i=0;i<z.length;i++){
  if(z[i]===null){blocked[i]=1;continue}
  const x=i%W,y=Math.floor(i/W);let gx=0,gy=0;
  if(x>0&&x<W-1&&z[i-1]!==null&&z[i+1]!==null)gx=(z[i+1]-z[i-1])/(2*dx);
  if(y>0&&y<H-1&&z[i-W]!==null&&z[i+W]!==null)gy=(z[i+W]-z[i-W])/(2*dy);
  slope[i]=Math.atan(Math.hypot(gx,gy))*180/Math.PI;if(slope[i]>limit)blocked[i]=1;
  const p=coord(i);for(const e of exclusions){const mx=(p[0]-e.center[0])*Math.PI/180*3396190*Math.cos(p[1]*Math.PI/180),my=(p[1]-e.center[1])*Math.PI/180*3396190;if(Math.hypot(mx,my)<=e.radiusMeters+Math.hypot(dx,dy)/2)blocked[i]=1;}
 }
 if(blocked[start]||blocked[end])throw new Error('Habitat or target is on excluded terrain (modeled slope, missing data, a marked hazard, or mapped bedforms under your avoidance policy). Move it or review the constraints.');
 const heuristic=i=>Math.hypot((i%W-end%W)*dx,(Math.floor(i/W)-Math.floor(end/W))*dy);
 const profiles=[{id:'distance',name:'Distance priority',weight:0},{id:'balanced',name:'Balanced terrain',weight:4},{id:'terrain',name:'Terrain priority',weight:12}];
 const routes=[];
 for(const profile of profiles){
  const cost=new Float64Array(W*H).fill(Infinity),parent=new Int32Array(W*H).fill(-1),closed=new Uint8Array(W*H),heap=[];
  function push(item){let i=heap.length;heap.push(item);while(i){const p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p;}heap[i]=item}
  function pop(){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[c][0]>=last[0])break;heap[i]=heap[c];i=c;}heap[i]=last}return first[1]}
  cost[start]=0;push([heuristic(start),start]);let found=false;
  while(heap.length){const i=pop();if(closed[i])continue;if(i===end){found=true;break}closed[i]=1;const x=i%W,y=Math.floor(i/W);
   for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){if(!ox&&!oy)continue;const xx=x+ox,yy=y+oy;if(xx<0||xx>=W||yy<0||yy>=H)continue;const j=yy*W+xx;if(blocked[j]||closed[j])continue;if(ox&&oy&&(blocked[y*W+xx]||blocked[yy*W+x]))continue;
    const distance=Math.hypot(ox*dx,oy*dy),grade=Math.atan(Math.abs(z[j]-z[i])/distance)*180/Math.PI;if(grade>limit)continue;const local=Math.max(slope[i],slope[j],grade),next=cost[i]+distance*(1+profile.weight*(local/10)**2);
    if(next<cost[j]){cost[j]=next;parent[j]=i;push([next+heuristic(j),j]);}
   }
  }
  if(!found)continue;
  const cells=[];for(let i=end;i!==-1;i=parent[i])cells.push(i);cells.reverse();let distance=0,up=0,down=0,maxSlope=0,integrated=0,slopeIntegral=0;
  for(let k=1;k<cells.length;k++){const a=cells[k-1],c=cells[k],d=Math.hypot((c%W-a%W)*dx,(Math.floor(c/W)-Math.floor(a/W))*dy),dz=z[c]-z[a],s=Math.max(slope[a],slope[c],Math.atan(Math.abs(dz)/d)*180/Math.PI);slopeIntegral+=s*d;distance+=d;up+=Math.max(0,dz);down+=Math.max(0,-dz);maxSlope=Math.max(maxSlope,s);integrated+=d*(1+4*(s/10)**2);}
  const points=cells.map(coord); // Snap both endpoints to the grid and disclose the displacement.
  routes.push({...profile,waypoints:points,oneWayKm:distance/1000,ascentMeters:up,descentMeters:down,roundTripAscentMeters:up+down,maxModeledSlopeDegrees:maxSlope,averageModeledSlopeDegrees:slopeIntegral/distance,coveragePercent:100,modelScore:integrated,endpointSnapMeters:{start:Math.hypot((input.start[0]-points[0][0])*dx*W/(b[2]-b[0]),(input.start[1]-points[0][1])*dy*H/(b[3]-b[1])),end:Math.hypot((input.end[0]-points.at(-1)[0])*dx*W/(b[2]-b[0]),(input.end[1]-points.at(-1)[1])*dy*H/(b[3]-b[1]))},profile:cells.map((i,k)=>({fraction:k/Math.max(1,cells.length-1),elevationMeters:z[i]}))});
 }
 if(!routes.length)throw new Error('No route found under these constraints. Try different endpoints or exclusions.');
 const best=routes.reduce((a,c)=>c.modelScore<a.modelScore?c:a);return{routes,recommendedId:best.id,reason:'Lowest distance-weighted terrain cost among these candidates (distance × [1 + 4 × (modeled slope / 10°)²]). Time-budget feasibility is checked separately.',maxSlopeDegrees:limit,gridSpacingMeters:terrain.gridSpacingMeters,nativeSpacingMeters:terrain.nativeSpacingMeters,source:terrain.source,mappedHazardsAvoided:!!hazards&&input.avoidMappedHazards!==false,limitations:['Best under this model, not a certified safe route','Elevation grid is area-averaged; small craters and obstacles may be unresolved','Crater avoidance uses user-marked exclusion circles, not automatic detection','Endpoints are snapped to planning-grid cell centers','Ascent and slope depend on DEM errors and resampling; inspect before interpreting']};
}

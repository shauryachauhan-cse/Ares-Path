// Educational hypothetical robot model. SI mechanical energy converted from J to Wh.
export function roverEnergy(input){
 const spec={distanceKm:[0,2000],ascentM:[0,100000],descentM:[0,100000],massKg:[1,3000],capacityWh:[1,100000],chargePercent:[0,100],reservePercent:[0,100],rollingResistance:[.005,.5],efficiency:[.05,1],auxiliaryW:[0,5000],scienceW:[0,5000],speedKmh:[.1,20],scienceMinutes:[0,1440],solarW:[0,5000],solarHours:[0,24]};
 for(const [key,[min,max]]of Object.entries(spec))if(typeof input[key]!=='number'||!Number.isFinite(input[key])||input[key]<min||input[key]>max)throw new Error(key+' must be between '+min+' and '+max);
 const i=input,g=3.71,kmWh=i.massKg*g*i.rollingResistance*1000/(3600*i.efficiency),climbWhM=i.massKg*g/(3600*i.efficiency),outHours=i.distanceKm/i.speedKmh;
 const outboundWh=kmWh*i.distanceKm+climbWhM*i.ascentM+i.auxiliaryW*outHours;
 const returnWh=kmWh*i.distanceKm+climbWhM*i.descentM+i.auxiliaryW*outHours;
 const scienceWh=(i.auxiliaryW+i.scienceW)*i.scienceMinutes/60;
 const demandWh=outboundWh+returnWh+scienceWh,solarWh=i.solarW*i.solarHours,startWh=i.capacityWh*i.chargePercent/100;
 // Conservative accounting: do not promise any solar generation can be stored before it is needed.
 const remainingWh=startWh-demandWh,withSolarRemainingWh=Math.min(i.capacityWh,startWh+solarWh-demandWh),reserveWh=i.capacityWh*i.reservePercent/100;
 return{outboundWh,returnWh,scienceWh,demandWh,solarWh,startWh,remainingWh,remainingPercent:remainingWh/i.capacityWh*100,reserveWh,withSolarRemainingWh,fits:remainingWh>=reserveWh,rollingWhPerKm:kmWh,travelHours:outHours*2,limitations:['No regenerative braking','Return retraces outbound route; outbound descent becomes return ascent','Solar contribution is optional scenario potential, excluded from base fit','No wheel slip, suspension, temperature degradation or terrain-mechanics model','Not validated for NASA rover operations']};
}
export function terrainSample(t,p){
 if(!t||!Array.isArray(p))return null;const [a,b,c,d]=t.bounds;if(p[0]<a||p[0]>c||p[1]<b||p[1]>d)return null;
 const x=Math.min(t.width-1,Math.floor((p[0]-a)/(c-a)*t.width)),y=Math.min(t.height-1,Math.floor((d-p[1])/(d-b)*t.height)),z=t.values[y*t.width+x];return z===null?null:z;
}
function terrainInterpolated(t,p){
 const [a,b,c,d]=t.bounds;if(p[0]<a||p[0]>c||p[1]<b||p[1]>d)return null;
 const px=Math.max(0,Math.min(t.width-1,(p[0]-a)/(c-a)*t.width-.5)),py=Math.max(0,Math.min(t.height-1,(d-p[1])/(d-b)*t.height-.5)),x=Math.floor(px),y=Math.floor(py),fx=px-x,fy=py-y;
 const values=[t.values[y*t.width+x],t.values[y*t.width+Math.min(x+1,t.width-1)],t.values[Math.min(y+1,t.height-1)*t.width+x],t.values[Math.min(y+1,t.height-1)*t.width+Math.min(x+1,t.width-1)]];
 if(values.some(v=>v===null))return null;return values[0]*(1-fx)*(1-fy)+values[1]*fx*(1-fy)+values[2]*(1-fx)*fy+values[3]*fx*fy;
}
export function routeTerrain(t,points){
 if(!t)return null;const rad=Math.PI/180,segments=[],samples=[];let distanceM=0,ascentM=0,descentM=0,missingM=0,weightedSlope=0,maxSlope=0;
 for(let k=1;k<points.length;k++){
  const a=points[k-1],b=points[k],d=Math.hypot((a[0]-b[0])*Math.cos((a[1]+b[1])/2*rad),a[1]-b[1])*rad*3396190;
  const n=Math.max(1,Math.ceil(d/(typeof t.gridSpacingMeters==='number'?t.gridSpacingMeters:80)));let previous=null;
  for(let j=0;j<=n;j++){const p=[a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n],z=terrainInterpolated(t,p);if(k===1||j>0)samples.push({distanceM:distanceM+d*j/n,elevationMeters:z});if(j){const step=d/n;const valid=z!==null&&previous!==null;const dz=valid?z-previous:0,slope=valid?Math.atan2(Math.abs(dz),step)/rad:null;if(valid){ascentM+=Math.max(0,dz);descentM+=Math.max(0,-dz);weightedSlope+=slope*step;maxSlope=Math.max(maxSlope,slope)}else missingM+=step;segments.push({a:[a[0]+(b[0]-a[0])*(j-1)/n,a[1]+(b[1]-a[1])*(j-1)/n],b:p,slope})}previous=z;
  }distanceM+=d;
 }
 return{distanceM,ascentM,descentM,maxSlope,averageSlope:distanceM>missingM?weightedSlope/(distanceM-missingM):null,missingPercent:distanceM?missingM/distanceM*100:0,samples,segments};
}

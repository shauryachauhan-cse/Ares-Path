export class InputError extends Error {}
const fail = message => { throw new InputError(message); };
function number(v, min, max, name) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) fail(`${name} must be a number from ${min} to ${max}`);
  return v;
}
export function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Expected a mission object');
  const {name, waypoints, speedKmh, scienceMinutes, reserveMinutes, budgetMinutes} = input;
  if (typeof name !== 'string' || !name.trim() || name.length > 100) fail('name must contain 1–100 characters');
  if (!Array.isArray(waypoints) || waypoints.length < 2 || waypoints.length > 1024) fail('Provide 2–1024 waypoints, starting at the habitat');
  const points = waypoints.map(p => {
    if (!Array.isArray(p) || p.length !== 2) fail('Each waypoint must be [longitude, latitude]');
    return [number(p[0], -180, 180, 'longitude'), number(p[1], -90, 90, 'latitude')];
  });
  if(input.scienceGoal!==undefined && !['sediments','crater-floor','terrain-survey'].includes(input.scienceGoal))fail('Choose a supported science goal');
  if(input.controlWaypoints!==undefined&&(!Array.isArray(input.controlWaypoints)||input.controlWaypoints.length>98||input.controlWaypoints.some(p=>!Array.isArray(p)||p.length!==2||p.some((v,i)=>!Number.isFinite(v)||Math.abs(v)>(i?90:180)))))fail('Invalid intermediate waypoint list');
  if(input.terrainRouteId!==undefined&&input.terrainRouteId!==null&&!['distance','balanced','terrain'].includes(input.terrainRouteId))fail('Invalid terrain route objective');
  const exclusions=input.exclusions??[];if(!Array.isArray(exclusions)||exclusions.length>20||exclusions.some(e=>!Array.isArray(e?.center)||e.center.length!==2||e.center.some((v,i)=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>(i?90:180))||typeof e.radiusMeters!=='number'||!Number.isFinite(e.radiusMeters)||e.radiusMeters<50||e.radiusMeters>1000))fail('Invalid exclusion zones');
  const maxSlopeDegrees=number(input.maxSlopeDegrees??15,5,30,'maxSlopeDegrees');
  if(input.avoidMappedHazards!==undefined&&typeof input.avoidMappedHazards!=='boolean')fail('avoidMappedHazards must be true or false');
  return {avoidMappedHazards:input.avoidMappedHazards??true,exclusions,maxSlopeDegrees,controlWaypoints:input.controlWaypoints??undefined,terrainRouteId:input.terrainRouteId??null,name: name.trim(),scienceGoal:input.scienceGoal??'sediments', waypoints: points,
    speedKmh: number(speedKmh, .1, 10, 'speedKmh'),
    scienceMinutes: number(scienceMinutes, 0, 1440, 'scienceMinutes'),
    reserveMinutes: number(reserveMinutes, 0, 1440, 'reserveMinutes'),
    budgetMinutes: number(budgetMinutes, 1, 1440, 'budgetMinutes'),
    mobilityFactor: number(input.mobilityFactor ?? 1, 1, 3, 'mobilityFactor'),
    equipmentKg: number(input.equipmentKg ?? 0, 0, 40, 'equipmentKg'),
    restMinutes: number(input.restMinutes ?? 0, 0, 120, 'restMinutes')};
}
export function calculate(plan) {
  const p = validate(plan), rad = Math.PI / 180;
  let oneWayKm = 0;
  for (let i = 1; i < p.waypoints.length; i++) {
    const [a,b] = [p.waypoints[i-1],p.waypoints[i]];
    const h = Math.sin((b[1]-a[1])*rad/2)**2 + Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin((b[0]-a[0])*rad/2)**2;
    oneWayKm += 2*3396.19*Math.asin(Math.sqrt(Math.min(1,h)));
  }
  const roundTripKm = oneWayKm*2, walkingMinutes = roundTripKm/p.speedKmh*60*p.mobilityFactor;
  const allocatedMinutes = walkingMinutes+p.scienceMinutes+p.reserveMinutes+p.restMinutes;
  return {oneWayKm,roundTripKm,walkingMinutes,restMinutes:p.restMinutes,effectiveSpeedKmh:p.speedKmh/p.mobilityFactor,allocatedMinutes,
    unallocatedMinutes:p.budgetMinutes-allocatedMinutes,withinBudget:allocatedMinutes<=p.budgetMinutes,
    assumptions:['Mars cartographic sphere radius: 3396.19 km (matches local terrain grid)','Return retraces outbound waypoints','User-selected speed with scenario mobility multiplier; equipment mass recorded, not a validated effort model'],
    limitations:['Hypothetical route; traversability not verified','Time estimate has no terrain-effort, soil, spacesuit, oxygen, or weather model','Time-budget fit does not establish safety']};
}

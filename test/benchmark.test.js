import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {calculate} from '../worker/model.js';import {routeAlternatives} from '../worker/routing.js';
test('published benchmark matches its bundled data and exposes the real slope/distance tradeoff',()=>{
 const b=JSON.parse(fs.readFileSync('public/benchmark.json')),t=JSON.parse(fs.readFileSync('public/terrain.json')),h=JSON.parse(fs.readFileSync('public/hazard-grid.json'));
 for(const [path,hash]of Object.entries(b.sourceHashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public/'+path)).digest('hex'),hash,'Rebuild benchmark after changing '+path);
 const routes=routeAlternatives(t,b.mission,h).routes;for(const r of routes){const published=b.routes.find(x=>x.id===r.id);assert.equal(published.roundTripKm,r.oneWayKm*2);assert.equal(published.maxModeledSlopeDegrees,r.maxModeledSlopeDegrees);const e=calculate({name:b.mission.name,waypoints:r.waypoints,...b.time});assert.ok(Math.abs(e.roundTripKm-r.oneWayKm*2)<.002,'Time and routing distances agree within 2 m');assert.equal(published.allocatedMinutes,e.allocatedMinutes)}
 const [a,balanced]=b.routes;assert.ok(balanced.maxModeledSlopeDegrees<a.maxModeledSlopeDegrees);assert.ok(balanced.roundTripKm>a.roundTripKm);assert.ok(balanced.energyWh>a.energyWh);assert.equal(b.bedformPolicyChangedPaths,false);
});

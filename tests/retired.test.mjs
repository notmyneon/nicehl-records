import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>JSON.parse(readFileSync(new URL('../data/'+f,import.meta.url))),retired=read('nicehl-retired.json'),history=read('nicehl-player-history.json');
const key=p=>p.group+':'+(p.playerId||'name:'+p.playerName);
test('retired membership uses final appearance across every roster, including zero starts',()=>{
 const last=new Map();for(const e of history.entries)last.set(key(e),[last.get(key(e))||'',e.season].sort().at(-1));
 const scored=new Set(history.entries.filter(e=>e.stats.GP||e.stats.FPts).map(key));
 assert.deepEqual(new Set(retired.players.map(key)),new Set([...scored].filter(k=>last.get(k)!==retired.latestSeason)));
 for(const p of retired.players){assert.equal(p.lastSeason,last.get(key(p)));assert.ok(p.lastSeason<retired.latestSeason);for(const stat of ['FPts','GP'])assert.equal(p.stats[stat],p.seasonStats.reduce((n,s)=>n+s.stats[stat],0));assert.equal(p.finalPoints,p.seasonStats.filter(s=>s.season===p.lastSeason).reduce((n,s)=>n+s.stats.FPts,0));}
});

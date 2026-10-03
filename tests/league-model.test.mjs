import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {leaguePlayers,sortPlayers} from '../assets/league-model.mjs';
const data=JSON.parse(readFileSync(new URL('../data/nicehl-league-leaders.json',import.meta.url))),history=JSON.parse(readFileSync(new URL('../data/nicehl-player-history.json',import.meta.url)));
test('all-time and every season preserve points/games from every team stint',()=>{
 for(const season of ['all',...data.seasons]){
  const list=leaguePlayers(data.players,season),entries=history.entries.filter(e=>(season==='all'||e.season===season)&&(e.stats.GP||e.stats.FPts));
  for(const key of ['FPts','GP','G','A'])assert.ok(Math.abs(list.reduce((n,p)=>n+(p.stats[key]||0),0)-entries.reduce((n,p)=>n+(p.stats[key]||0),0))<1e-6);
  for(const p of list){assert.equal(p.seasonCount,new Set(p.seasonStats.map(s=>s.season)).size);assert.ok(p.teamCount>=1);if(p.stats.GP)assert.equal(p.stats['FP/G'],p.stats.FPts/p.stats.GP);}
 }
});
test('multiple teams in one season stay separate per player; missing values sort last',()=>{
 const players=[{playerName:'Test',seasonStats:[{season:'2025-26',franchiseId:'a',stats:{GP:10,FPts:20,G:2}},{season:'2025-26',franchiseId:'b',stats:{GP:5,FPts:25}}]}];
 const [p,q]=leaguePlayers(players,'2025-26');assert.equal(p.stats.FPts,20);assert.equal(q.stats.FPts,25);assert.equal(p.stats['FP/G'],2);assert.equal(q.stats['FP/G'],5);assert.equal(p.seasonCount,1);assert.equal(p.teamCount,2);assert.equal(p.coverage.G,1);assert.equal(q.stats.G,undefined);
 for(const direction of [-1,1])assert.equal(sortPlayers([{playerName:'Missing',stats:{}},{playerName:'Present',stats:{G:1}}],'G',direction).at(-1).playerName,'Missing');
});

test('McDavid Red Foxes and Bowness contributions remain distinct',()=>{const rows=leaguePlayers(data.players).filter(p=>p.playerName==='Connor McDavid');assert.ok(rows.some(p=>p.franchiseId==='rotterdam-red-foxes'));assert.ok(rows.some(p=>p.franchiseId==='bowness-ice-beavers'));for(const p of rows)assert.ok(p.seasonStats.every(s=>s.franchiseId===p.franchiseId));});

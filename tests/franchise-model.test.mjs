import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildModel,teamGames,summarise,longestStreak,alumniForSeason} from '../assets/franchise-model.mjs';
const read=async p=>JSON.parse(await readFile(new URL('../data/'+p,import.meta.url),'utf8'));
const franchises=(await read('franchises.json')).franchises;
const manifest=await read('seasons.json');
const seasons=await Promise.all(manifest.seasons.map(async entry=>({entry,data:await read(entry.file)})));
const model=buildModel(franchises,seasons);
test('historical identities remain one franchise and retired teams remain visible',()=>{
  assert.equal(model.resolve('Taku River Glaciers'),'woodland-whistle-pigs');
  assert.equal(model.resolve('Last Mountain Walleye'),'maplewood-hc');
  assert.equal(model.current.size,16);
  assert.equal(model.current.has('cachco-eagles'),false);
  assert.equal(new Set(teamGames(model.games,'woodland-whistle-pigs').map(g=>g.season)).size,7);
});
test('head-to-head results are symmetric and league points are conserved',()=>{
  let pf=0,pa=0,wins=0,losses=0,games=0;
  for(const f of franchises){const s=summarise(teamGames(model.games,f.id));pf+=s.pointsFor;pa+=s.pointsAgainst;wins+=s.wins;losses+=s.losses;games+=s.games;}
  assert.equal(pf,pa);assert.equal(wins,losses);assert.equal(games,model.games.length*2);
  const woodland=teamGames(model.games,'woodland-whistle-pigs').filter(g=>g.opponentId==='steel-valley-fishercats');
  const steel=teamGames(model.games,'steel-valley-fishercats').filter(g=>g.opponentId==='woodland-whistle-pigs');
  const a=summarise(woodland),b=summarise(steel);assert.equal(a.pointsFor,b.pointsAgainst);assert.equal(a.wins,b.losses);
});
test('ties break both streaks and count half toward win percentage',()=>{
  const games=[{result:'W',own:3,against:1},{result:'W',own:4,against:2},{result:'T',own:2,against:2},{result:'L',own:1,against:3}];
  assert.equal(longestStreak(games,'W').length,2);assert.equal(summarise(games).winPct,.625);
});
test('alumni filters preserve franchise totals and unavailable categories',async()=>{
  const data=await read('nicehl-franchise-alumni.json');
  const players=data.franchises['woodland-whistle-pigs'];
  const all=players.reduce((n,p)=>n+p.stats.FPts,0);
  const seasons=data.seasons.reduce((n,s)=>n+alumniForSeason(players,s).reduce((m,p)=>m+p.stats.FPts,0),0);
  assert.equal(all,seasons);
  const filtered=alumniForSeason(players,'2019-20');assert.ok(filtered.length);assert.equal(filtered[0].seasonCount,1);
  for(const p of filtered)assert.ok(p.stats.GP===0||Math.abs(p.stats['FP/G']-p.stats.FPts/p.stats.GP)<1e-10);
  const synthetic=[{seasonStats:[{season:'2019-20',stats:{FPts:20,GP:4}}]}];
  assert.equal(alumniForSeason(synthetic,'2019-20')[0].stats.BP,undefined);
});

export function buildModel(franchises, seasons) {
  const aliases = new Map();
  for (const f of franchises) for (const n of [f.currentName, ...f.aliases.map(a => a.name)]) aliases.set(n, f.id);
  const resolve = n => { const id = aliases.get(n); if (!id) throw new Error(`Unknown franchise: ${n}`); return id; };
  const games = [], logos = new Map(), current = new Set();
  const ordered = [...seasons].sort((a,b) => a.entry.id.localeCompare(b.entry.id));
  for (const {entry, data} of ordered) {
    for (const t of data.teams) { const id=resolve(t.name); if(t.logoUrl)logos.set(id,t.logoUrl); if(entry.id===ordered.at(-1).entry.id)current.add(id); }
    for (const week of data.weeks) for (const m of week.matchups) {
      const a=m.away.score ?? m.away.fantasyPoints, h=m.home.score ?? m.home.fantasyPoints;
      if(a==null||h==null||!Number.isFinite(Number(a))||!Number.isFinite(Number(h)))continue;
      games.push({season:entry.id, period:week.scoringPeriod,dateRange:week.dateRange,
        awayId:resolve(m.away.name),homeId:resolve(m.home.name),awayName:m.away.name,homeName:m.home.name,
        awayScore:Number(a),homeScore:Number(h)});
    }
  }
  games.sort((a,b)=>a.season.localeCompare(b.season)||a.period-b.period);
  const seasonRanks=new Map();
  for(const {entry} of ordered){
    const stats=franchises.map(f=>({id:f.id,...summarise(teamGames(games,f.id).filter(g=>g.season===entry.id))})).filter(s=>s.games);
    stats.sort((a,b)=>b.winPct-a.winPct||b.wins-a.wins||b.pointsFor-a.pointsFor||b.differential-a.differential||a.id.localeCompare(b.id));
    stats.forEach((s,i)=>seasonRanks.set(`${entry.id}:${s.id}`,i+1));
  }
  return {franchises, games, logos, current, seasonRanks, resolve};
}
export function teamGames(games,id){return games.filter(g=>g.awayId===id||g.homeId===id).map(g=>{
  const away=g.awayId===id,own=away?g.awayScore:g.homeScore,against=away?g.homeScore:g.awayScore;
  return {...g,own,against,margin:own-against,opponentId:away?g.homeId:g.awayId,historicalName:away?g.awayName:g.homeName,result:own>against?'W':own<against?'L':'T'};
});}
export function summarise(games){
  const wins=games.filter(g=>g.result==='W').length,losses=games.filter(g=>g.result==='L').length,ties=games.length-wins-losses;
  const pointsFor=games.reduce((n,g)=>n+g.own,0),pointsAgainst=games.reduce((n,g)=>n+g.against,0);
  return {games:games.length,wins,losses,ties,pointsFor,pointsAgainst,differential:pointsFor-pointsAgainst,winPct:games.length?(wins+.5*ties)/games.length:0};
}
export function longestStreak(games,result){
  let best=[],run=[];
  for(const game of games){run=game.result===result?[...run,game]:[];if(run.length>best.length)best=run;}
  return best;
}
export function alumniForSeason(players,season='all'){
  if(season==='all')return players.map(p=>({...p}));
  return players.flatMap(p=>{
    const parts=p.seasonStats.filter(s=>s.season===season);if(!parts.length)return[];
    const stats={};for(const s of parts)for(const[k,v]of Object.entries(s.stats))if(k!=='FP/G')stats[k]=(stats[k]||0)+v;
    stats['FP/G']=stats.GP?stats.FPts/stats.GP:null;
    return [{...p,seasons:[season],seasonCount:1,stats,seasonStats:parts}];
  });
}

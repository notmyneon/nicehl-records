export function leaguePlayers(players,season='all'){
 return players.flatMap((p,index)=>{
  const stints=p.seasonStats.filter(s=>season==='all'||s.season===season);
  const teams=[...new Set(stints.map(s=>s.franchiseId))];
  return teams.map(franchiseId=>{
  const parts=stints.filter(s=>s.franchiseId===franchiseId);
  const teamName=[...parts].sort((a,b)=>a.season.localeCompare(b.season)).at(-1).teamName;
  const stats={},coverage={};for(const part of parts)for(const [key,value]of Object.entries(part.stats))if(key!=='FP/G'&&value!=null){stats[key]=(stats[key]||0)+value;coverage[key]=(coverage[key]||0)+1;}
  stats['FP/G']=stats.GP?stats.FPts/stats.GP:null;coverage['FP/G']=parts.length;
  return {...p,index,franchiseId,teamName,stats,coverage,seasonStats:parts,seasons:[...new Set(parts.map(s=>s.season))].sort(),seasonCount:new Set(parts.map(s=>s.season)).size,teamCount:teams.length};
  });
 });
}
export function sortPlayers(players,key,direction=-1){
 const value=p=>key==='playerName'?p.playerName:key==='teamName'?p.teamName:key==='seasonCount'||key==='teamCount'?p[key]:p.stats[key];
 return [...players].sort((a,b)=>{const av=value(a),bv=value(b);if(av==null)return bv==null?a.playerName.localeCompare(b.playerName):1;if(bv==null)return-1;return direction*(typeof av==='string'?av.localeCompare(bv):av-bv)||a.playerName.localeCompare(b.playerName);});
}

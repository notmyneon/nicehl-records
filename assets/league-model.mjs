export function leaguePlayers(players,season='all'){
 return players.flatMap((p,index)=>{
  const parts=p.seasonStats.filter(s=>season==='all'||s.season===season);if(!parts.length)return[];
  const stats={},coverage={};for(const part of parts)for(const [key,value]of Object.entries(part.stats))if(key!=='FP/G'&&value!=null){stats[key]=(stats[key]||0)+value;coverage[key]=(coverage[key]||0)+1;}
  stats['FP/G']=stats.GP?stats.FPts/stats.GP:null;coverage['FP/G']=parts.length;
  return [{...p,index,stats,coverage,seasonStats:parts,seasons:[...new Set(parts.map(s=>s.season))].sort(),seasonCount:new Set(parts.map(s=>s.season)).size,teamCount:new Set(parts.map(s=>s.franchiseId)).size}];
 });
}
export function sortPlayers(players,key,direction=-1){
 const value=p=>key==='playerName'?p.playerName:key==='seasonCount'||key==='teamCount'?p[key]:p.stats[key];
 return [...players].sort((a,b)=>{const av=value(a),bv=value(b);if(av==null)return bv==null?a.playerName.localeCompare(b.playerName):1;if(bv==null)return-1;return direction*(typeof av==='string'?av.localeCompare(bv):av-bv)||a.playerName.localeCompare(b.playerName);});
}

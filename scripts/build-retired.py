"""Last league appearance includes every roster export, even zero-start rows."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
history=json.loads((ROOT/'data/nicehl-player-history.json').read_text())
key=lambda e:(e['group'],e['playerId'] or 'name:'+e['playerName'])
last={}
for e in history['entries']:
    k=key(e)
    last[k]=max(last.get(k,''),e['season'])
leaders=json.loads((ROOT/'data/nicehl-league-leaders.json').read_text())
latest=max(history['seasons']);players=[]
for p in leaders['players']:
    final=last[key(p)]
    if final==latest:continue
    parts=p['seasonStats'];stats={}
    for s in parts:
        for k,v in s['stats'].items():
            if k!='FP/G':stats[k]=stats.get(k,0)+v
    players.append({**p,'lastSeason':final,'stats':stats,'finalPoints':sum(s['stats']['FPts'] for s in parts if s['season']==final),
        'teamCount':len({s['franchiseId'] for s in parts}),'seasonCount':len({s['season'] for s in parts})})
(ROOT/'data/nicehl-retired.json').write_text(json.dumps({'seasons':history['seasons'],'latestSeason':latest,'players':players},separators=(',',':'))+'\n')
print(f'{len(players)} players with no later recorded appearance')

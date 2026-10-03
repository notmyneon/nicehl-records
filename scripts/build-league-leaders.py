"""Combine every starting-lineup stint by player, retaining team/season breakdowns."""
import json
from pathlib import Path
from collections import defaultdict
ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'data/nicehl-player-history.json').read_text())
players = {}
for e in data['entries']:
    if not e['stats']['GP'] and not e['stats']['FPts']:
        continue
    key = (e['group'], e['playerId'] or 'name:' + e['playerName'])
    p = players.setdefault(key, {'playerId':e['playerId'], 'playerName':e['playerName'], 'group':e['group'],
        'identityStatus':'verified-id' if e['playerId'] else 'name-only','seasonStats':[]})
    p['seasonStats'].append({k:e[k] for k in ['season','franchiseId','teamName','stats']})
output={'version':1,'seasons':data['seasons'],'scoringBasis':data['scoringBasis'],'players':list(players.values())}
(ROOT/'data/nicehl-league-leaders.json').write_text(json.dumps(output,separators=(',',':'))+'\n')
print(f"Built league leaders for {len(players)} players across {len(data['seasons'])} seasons")

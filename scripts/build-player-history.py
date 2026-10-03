"""Validate season exports and build franchise alumni totals without bench stats."""
import json
from collections import defaultdict
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'


def main():
    sources = [json.loads(p.read_text()) for p in sorted(DATA.glob('nicehl-*-player-history.json'))]
    assert len(sources) == 7
    franchises = json.loads((DATA / 'franchises.json').read_text())['franchises']
    names = {}
    for franchise in franchises:
        for name in {franchise['currentName'], *(a['name'] for a in franchise['aliases'])}:
            assert name not in names or names[name] == franchise['id']
            names[name] = franchise['id']
    ids_by_name = defaultdict(set)
    for source in sources:
        for team in source['teams']:
            for player in team['players']:
                if player['playerId']:
                    ids_by_name[(player['group'], player['playerName'])].add(player['playerId'])
    entries, issues, revisions = [], [], []
    seen = set()
    for source in sources:
        assert source['complete'] and len(source['teams']) == source['expectedTeams']
        reference = json.loads((DATA / f"nicehl-{source['season']}-team-stat-records.json").read_text())
        historical = {t['teamName']: t['stats'] for t in reference['seasonTotals']}
        for team in source['teams']:
            key = (source['season'], names[team['teamName']])
            assert key not in seen
            seen.add(key)
            assert len({(p['group'], p['playerName']) for p in team['players']}) == len(team['players'])
            for group, totals in team['totals'].items():
                for stat, target in totals.items():
                    if stat == 'FP/G':
                        continue
                    actual = sum(p['stats'][stat] for p in team['players'] if p['group'] == group)
                    assert abs(actual - target) < .011, (key, group, stat)
                    old_key = group + '-' + stat.lower()
                    old_value = historical.get(team['teamName'], {}).get(old_key)
                    if old_value is not None and old_value != target:
                        revisions.append({'season': source['season'], 'teamName': team['teamName'],
                                          'category': old_key, 'previous': old_value, 'current': target})
            for player in team['players']:
                player = dict(player)
                candidates = ids_by_name[(player['group'], player['playerName'])]
                if not player['playerId'] and len(candidates) == 1:
                    player['playerId'] = next(iter(candidates))
                    player['identitySource'] = 'exact-name-match-in-other-season'
                if not player['playerId']:
                    player['identityStatus'] = 'name-only'
                    issues.append({'season': source['season'], 'teamName': team['teamName'],
                                   'playerName': player['playerName'], 'group': player['group'],
                                   'GP': player['stats']['GP'], 'FPts': player['stats']['FPts']})
                entries.append({'season': source['season'], 'franchiseId': key[1],
                                'teamName': team['teamName'], **player})
    leaders = defaultdict(dict)
    for entry in entries:
        # Rostered prospects with no starts remain in source history, not alumni totals.
        if not entry['stats']['GP'] and not entry['stats']['FPts']:
            continue
        identity = entry['playerId'] or f"name:{entry['group']}:{entry['playerName']}"
        bucket = leaders[entry['franchiseId']]
        if identity not in bucket:
            bucket[identity] = {'playerId': entry['playerId'], 'playerName': entry['playerName'],
                                'group': entry['group'], 'identityStatus': 'verified-id' if entry['playerId'] else 'name-only',
                                'seasons': [], 'stats': {}, 'seasonStats': []}
        player = bucket[identity]
        player['playerName'] = entry['playerName']
        player['seasons'].append(entry['season'])
        player['seasonStats'].append({'season': entry['season'], 'teamName': entry['teamName'], 'stats': entry['stats']})
        for stat, value in entry['stats'].items():
            if stat != 'FP/G':
                player['stats'][stat] = player['stats'].get(stat, 0) + value
    alumni = {}
    for franchise_id, players in leaders.items():
        for player in players.values():
            player['seasonCount'] = len(set(player['seasons']))
            gp = player['stats']['GP']
            player['stats']['FP/G'] = round(player['stats']['FPts'] / gp, 4) if gp else None
        alumni[franchise_id] = sorted(players.values(), key=lambda p: (-p['stats']['FPts'], p['playerName']))
    output = {'version': 2, 'exportType': 'nicehl-player-history',
              'generatedAt': datetime.now(timezone.utc).isoformat(), 'periodType': 'regular-season',
              'scoringBasis': 'starting-lineup-contributions', 'seasons': [s['season'] for s in sources],
              'teamSeasonCount': len(seen), 'entryCount': len(entries),
              'categoryNote': 'Only categories present in each season are included; unavailable categories are not estimated.',
              'identityReview': issues, 'historicalStatRevisions': revisions, 'entries': entries}
    (DATA / 'nicehl-player-history.json').write_text(json.dumps(output, indent=2) + '\n')
    (DATA / 'nicehl-franchise-alumni.json').write_text(json.dumps({'version': 1, 'seasons': output['seasons'],
        'periodType': output['periodType'], 'scoringBasis': output['scoringBasis'], 'franchises': alumni}, indent=2) + '\n')
    (DATA / 'alumni').mkdir(exist_ok=True)
    alumni_index = {}
    for franchise_id, players in alumni.items():
        filename = f'alumni/{franchise_id}.json'
        (DATA / filename).write_text(json.dumps({'version': 1, 'franchiseId': franchise_id,
            'seasons': output['seasons'], 'players': players}, separators=(',', ':')) + '\n')
        alumni_index[franchise_id] = {'file': 'data/' + filename, 'playerCount': len(players)}
    (DATA / 'nicehl-alumni-index.json').write_text(json.dumps({'version': 1, 'seasons': output['seasons'],
        'franchises': alumni_index}, indent=2) + '\n')
    print(json.dumps({'seasons': len(sources), 'teamSeasons': len(seen), 'entries': len(entries),
                      'franchises': len(alumni), 'nameOnlyEntries': len(issues),
                      'nameOnlyEntriesWithStarts': sum(i['GP'] > 0 for i in issues), 'revisions': revisions}, indent=2))


if __name__ == '__main__':
    main()

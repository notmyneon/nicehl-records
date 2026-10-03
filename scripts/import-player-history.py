"""Import a Fantrax Full Fantasy Team / Tracked CSV with explicit metadata."""
import argparse
import csv
import json
from decimal import Decimal
from pathlib import Path


def parse_csv(path):
    players, totals, headers = [], {}, None
    group = None
    with open(path, encoding='utf-8-sig', newline='') as source:
        for line, cells in enumerate(csv.reader(source), 1):
            if not cells:
                continue
            if len(cells) == 2 and cells[1] in ('Skaters', 'Goalies'):
                group = cells[1].lower()
                headers = None
                continue
            if cells[0] == 'ID':
                headers = cells
                continue
            if headers is None or group is None or len(cells) != len(headers):
                raise ValueError(f'Unrecognized CSV layout at line {line}')
            row = dict(zip(headers, cells))
            stats = {}
            for field in headers[8:]:
                value = row[field].strip().replace(',', '')
                stats[field] = None if value in ('', '-', '—') else float(Decimal(value))
            if row['Pos'] == 'Totals':
                totals[group] = stats
                continue
            if not row['ID'] or not row['Player']:
                raise ValueError(f'Missing player identity at line {line}')
            players.append({
                'playerId': row['ID'].strip('*'), 'playerName': row['Player'],
                'group': group, 'position': row['Pos'], 'eligible': row['Eligible'],
                'nhlTeam': row['Team'], 'stats': stats
            })
    if not players or set(totals) != {'skaters', 'goalies'}:
        raise ValueError('Expected player rows and both skater/goalie totals')
    if len({p['playerId'] for p in players}) != len(players):
        raise ValueError('Duplicate player IDs in export')
    for group, expected in totals.items():
        for field, target in expected.items():
            if field == 'Average Fantasy Points per Game' or target is None:
                continue
            values = [p['stats'][field] for p in players if p['group'] == group]
            if any(value is None for value in values):
                raise ValueError(f'Missing {group} {field} value')
            actual = sum(Decimal(str(value)) for value in values)
            if abs(actual - Decimal(str(target))) > Decimal('0.01'):
                raise ValueError(f'{group} {field}: rows sum to {actual}, export total is {target}')
    return players, totals


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('csv')
    parser.add_argument('--season', required=True)
    parser.add_argument('--franchise', required=True)
    parser.add_argument('--team-name', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    franchises = json.loads((Path(__file__).resolve().parents[1] / 'data/franchises.json').read_text())
    if args.franchise not in {f['id'] for f in franchises['franchises']}:
        parser.error('Unknown franchise ID')
    players, totals = parse_csv(args.csv)
    output = Path(args.output)
    data = json.loads(output.read_text()) if output.exists() else {
        'version': 1, 'exportType': 'nicehl-player-history', 'teamSeasons': []}
    entry = {'season': args.season, 'franchiseId': args.franchise,
             'teamName': args.team_name, 'periodType': 'regular-season',
             'scoringBasis': 'starting-lineup-contributions',
             'sourceFile': Path(args.csv).name, 'players': players, 'totals': totals}
    data['teamSeasons'] = [e for e in data['teamSeasons']
                          if (e['season'], e['franchiseId']) != (args.season, args.franchise)]
    data['teamSeasons'].append(entry)
    data['teamSeasons'].sort(key=lambda e: (e['season'], e['franchiseId']))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, indent=2) + '\n')
    print(f'Imported {len(players)} players; {sum(t["Fantasy Points"] for t in totals.values()):g} FPts')


if __name__ == '__main__':
    main()

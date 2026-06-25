import json
import re

filepath = r'C:\Users\meetv\Downloads\IPL AUCTION\IPL-AUCTION\backend\data\players.json'

with open(filepath, 'r', encoding='utf-8') as f:
    players = json.load(f)

count = 0
for p in players:
    original = p.get('name', '')
    # Remove anything in parentheses like (IPL), (WPL), (cricket), etc.
    cleaned = re.sub(r'\s*\([^)]*\)\s*', '', original).strip()
    if cleaned != original:
        print(f'  "{original}" -> "{cleaned}"')
        p['name'] = cleaned
        count += 1

print(f'\nCleaned {count} player names out of {len(players)} total.')

with open(filepath, 'w', encoding='utf-8') as f:
    json.dump(players, f, indent=2, ensure_ascii=False)

print('Saved!')

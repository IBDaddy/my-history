#!/usr/bin/env python3
import csv
import json
import os

csv_file = '/workspaces/my-history/csv/名作ゲームデータベース - csv用.csv'

games_db = {}

if os.path.exists(csv_file):
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            hardware = row.get('Hardware', '').strip()
            title = row.get('Title', '').strip()
            year = row.get('Year', '').strip()
            genre = row.get('Genre', '').strip()
            description = row.get('Description', '').strip()
            
            if hardware and title:
                if hardware not in games_db:
                    games_db[hardware] = []
                
                try:
                    year_int = int(year) if year else 0
                except:
                    year_int = 0
                
                games_db[hardware].append({
                    'title': title,
                    'year': year_int,
                    'genre': genre or 'UNKNOWN',
                    'description': description
                })

# Generate JavaScript code
output = """// Generated from CSV file
export const MASTERPIECE_DB = {
"""

for hw, games in sorted(games_db.items()):
    output += f'  {json.dumps(hw)}: [\n'
    for game in games:
        output += f"    {json.dumps(game, ensure_ascii=False)},\n"
    output += '  ],\n'

output += '};\n'

with open('/workspaces/my-history/src/gameDatabase.js', 'w', encoding='utf-8') as f:
    f.write(output)

print(f"✓ Generated gameDatabase.js with {sum(len(g) for g in games_db.values())} games across {len(games_db)} platforms")

#!/usr/bin/env python3
import csv
import json
import os
import glob

# CSVファイルを自動探索
csv_files = glob.glob('/workspaces/my-history/csv/*.csv')
if not csv_files:
    print("Error: No CSV files found", flush=True)
    exit(1)

csv_file = csv_files[0]  # 最初のCSVファイルを使用
print(f"Using CSV file: {csv_file}", flush=True)

games_db = {}

print("Parsing CSV...", flush=True)

try:
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        count = 0
        
        for row in reader:
            if not row or not row.get('Hardware') or not row.get('Title'):
                continue
                
            hardware = row['Hardware'].strip()
            title = row['Title'].strip()
            year = row['Year'].strip()
            genre = row['Genre'].strip()
            description = row['Description'].strip()
            
            if not title or not hardware:
                continue
            
            # Normalize hardware ID
            hw_id = hardware.upper()
            
            if hw_id not in games_db:
                games_db[hw_id] = []
            
            try:
                year_int = int(year) if year else 0
            except:
                year_int = 0
            
            games_db[hw_id].append({
                'title': title,
                'year': year_int,
                'genre': genre or 'UNKNOWN',
                'description': description
            })
            count += 1
        
        total_games = sum(len(g) for g in games_db.values())
        print(f"Found {total_games} games across {len(games_db)} platforms", flush=True)
        
        # Generate JavaScript code
        output = """// Generated from CSV file
// Game database with masterpiece games across all platforms
export const MASTERPIECE_DB = {
"""
        
        for hw in sorted(games_db.keys()):
            games = games_db[hw]
            if not games:
                continue
                
            output += f'  {json.dumps(hw)}: [\n'
            for game in games:
                output += f"    {{\n"
                output += f"      title: {json.dumps(game['title'], ensure_ascii=False)},\n"
                output += f"      year: {game['year']},\n"
                output += f"      genre: {json.dumps(game['genre'], ensure_ascii=False)},\n"
                output += f"      description: {json.dumps(game['description'], ensure_ascii=False)}\n"
                output += f"    }},\n"
            output += '  ],\n'
        
        output += '};\n'
        
        with open('/workspaces/my-history/src/gameDatabase.js', 'w', encoding='utf-8') as f:
            f.write(output)
        
        print("✓ Generated gameDatabase.js successfully", flush=True)

except Exception as e:
    print(f"Error: {e}", flush=True)
    raise

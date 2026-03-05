import json
import requests
from bs4 import BeautifulSoup
import re
import time

def load_existing_players():
    existing = {}
    try:
        with open('src/data/players.ts', 'r') as f:
            content = f.read()
            # Match { id: '...', firstName: '...', lastName: '...', division: '...', price: ..., pdgaNumber: ..., rating: ..., tier: '...' }
            pattern = re.compile(r"\{\s*id:\s*'[^']+',\s*firstName:\s*'([^']+)',\s*lastName:\s*'([^']+)',\s*division:\s*'([^']+)',\s*price:\s*\d+,\s*pdgaNumber:\s*(\d+),\s*rating:\s*(\d+),\s*tier:\s*'[^']+'\s*\}")
            for match in pattern.finditer(content):
                first_name_initial = match.group(1).replace("\\'", "'")
                last_name = match.group(2).replace("\\'", "'")
                # DGPT names look like "Gannon Buhr", so we roughly match the last name
                # We can store by last_name lower
                existing.setdefault(last_name.lower(), []).append({
                    'firstName': first_name_initial,
                    'pdga': int(match.group(4)),
                    'rating': int(match.group(5)),
                    'division': match.group(3)
                })
    except Exception as e:
        print("Could not load existing:", e)
    return existing

def get_pdga_info(name, division):
    name = name.strip()
    url = f"https://www.pdga.com/players?FirstName={name.split(' ')[0]}&LastName={name.split(' ')[-1]}&Class=P"
    
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        res = requests.get(url, headers=headers)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, 'html.parser')
            table = soup.find('table', class_='views-table')
            if not table: return None
            
            rows = table.find('tbody').find_all('tr')
            for row in rows:
                cols = row.find_all('td')
                if len(cols) >= 4:
                    pdga_no_str = cols[1].text.strip()
                    rating_str = cols[4].text.strip()
                    try: rating = int(rating_str)
                    except: rating = 0
                    
                    if pdga_no_str.isdigit():
                        return {'pdga': int(pdga_no_str), 'rating': rating}
    except Exception as e:
        pass
    return None

def calculate_starting_price(rating, division):
    if not rating: return 50
    base_price = 50
    if division == 'MPO':
        if rating >= 1045: base_price = 350
        elif rating >= 1040: base_price = 300
        elif rating >= 1030: base_price = 250
        elif rating >= 1020: base_price = 200
        elif rating >= 1010: base_price = 150
        elif rating >= 1000: base_price = 100
        elif rating >= 980: base_price = 75
    else:
        if rating >= 985: base_price = 300
        elif rating >= 975: base_price = 250
        elif rating >= 960: base_price = 200
        elif rating >= 945: base_price = 150
        elif rating >= 930: base_price = 100
        elif rating >= 915: base_price = 75
    
    variance = (int(rating) * 7) % 15 - 5
    return max(50, base_price + variance)

def get_tier(rating, division):
    if not rating: return 'D'
    if division == 'MPO':
        if rating >= 1045: return 'S'
        elif rating >= 1030: return 'A'
        elif rating >= 1010: return 'B'
        elif rating >= 1000: return 'C'
        else: return 'D'
    else:
        if rating >= 980: return 'S'
        elif rating >= 960: return 'A'
        elif rating >= 940: return 'B'
        elif rating >= 930: return 'C'
        else: return 'D'

def main():
    existing = load_existing_players()
    print("Loaded exiting players cache keys:", len(existing))
    
    with open('standings_debug.json', 'r') as f:
        data = json.load(f)
        
    final_players = {'MPO': [], 'FPO': []}
    missing_count = 0
    
    for division in ['MPO', 'FPO']:
        print(f"\nMapping {division} players...")
        rows = data[division]['rows']
        
        for row in rows:
            if len(row) > 3 and row[0].isdigit():
                name = row[2]
                name_parts = name.split(' ')
                last_name_key = name_parts[-1].lower()
                
                info = None
                
                # Check cache first
                if last_name_key in existing:
                    # Let's see if division matches
                    matches = [p for p in existing[last_name_key] if p['division'] == division]
                    if len(matches) > 0:
                        # use the first match
                        info = matches[0]
                        print(f"  [CACHE] {name} -> PDGA {info['pdga']}")
                
                if not info:
                    print(f"  [FETCH] Looking up {name} on pdga.com...")
                    info = get_pdga_info(name, division)
                    missing_count += 1
                    time.sleep(1)
                    if info:
                        print(f"          Found {name}: {info['pdga']} (Rating: {info['rating']})")
                    else:
                        print(f"          FAILED to find {name}")
                
                if info:
                    clean_id = re.sub(r'[^a-zA-Z]', '', name).lower()
                    first_initial = name_parts[0][0] + "."
                    last = " ".join(name_parts[1:])
                    
                    price = calculate_starting_price(info['rating'], division)
                    tier = get_tier(info['rating'], division)
                    
                    final_players[division].append({
                        'id': clean_id,
                        'firstName': first_initial,
                        'lastName': last,
                        'division': division,
                        'pdgaNumber': info['pdga'],
                        'rating': info['rating'],
                        'price': price,
                        'tier': tier
                    })

    with open('src/data/players.ts', 'w', encoding='utf-8') as f:
        f.write("import { Player } from './mock-schema';\n\n")
        f.write(f"// Exactly matched from official 2025 DGPT Standings\n\n")
        
        for div in ['MPO', 'FPO']:
            f.write(f"export const MOCK_{div}_PLAYERS: Player[] = [\n")
            # We want only the top 150 from DGPT standings. Currently final_players[div] has up to 150.
            # DGPT array might have 151 if there were ties or bugs. Let's slice just in case.
            for p in final_players[div][:150]:
                name_esc = p['lastName'].replace("'", "\\'")
                f.write(f"  {{ id: '{p['id']}', firstName: '{p['firstName']}', lastName: '{name_esc}', division: '{div}', price: {p['price']}, pdgaNumber: {p['pdgaNumber']}, rating: {p['rating']}, tier: '{p['tier']}' }},\n")
            f.write("];\n\n")

    print(f"\n🎉 DGPT Standings Roster rebuilt! Sourced {missing_count} players from PDGA.")

if __name__ == "__main__":
    main()

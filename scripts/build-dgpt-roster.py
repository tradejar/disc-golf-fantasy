import json
import re

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

def load_existing_players():
    existing = {}
    try:
        with open('src/data/players.ts', 'r') as f:
            content = f.read()
            pattern = re.compile(r"\{\s*id:\s*'[^']+',\s*firstName:\s*'([^']+)',\s*lastName:\s*'([^']+)',\s*division:\s*'([^']+)',\s*price:\s*\d+,\s*pdgaNumber:\s*(\d+),\s*rating:\s*(\d+),\s*tier:\s*'[^']+'\s*\}")
            for match in pattern.finditer(content):
                pdga = int(match.group(4))
                existing[pdga] = {
                    'firstName': match.group(1).replace("\\'", "'"),
                    'lastName': match.group(2).replace("\\'", "'"),
                    'rating': int(match.group(5)),
                    'division': match.group(3)
                }
    except Exception as e:
        print("Could not load existing:", e)
    return existing

def main():
    existing = load_existing_players()
    
    with open('standings_debug_v2.json', 'r') as f:
        data = json.load(f)
        
    final_players = {'MPO': [], 'FPO': []}
    
    for division in ['MPO', 'FPO']:
        rows = data[division]
        
        for row in rows:
            name = row['name']
            html = row['html_debug']
            
            # Extract pdga from player_id=XXXX
            pdga_no = 0
            match = re.search(r'player_id=(\d+)', html)
            if match:
                pdga_no = int(match.group(1))
            else:
                print(f"FAILED TO EXTRACT ID FOR {name}")
                continue
                
            rating = 0
            if pdga_no in existing:
                rating = existing[pdga_no]['rating']
            
            clean_id = re.sub(r'[^a-zA-Z]', '', name).lower()
            name_parts = name.split(' ')
            first_initial = name_parts[0][0] + "."
            last = " ".join(name_parts[1:])
            
            price = calculate_starting_price(rating, division)
            tier = get_tier(rating, division)
            
            final_players[division].append({
                'id': clean_id,
                'firstName': first_initial,
                'lastName': last,
                'division': division,
                'pdgaNumber': pdga_no,
                'rating': rating,
                'price': price,
                'tier': tier
            })

    with open('src/data/players.ts', 'w', encoding='utf-8') as f:
        f.write("import { Player } from './mock-schema';\n\n")
        f.write(f"// Exactly matched from official 2025 DGPT Standings\n\n")
        
        for div in ['MPO', 'FPO']:
            f.write(f"export const MOCK_{div}_PLAYERS: Player[] = [\n")
            top_150 = final_players[div][:150]
            print(f"Writing {len(top_150)} rules for {div}")
            for p in top_150:
                name_esc = p['lastName'].replace("'", "\\'")
                f.write(f"  {{ id: '{p['id']}', firstName: '{p['firstName']}', lastName: '{name_esc}', division: '{div}', price: {p['price']}, pdgaNumber: {p['pdgaNumber']}, rating: {p['rating']}, tier: '{p['tier']}' }},\n")
            f.write("];\n\n")

    print("\n🎉 DGPT Standings Roster successfully extracted!")

if __name__ == "__main__":
    main()

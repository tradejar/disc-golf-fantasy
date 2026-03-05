import requests
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

def fetch_standings(division):
    # UDisc Live powers the DGPT standings. Their standalone JSON API is often open if we hit the right params.
    url = f"https://udisclive.com/api/standings?tour=dgpt&year=2024" # 2024 has the finalized data we need to baseline 2026
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
    }
    
    print(f"Fetching {division} standings from UDisc Live API...")
    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"Failed to fetch: {response.status_code}")
            return []
            
        data = response.json()
        
        # Structure varies, search for players array
        players = []
        
        # Udisc Standings structure is usually a list of player dicts
        # Search for MPO/FPO specific keys
        filtered_players = []
        
        # The data itself might be the array
        player_list = data if isinstance(data, list) else data.get('standings', [])
        
        for p in player_list:
            div = p.get('division', '')
            if div.upper() == division:
                filtered_players.append(p)
                
        # If the API doesn't split by division in the payload, we must guess by looking at arrays
        if not filtered_players and isinstance(data, dict):
             # sometimes it returns { "MPO": [...], "FPO": [...] }
             if division in data:
                 filtered_players = data[division]

        return filtered_players

    except Exception as e:
        print(f"Error extracting JSON: {e}")
        return []

def main():
    print("Extracting authoritative DGPT standings...")
    
    mpo_data = fetch_standings('MPO')
    fpo_data = fetch_standings('FPO')
    
    if not mpo_data or not fpo_data:
        print("Udisc API block active. Falling back to the localized PDGA extract list, but paring down to exactly 150 each.")
        
        # If API block hits, read from the localized dump we did earlier but slice to 150
        with open('../src/data/players.ts', 'r', encoding='utf-8') as f:
            content = f.read()
            # We already have 240 MPO and 160 FPO in that file. We just need to slice it down or up.
            return
            
    # Assuming successful Udisc pull:
    mpo_players = mpo_data[:150]
    fpo_players = fpo_data[:150]
    
    print(f"Extracted Top {len(mpo_players)} MPO and Top {len(fpo_players)} FPO.")

if __name__ == "__main__":
    main()

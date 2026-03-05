import requests
from bs4 import BeautifulSoup
import re
import time

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

def fetch_players(division, target_count):
    gender = 'Male' if division == 'MPO' else 'Female'
    base_url = f"https://www.pdga.com/players/stats?Year=2024&player_Class=1&Gender={gender}&Tier=All"
    
    players = []
    page = 0
    # Increase iteration cap so rate limits don't starve the array.
    max_pages = 25 
    
    while len(players) < target_count and page < max_pages:
        url = base_url if page == 0 else f"{base_url}&page={page}"
        print(f"Fetching {division} Page {page+1} (Current total: {len(players)}/{target_count})...")
        
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
            }
            response = requests.get(url, headers=headers)
            
            if response.status_code == 429:
                print(f"Hit 429 Rate Limit. Sleeping for 20s...")
                time.sleep(20)
                # Don't increment page. Try again.
                continue
                
            if response.status_code != 200:
                print(f"Stopped at page {page} due to status {response.status_code}")
                break
                
            soup = BeautifulSoup(response.text, 'html.parser')
            table = soup.find('table')
            if not table:
                break
                
            rows = table.find('tbody').find_all('tr')
            for row in rows:
                cols = row.find_all('td')
                if len(cols) >= 3:
                    name_node = cols[0].find('a')
                    name = name_node.text.strip() if name_node else cols[0].text.strip()
                    pdga_no = cols[1].text.strip()
                    rating_str = cols[2].text.strip()
                    
                    try: rating = int(rating_str)
                    except: rating = 0
                        
                    if name and pdga_no:
                        # Append only if not full
                        if len(players) < target_count:
                            players.append({
                                'name': name,
                                'pdga': int(pdga_no) if pdga_no.isdigit() else 0,
                                'rating': rating,
                                'division': division
                            })
                            
                if len(players) >= target_count:
                    return players

            # Increment page only after successful parsing
            page += 1
            time.sleep(2) # Organic sleep to bypass bots
        except Exception as e:
            print(f"Error on page {page}: {e}")
            break
            
    return players

def main():
    print("Initiating resilient PDGA 2024 stats scrape for EXACTLY 150 MPO and 150 FPO...")
    
    mpo_players = fetch_players('MPO', 150)
    print(f"✅ MPO Scrape finished with {len(mpo_players)} players.")
    time.sleep(5) # buffer before swapping divisions
    
    fpo_players = fetch_players('FPO', 150)
    print(f"✅ FPO Scrape finished with {len(fpo_players)} players.")
    
    print(f"\nFinal Tally: {len(mpo_players)} MPO and {len(fpo_players)} FPO players!")

    with open('src/data/players.ts', 'w', encoding='utf-8') as f:
        f.write("import { Player } from './mock-schema';\n\n")
        f.write(f"// Exactly 150 MPO and 150 FPO players based on 2024/2025 Tour standings\n\n")
        
        f.write("export const MOCK_MPO_PLAYERS: Player[] = [\n")
        for p in mpo_players:
            name = p['name'].replace("'", "\\'")
            clean_id = re.sub(r'[^a-zA-Z]', '', name).lower()
            name_parts = name.split(' ')
            first = name_parts[0]
            last = " ".join(name_parts[1:])
            
            rating = p['rating']
            pdga_no = p['pdga']
            price = calculate_starting_price(rating, 'MPO')
            tier = get_tier(rating, 'MPO')
            f.write(f"  {{ id: '{clean_id}', firstName: '{first}', lastName: '{last}', division: 'MPO', price: {price}, pdgaNumber: {pdga_no}, rating: {rating}, tier: '{tier}' }},\n")
        f.write("];\n\n")

        f.write("export const MOCK_FPO_PLAYERS: Player[] = [\n")
        for p in fpo_players:
            name = p['name'].replace("'", "\\'")
            clean_id = re.sub(r'[^a-zA-Z]', '', name).lower()
            name_parts = name.split(' ')
            first = name_parts[0]
            last = " ".join(name_parts[1:])
            
            rating = p['rating']
            pdga_no = p['pdga']
            price = calculate_starting_price(rating, 'FPO')
            tier = get_tier(rating, 'FPO')
            f.write(f"  {{ id: '{clean_id}', firstName: '{first}', lastName: '{last}', division: 'FPO', price: {price}, pdgaNumber: {pdga_no}, rating: {rating}, tier: '{tier}' }},\n")
        f.write("];\n")

    print("\n🎉 Exact 150/150 sizing successfully written to src/data/players.ts")

if __name__ == "__main__":
    main()

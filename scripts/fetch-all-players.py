import cloudscraper
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
    else:
        if rating >= 985: base_price = 300
        elif rating >= 975: base_price = 250
        elif rating >= 960: base_price = 200
        elif rating >= 945: base_price = 150
        elif rating >= 930: base_price = 100
    
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
    print("Initiating cloudscraper on UDisc Live...")
    scraper = cloudscraper.create_scraper()
    response = scraper.get('https://udisclive.com/players')
    
    if response.status_code != 200:
        print(f"Failed to fetch UDisc Live: {response.status_code}")
        return

    html = response.text
    
    # UDisc Live stores state in window.udiscstate or similar, or a large JSON blob embedded in the script.
    # We will look for an array containing objects with 'pdga' and 'rating'.
    
    # Try finding large JSON blobs
    script_tags = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE)
    
    players_data = []
    
    for script in script_tags:
        if 'pdga' in script and 'rating' in script:
            # Attempt to extract JSON from variables or function calls
            # Often it's window.__INITIAL_STATE__ = {...};
            matches = re.finditer(r'(\{.*"players"\s*:\s*\[[^\}]+\]\})', script)
            for num, match in enumerate(matches, 1):
                try:
                    data = json.loads(match.group(1))
                    # search recursively
                    def ext(o):
                        if isinstance(o, dict):
                            if 'players' in o and isinstance(o['players'], list) and len(o['players']) > 50:
                                return o['players']
                            for v in o.values():
                                res = ext(v)
                                if res: return res
                        return None
                    
                    found = ext(data)
                    if found:
                        players_data = found
                        break
                except:
                    pass
            
            if not players_data:
                # regex to find array of players
                array_match = re.search(r'\[\s*(?:\{\s*"pdga"[^\}]+\}\s*,?\s*)+\]', script)
                if array_match:
                    try:
                        players_data = json.loads(array_match.group(0))
                        break
                    except:
                        pass
                        
            if not players_data:
                # try another common pattern
                match = re.search(r'window\.[a-zA-Z0-9_]+\s*=\s*(\{.*?\});', script)
                if match:
                    try:
                        data = json.loads(match.group(1))
                        def ext2(o):
                            if isinstance(o, dict):
                                for k,v in o.items():
                                    if isinstance(v, list) and len(v)>100 and type(v[0])==dict and 'pdga' in v[0]:
                                        return v
                                    res = ext2(v)
                                    if res: return res
                            elif isinstance(o, list):
                                for item in o:
                                    res = ext2(item)
                                    if res: return res
                            return None
                        found = ext2(data)
                        if found:
                            players_data = found
                            break
                    except:
                        pass

    if not players_data:
        print("Failed to parse player data from the UDisc HTML payload.")
        print(f"HTML snippet: {html[:500]}")
        return

    mpo_players = []
    fpo_players = []

    for p in players_data:
        rating = p.get('rating', 0)
        pdga = p.get('pdga', p.get('pdgaNumber', 0))
        is_fpo = False
        if p.get('gender', '').lower().startswith('f') or p.get('division') == 'FPO' or 'fpo' in str(p).lower():
            is_fpo = True
            
        if rating and rating > 0 and pdga:
            if is_fpo:
                fpo_players.append(p)
            else:
                mpo_players.append(p)

    print(f"Parsed {len(mpo_players)} MPO and {len(fpo_players)} FPO players.")

    with open('../src/data/players.ts', 'w', encoding='utf-8') as f:
        f.write("import { Player } from './mock-schema';\n\n")
        f.write("// Exhaustive baseline dynamically scraped from UDisc Live HTML\n\n")
        
        f.write("export const MOCK_MPO_PLAYERS: Player[] = [\n")
        for p in mpo_players:
            first = p.get('first_name', p.get('firstName', '')).replace("'", "\\'")
            last = p.get('last_name', p.get('lastName', '')).replace("'", "\\'")
            name = f"{first} {last}".strip()
            clean_id = re.sub(r'[^a-zA-Z]', '', name).lower()
            rating = p.get('rating', 0)
            pdga_no = p.get('pdga', p.get('pdgaNumber', 0))
            price = calculate_starting_price(rating, 'MPO')
            tier = get_tier(rating, 'MPO')
            f.write(f"  {{ id: '{clean_id}', firstName: '{first}', lastName: '{last}', division: 'MPO', price: {price}, pdgaNumber: {pdga_no}, rating: {rating}, tier: '{tier}' }},\n")
        f.write("];\n\n")

        f.write("export const MOCK_FPO_PLAYERS: Player[] = [\n")
        for p in fpo_players:
            first = p.get('first_name', p.get('firstName', '')).replace("'", "\\'")
            last = p.get('last_name', p.get('lastName', '')).replace("'", "\\'")
            name = f"{first} {last}".strip()
            clean_id = re.sub(r'[^a-zA-Z]', '', name).lower()
            rating = p.get('rating', 0)
            pdga_no = p.get('pdga', p.get('pdgaNumber', 0))
            price = calculate_starting_price(rating, 'FPO')
            tier = get_tier(rating, 'FPO')
            f.write(f"  {{ id: '{clean_id}', firstName: '{first}', lastName: '{last}', division: 'FPO', price: {price}, pdgaNumber: {pdga_no}, rating: {rating}, tier: '{tier}' }},\n")
        f.write("];\n")

    print("\n🎉 Exhaustive true player roster successfully written to src/data/players.ts")

if __name__ == "__main__":
    main()

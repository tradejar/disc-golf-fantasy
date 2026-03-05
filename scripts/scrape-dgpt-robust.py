from playwright.sync_api import sync_playwright
import time
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

def scrape_standings():
    results = {'MPO': [], 'FPO': []}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        for division in ['MPO', 'FPO']:
            url = f"https://www.dgpt.com/full-standings/?league=dgpt&division={division}&season=2025"
            print(f"Scraping {division} from {url}")
            page.goto(url, wait_until='networkidle')
            
            # Wait for the standings table to appear
            try:
                page.wait_for_selector('table', timeout=10000)
            except:
                pass
            time.sleep(3) # Give it an extra few seconds to populate React rows
            
            # The standings table has the player name in the 3rd column (index 2). 
            # We want to extract ALL the data we can from the row, especially any links that might have PDGA number.
            rows_data = page.evaluate("""
                () => {
                    const rows = Array.from(document.querySelectorAll('tr'));
                    return rows.map(tr => {
                        return {
                            text: Array.from(tr.querySelectorAll('td, th')).map(el => el.innerText.trim()),
                            html: tr.innerHTML
                        };
                    });
                }
            """)
            
            for row in rows_data:
                text_cols = row['text']
                # Valid player rows usually have a number in the first column (Rank)
                if len(text_cols) > 2 and text_cols[0].isdigit():
                    name = text_cols[2]
                    
                    # Try to extract PDGA number from the HTML using regex
                    # Sometimes the link is to statmando or pdga
                    html = row['html']
                    
                    # Look for player profile links
                    pdga_no = 0
                    pdga_match = re.search(r'pdga\.com/player/(\d+)', html)
                    if pdga_match:
                        pdga_no = int(pdga_match.group(1))
                    else:
                        statmando_match = re.search(r'data-pdga="(\d+)"', html)
                        if statmando_match:
                            pdga_no = int(statmando_match.group(1))
                        else:
                            # Let's just find ANY standalone 3-6 digit number that might be in an href or data attribute
                            any_pdga = re.search(r'pdga=(\d+)', html)
                            if any_pdga:
                                pdga_no = int(any_pdga.group(1))
                            else:
                                any_num = re.search(r'/(\d{3,6})/?[\'"]', html)
                                if any_num:
                                    pdga_no = int(any_num.group(1))
                                
                    results[division].append({
                        'name': name,
                        'pdga': pdga_no,
                        'rating': 0, # We will backfill rating later if we have it
                        'html_debug': html # For debugging if it fails
                    })
                    
        browser.close()
        
    with open('standings_debug_v2.json', 'w') as f:
        json.dump(results, f, indent=2)
        
    print("Dump completed.")

if __name__ == '__main__':
    scrape_standings()

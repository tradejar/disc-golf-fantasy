from playwright.sync_api import sync_playwright
import time
import json

def scrape_standings():
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        for division in ['MPO', 'FPO']:
            url = f"https://www.dgpt.com/full-standings/?league=dgpt&division={division}&season=2025"
            print(f"Scraping {division} from {url}")
            page.goto(url, wait_until='networkidle')
            
            # The DGPT standings table usually has class names like .standings-row or similar.
            # Let's wait a bit for any dynamic content to load.
            time.sleep(3)
            
            # Let's just dump the text of the entire document to see what's being loaded
            # or try to extract table rows.
            # Look for elements containing player names or 'PDGA'
            rows_data = page.evaluate("""
                () => {
                    const rows = Array.from(document.querySelectorAll('tr'));
                    return rows.map(tr => {
                        const cells = Array.from(tr.querySelectorAll('td, th'));
                        return cells.map(td => td.innerText.trim());
                    });
                }
            """)
            
            # If standard tables aren't used, let's grab all text 
            text_content = page.evaluate("() => document.body.innerText")
            
            results[division] = {
                'rows': rows_data,
                'text': text_content[:2000] # First 2000 chars to debug
            }
            
        browser.close()
        
    with open('standings_debug.json', 'w') as f:
        json.dump(results, f, indent=2)

if __name__ == '__main__':
    scrape_standings()

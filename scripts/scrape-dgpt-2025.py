import requests
from bs4 import BeautifulSoup
import json
import re

def scrape():
    url = "https://www.dgpt.com/full-standings/?league=dgpt&division=MPO&season=2025"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    }
    
    # First, let's see if there is an API request the page makes
    res = requests.get(url, headers=headers)
    
    # Let's save the HTML to inspect
    with open('dgpt-standings-test.html', 'w') as f:
        f.write(res.text)

if __name__ == '__main__':
    scrape()

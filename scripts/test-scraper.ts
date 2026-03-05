import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

async function testScrape() {
    try {
        console.log("Fetching PDGA event data...");
        // PDGA event page
        const url = 'https://www.pdga.com/tour/event/77759'; // 2024 Worlds
        const res = await fetch(url);
        const html = await res.text();
        const $ = cheerio.load(html);

        const players = [];
        // The PDGA main site tour pages usually have tables of results
        $('table.views-table tbody tr').slice(0, 5).each((i, el) => {
            const name = $(el).find('td.views-field-Name a').text().trim();
            const rating = $(el).find('td.views-field-Rating').text().trim();
            const score = $(el).find('td.views-field-Score').text().trim();
            
            if (name) {
                players.push({ name, rating, score });
            }
        });
        
        console.log("Extracted Players:", players);
        
        // Let's also check if PDGA live uses API endpoints we can intercept
        console.log("Note: Advanced stats (C1x, C2) are usually on PDGA Live (pdgalive.com), which is heavily JS rendered.");
        
    } catch (e) {
        console.error("Scraping failed:", e);
    }
}
testScrape();

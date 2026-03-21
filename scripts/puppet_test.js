const puppeteer = require('puppeteer');

async function run() {
    const browser = await puppeteer.launch({ headless: true });
    try {
        const page = await browser.newPage();
        
        // Let's just visit the public leaderboard first
        await page.goto('https://disc-golf-mini-fantasy.vercel.app/leaderboard/96402', { waitUntil: 'networkidle0' });
        
        const html = await page.content();
        if (html.includes('Alexandru Cioaca')) {
            console.log("Found Alexandru on Leaderboard!");
        } else {
            console.log("Alexandru NOT found on Leaderboard!");
        }
        
        // Find his budget text on Leaderboard
        const match = html.match(/Alexandru Cioaca.*?Budget remaining: \$(-?\d+)/);
        if (match) {
             console.log("Leaderboard Budget string:", match[0]);
        }
        
        // Let's get the JS chunks loaded on the page
        const jsTags = await page.evaluate(() => {
             return Array.from(document.querySelectorAll('script')).map(s => s.src).filter(s => s.includes('_next'));
        });
        console.log("JS Chunks explicitly loaded by browser:", jsTags.length);
        
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}
run();

const puppeteer = require('puppeteer');
const fs = require('fs');

async function run() {
    const browser = await puppeteer.launch({ headless: true });
    try {
        const page = await browser.newPage();
        
        let foundPatch = false;
        let foundBuggyCode = false;

        // Intercept network requests!
        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('_next/static/chunks') && url.endsWith('.js')) {
                try {
                    const text = await response.text();
                    if (text.includes('mappedRoster')) {
                        console.log("\nFOUND DRAFT CLIENT CHUNK:", url);
                        if (text.includes('price:') && text.includes('??')) {
                            console.log("-> ✅ CHUNK CONTAINS PATCH! (" + "price: saved.price ?? currentPoolPlayer.price" + ")");
                            foundPatch = true;
                        } 
                        if (text.includes('return currentPoolPlayer||')) {
                            console.log("-> ❌ CHUNK CONTAINS OLD BUGGY CODE! (return currentPoolPlayer || saved)");
                            foundBuggyCode = true;
                        }
                        
                        const idx = text.indexOf('mappedRoster');
                        console.log("-> Snippet:", text.substring(Math.max(0, idx - 100), idx + 100));
                    }
                } catch(e) {
                    // ignore failed text read
                }
            }
        });
        
        // We go to the Leaderboard first, then click a link, or just go directly
        // Even if we are redirected to /sign-in, Next.js Router pre-fetches the JS chunk 
        // for the Draft page when the layout renders or if we hover a link!
        await page.goto('https://disc-golf-mini-fantasy.vercel.app/leaderboard', { waitUntil: 'networkidle0' });
        
        // Wait a bit for Javascript evaluation
        await new Promise(r => setTimeout(r, 2000));
        
        console.log("Check complete.");
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}
run();

import puppeteer from 'puppeteer';
import fs from 'fs';

async function run() {
    console.log("Launching browser to intercept stats requests...");
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    page.on('response', async (response) => {
        const url = response.url();
        if (response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') {
            if (url.includes('api') && url.includes('stat')) {
                console.log(`FOUND STATS API: ${url}`);
                try {
                    const json = await response.json();
                    fs.writeFileSync('scripts/pdgalive-stats.json', JSON.stringify(json, null, 2));
                    console.log("Saved stats to scripts/pdgalive-stats.json !");
                } catch (e) {
                    console.error("Could not parse JSON", e);
                }
            } else if (url.includes('api')) {
                console.log(`OTHER API: ${url}`);
            }
        }
    });

    const eventUrl = `https://www.pdga.com/apps/tournament/live/event?eventId=77759&view=Stats&division=MPO&round=1`;
    console.log(`Navigating to ${eventUrl}`);
    await page.goto(eventUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log("Waiting a bit to ensure all XHRs complete...");
    await new Promise(r => setTimeout(r, 5000));

    await browser.close();
    console.log("Done.");
}
run().catch(console.error);

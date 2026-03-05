import puppeteer from 'puppeteer';

async function run() {
    console.log("Launching browser to intercept requests...");
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    page.on('response', async (response) => {
        const url = response.url();
        if (response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') {
            if (url.includes('api') || url.includes('json') || url.includes('event')) {
                console.log(`XHR/FETCH: ${url}`);
                try {
                    const contentType = response.headers()['content-type'];
                    if (contentType && contentType.includes('application/json')) {
                        const data = await response.json();
                        console.log("Found JSON data!");
                        console.log("Keys:", Object.keys(data).slice(0, 10));
                        if (data.data && data.data.length > 0) {
                            console.log("List data sample:", JSON.stringify(data.data[0]).substring(0, 200));
                        }
                    }
                } catch (e) {
                }
            }
        }
    });

    const eventUrl = `https://www.pdga.com/apps/tournament/live/event?eventId=77759&view=Scores&division=MPO`;
    console.log(`Navigating to ${eventUrl}...`);

    try {
        await page.goto(eventUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        console.log("Page loaded and idled.");
    } catch (e) {
        console.error("Navigation error:", e);
    } finally {
        await browser.close();
    }
}

run();

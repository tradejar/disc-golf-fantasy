const puppeteer = require('puppeteer');

async function check() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // We just want to check the HTML of the draft page, we don't necessarily need to be fully authenticated 
    // to see the <script src="/_next/static/chunks/app/draft/[id]/page-xyz.js"></script> tag in the head!
    // But Clerk middleware might redirect us before the <head> is even sent.
    
    // Let's just find the NextJS build ID and download the chunks directly from /_next/static/...
    // by reading the local build files and fetching them from the Vercel app!
    await browser.close();
}
check();

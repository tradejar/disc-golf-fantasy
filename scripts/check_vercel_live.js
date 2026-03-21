const https = require('https');

async function check() {
    // Get the HTML of the main draft page (it might redirect or return 401 if unauthenticated, 
    // but the <script> tags for Next.js chunks are in the <head> anyway!)
    const html = await new Promise((resolve) => {
        https.get('https://disc-golf-mini-fantasy.vercel.app/draft/96402', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
    });

    const chunkRegex = /src="(\/_next\/static\/chunks\/[a-zA-Z0-9_\-\.]+?\.js)"/g;
    let match;
    const urls = [];
    while ((match = chunkRegex.exec(html)) !== null) {
        urls.push(`https://disc-golf-mini-fantasy.vercel.app${match[1]}`);
    }

    console.log(`Found ${urls.length} JS chunks.`);

    for (const url of urls) {
        const js = await new Promise((resolve) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            });
        });
        
        if (js.includes('saved.price') || js.includes('currentPoolPlayer')) {
            console.log("FOUND PATCHED CODE IN CHUNK:", url);
            const index = js.indexOf('saved.price');
            console.log("Snippet:", js.substring(Math.max(0, index - 50), index + 50));
            return; // We found the patch!
        }
        
        // Also let's see if the OLD unpatched logic is there
        if (js.includes('mappedRoster') && js.includes('rawRoster')) {
             console.log("FOUND DRAFTCLIENT, checking contents...");
             const idx = js.indexOf('mappedRoster');
             console.log("Snippet:", js.substring(Math.max(0, idx - 100), idx + 100));
        }
    }
    console.log("Finished searching chunks.");
}
check();

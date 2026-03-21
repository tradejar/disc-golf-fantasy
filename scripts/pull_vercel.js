const https = require('https');

async function getLiveCode() {
    // 1. Get the homepage to find chunks
    let html = await new Promise((res) => https.get('https://disc-golf-mini-fantasy.vercel.app', r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(d)); }));
    
    // 2. Find all JS chunks
    const chunkRegex = /src="(\/_next\/static\/chunks\/[a-zA-Z0-9_\-\.]+?\.js)"/g;
    let match;
    const urls = [];
    while ((match = chunkRegex.exec(html)) !== null) {
        urls.push(`https://disc-golf-mini-fantasy.vercel.app${match[1]}`);
    }

    // 3. DraftClient chunk is not on the homepage. How do we find it?
    // It's dynamically loaded when navigating, or pre-fetched.
    // Is DraftClient inside one of these?
    for (const url of urls) {
        let js = await new Promise((res) => https.get(url, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(d)); }));
        if (js.includes('mappedRoster')) {
            console.log("FOUND DRAFT CLIENT IN HOMEPAGE CHUNKS!");
            return;
        }
    }

    console.log("Not in homepage. Let's pull the build manifest!");
    let manifestUrl = html.match(/src="(\/_next\/static\/[a-zA-Z0-9_\-\.]+\/_buildManifest\.js)"/)[1];
    let manifestJs = await new Promise((res) => https.get(`https://disc-golf-mini-fantasy.vercel.app${manifestUrl}`, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(d)); }));
    
    // Find DraftClient.tsx chunk from the manifest!
    // The manifest lists all routes and their chunks
    let hashMatch = manifestJs.match(/"\/draft\/\[id\]":\[([^\]]+)\]/);
    if (hashMatch) {
         let chunksStr = hashMatch[1].replace(/"/g, '');
         let draftChunks = chunksStr.split(',');
         for (const chunk of draftChunks) {
             let chunkUrl = `https://disc-golf-mini-fantasy.vercel.app/_next/${chunk}`;
             let js = await new Promise((res) => https.get(chunkUrl, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(d)); }));
             if (js.includes('mappedRoster')) {
                  console.log("FOUND DRAFTCLIENT!");
                  console.log("Contains ?? patch?", js.includes('price:'));
                  const idx = js.indexOf('mappedRoster');
                  console.log("LOGIC:", js.substring(idx - 150, idx + 150));
                  return;
             }
         }
    } else {
         console.log("Could not find draft route in manifest.");
    }
}
getLiveCode();

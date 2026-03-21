const https = require('https');

async function getLiveCode() {
    let url = 'https://disc-golf-mini-fantasy.vercel.app';
    let html = await new Promise((res) => https.get(url, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(d)); }));
    
    let match = html.match(/src="(\/_next\/static\/[a-zA-Z0-9_\-\.\/]+?\.js)"/g);
    if (!match) return console.log("No chunks found in HTML!");

    let found = false;
    for (let m of match) {
        let chunkUrl = url + m.match(/src="([^"]+)"/)[1];
        let js = await new Promise((res) => https.get(chunkUrl, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(d)); }));
        if (js.includes('mappedRoster')) {
             console.log("FOUND DRAFTCLIENT in:", chunkUrl);
             const idx = js.indexOf('mappedRoster');
             console.log("LOGIC:", js.substring(Math.max(0, idx - 150), idx + 150));
             found = true;
        }
    }
    
    // Check pages directly from Next build manifest
    if (!found) {
        let buildIdMatch = html.match(/"buildId":"([^"]+)"/);
        if (buildIdMatch) {
            let buildId = buildIdMatch[1];
            let manifestUrl = `${url}/_next/data/${buildId}/draft/96402.json`;
            console.log("Found build id:", buildId);
            // This is just the data payload, but we need the js chunk.
        }
    }
}
getLiveCode();

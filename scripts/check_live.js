const https = require('https');
// We will hit the homepage to get the layout and page chunks.
// Because the Draft page requires auth, we can just hit the homepage or a public route
// and grep the JS chunks. Actually, the DraftClient component might be in its own chunk.
// Let's just grep the entire Vercel build output locally.

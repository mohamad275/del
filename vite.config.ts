import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Vite plugin that adds a dev server middleware to resolve shortened Google Maps URLs.
 * It follows the redirect chain, then parses both the final URL and the HTML body
 * for coordinates. Returns { url, lat, lng } when found.
 */
function resolveUrlPlugin(): Plugin {
    return {
        name: 'resolve-short-url',
        configureServer(server) {
            server.middlewares.use('/api/resolve-url', async (req: any, res: any) => {
                const parsedUrl = new URL(req.url!, `http://${req.headers.host}`);
                const targetUrl = parsedUrl.searchParams.get('url');

                if (!targetUrl) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing url parameter' }));
                    return;
                }

                try {
                    // Follow all redirects and get the page content
                    const response = await fetch(targetUrl, {
                        redirect: 'follow',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.9',
                        },
                    });

                    const finalUrl = response.url;
                    const html = await response.text();

                    // Try to parse coordinates from the final URL
                    let lat: number | null = null;
                    let lng: number | null = null;

                    // Pattern 1: /@lat,lng in URL
                    const atMatch = finalUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
                    if (atMatch) {
                        lat = parseFloat(atMatch[1]);
                        lng = parseFloat(atMatch[2]);
                    }

                    // Pattern 2: ?q=lat,lng or ?ll=lat,lng
                    if (!lat) {
                        const qMatch = finalUrl.match(/[?&](?:q|ll)=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
                        if (qMatch) {
                            lat = parseFloat(qMatch[1]);
                            lng = parseFloat(qMatch[2]);
                        }
                    }

                    // Pattern 3: !3d...!4d... in URL or HTML
                    if (!lat) {
                        const dataMatch = (finalUrl + html).match(/!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
                        if (dataMatch) {
                            lat = parseFloat(dataMatch[1]);
                            lng = parseFloat(dataMatch[2]);
                        }
                    }

                    // Pattern 4: center= or ll= in the HTML
                    if (!lat) {
                        const centerMatch = html.match(/center=(-?\d+\.?\d+)%2C(-?\d+\.?\d+)/);
                        if (centerMatch) {
                            lat = parseFloat(centerMatch[1]);
                            lng = parseFloat(centerMatch[2]);
                        }
                    }

                    // Pattern 5: [null,null,lat,lng] arrays in Google Maps page source
                    if (!lat) {
                        const arrayMatch = html.match(/\[null,null,(-?\d+\.\d{4,}),(-?\d+\.\d{4,})\]/);
                        if (arrayMatch) {
                            lat = parseFloat(arrayMatch[1]);
                            lng = parseFloat(arrayMatch[2]);
                        }
                    }

                    // Pattern 6: APP_INITIALIZATION_STATE containing coordinates
                    if (!lat) {
                        const initMatch = html.match(/APP_INITIALIZATION_STATE.*?\[\[(-?\d+\.\d+),(-?\d+\.\d+)/s);
                        if (initMatch) {
                            // Note: Google often puts [lng, lat] in this array
                            lng = parseFloat(initMatch[1]);
                            lat = parseFloat(initMatch[2]);
                        }
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        url: finalUrl,
                        lat: lat,
                        lng: lng,
                    }));
                } catch (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to resolve URL' }));
                }
            });
        }
    };
}

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        resolveUrlPlugin(),
    ],
})

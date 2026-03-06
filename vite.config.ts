import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import https from 'https'
import http from 'http'

/**
 * Vite plugin that adds a dev server middleware to resolve shortened Google Maps URLs.
 * Uses Node's native https module for reliable redirect following.
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
                    // Follow redirects manually using Node's https module
                    const { finalUrl, body } = await followRedirects(targetUrl, 10);

                    let lat: number | null = null;
                    let lng: number | null = null;

                    // Try all URL patterns from the final URL
                    const urlCoords = extractCoordsFromUrl(finalUrl);
                    if (urlCoords) {
                        lat = urlCoords.lat;
                        lng = urlCoords.lng;
                    }

                    // Try parsing HTML body for coordinates
                    if (!lat && body) {
                        const htmlCoords = extractCoordsFromHtml(body, finalUrl);
                        if (htmlCoords) {
                            lat = htmlCoords.lat;
                            lng = htmlCoords.lng;
                        }
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ url: finalUrl, lat, lng }));
                } catch (err) {
                    console.error('URL resolution error:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to resolve URL' }));
                }
            });
        }
    };
}

/**
 * Follow HTTP redirects manually using Node's native https/http modules.
 * This is more reliable than fetch for Google's redirect chains.
 */
function followRedirects(url: string, maxRedirects: number): Promise<{ finalUrl: string; body: string }> {
    return new Promise((resolve, reject) => {
        const doRequest = (currentUrl: string, redirectsLeft: number) => {
            const client = currentUrl.startsWith('https') ? https : http;

            const request = client.get(currentUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
                },
            }, (response) => {
                const statusCode = response.statusCode || 0;
                const location = response.headers.location;

                // Handle redirects (301, 302, 303, 307, 308)
                if (statusCode >= 300 && statusCode < 400 && location) {
                    if (redirectsLeft <= 0) {
                        reject(new Error('Too many redirects'));
                        return;
                    }

                    // Resolve relative URLs
                    const nextUrl = location.startsWith('http')
                        ? location
                        : new URL(location, currentUrl).href;

                    // Check if the redirect URL already contains coordinates
                    const coords = extractCoordsFromUrl(nextUrl);
                    if (coords) {
                        // Found coordinates in redirect URL — no need to follow further
                        resolve({ finalUrl: nextUrl, body: '' });
                        response.destroy();
                        return;
                    }

                    response.destroy();
                    doRequest(nextUrl, redirectsLeft - 1);
                    return;
                }

                // Read the response body
                let body = '';
                response.setEncoding('utf8');
                response.on('data', (chunk: string) => { body += chunk; });
                response.on('end', () => {
                    resolve({ finalUrl: currentUrl, body });
                });
            });

            request.on('error', reject);
            request.setTimeout(10000, () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        };

        doRequest(url, maxRedirects);
    });
}

/** Extract coordinates from a Google Maps URL string */
function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
    // /@lat,lng
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

    // ?q=lat,lng or ?ll=lat,lng
    const qMatch = url.match(/[?&](?:q|ll)=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

    // /lat,lng in path (at least 3 decimal digits)
    const pathMatch = url.match(/\/(-?\d+\.\d{3,}),(-?\d+\.\d{3,})/);
    if (pathMatch) return { lat: parseFloat(pathMatch[1]), lng: parseFloat(pathMatch[2]) };

    // !3d{lat}!4d{lng} data encoding
    const dataMatch = url.match(/!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
    if (dataMatch) return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };

    // !2d{lng}!3d{lat} protocol buffer encoding
    const pbMatch = url.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/);
    if (pbMatch) return { lat: parseFloat(pbMatch[2]), lng: parseFloat(pbMatch[1]) };

    // place/name/lat,lng
    const placeMatch = url.match(/place\/[^/]*\/(-?\d+\.\d{3,}),(-?\d+\.\d{3,})/);
    if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };

    return null;
}

/** Extract coordinates from HTML response body */
function extractCoordsFromHtml(html: string, url: string): { lat: number; lng: number } | null {
    // meta http-equiv="refresh" content="...url=https://..."
    const metaRefresh = html.match(/content=["'][^"']*url=['"]?([^"'\s>]+)/i);
    if (metaRefresh) {
        const coords = extractCoordsFromUrl(metaRefresh[1]);
        if (coords) return coords;
    }

    // og:url meta tag
    const ogUrl = html.match(/property=["']og:url["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/content=["']([^"']+)["'][^>]*property=["']og:url["']/i);
    if (ogUrl) {
        const coords = extractCoordsFromUrl(ogUrl[1]);
        if (coords) return coords;
    }

    // window.location or window.location.href = "url"
    const jsRedirect = html.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i);
    if (jsRedirect) {
        const coords = extractCoordsFromUrl(jsRedirect[1]);
        if (coords) return coords;
    }

    // !3d{lat}!4d{lng} in HTML
    const dataMatch = html.match(/!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
    if (dataMatch) return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };

    // !2d{lng}!3d{lat} in HTML
    const pbMatch = html.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/);
    if (pbMatch) return { lat: parseFloat(pbMatch[2]), lng: parseFloat(pbMatch[1]) };

    // center=lat%2Clng
    const centerMatch = html.match(/center=(-?\d+\.?\d+)%2C(-?\d+\.?\d+)/);
    if (centerMatch) return { lat: parseFloat(centerMatch[1]), lng: parseFloat(centerMatch[2]) };

    // [null,null,lat,lng] arrays in Google Maps page source
    const arrayMatch = html.match(/\[null,null,(-?\d+\.\d{4,}),(-?\d+\.\d{4,})\]/);
    if (arrayMatch) return { lat: parseFloat(arrayMatch[1]), lng: parseFloat(arrayMatch[2]) };

    // APP_INITIALIZATION_STATE containing [lng, lat]
    const initMatch = html.match(/APP_INITIALIZATION_STATE.*?\[\[(-?\d+\.\d+),(-?\d+\.\d+)/s);
    if (initMatch) return { lat: parseFloat(initMatch[2]), lng: parseFloat(initMatch[1]) };

    // /@lat,lng anywhere in the HTML (links, scripts, etc.)
    const atInHtml = html.match(/@(-?\d+\.\d{4,}),(-?\d+\.\d{4,})/);
    if (atInHtml) return { lat: parseFloat(atInHtml[1]), lng: parseFloat(atInHtml[2]) };

    // Combined: check the original URL as well
    const urlCoords = extractCoordsFromUrl(url);
    if (urlCoords) return urlCoords;

    return null;
}

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        resolveUrlPlugin(),
    ],
})

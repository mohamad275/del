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
                    // ===== Strategy 1: Manual redirect — get Location header =====
                    // Google short URLs often redirect to the full URL containing coordinates
                    let finalUrl = targetUrl;
                    let lat: number | null = null;
                    let lng: number | null = null;

                    // Follow up to 10 redirects manually to capture each URL
                    let currentUrl = targetUrl;
                    const visitedUrls: string[] = [];
                    for (let i = 0; i < 10; i++) {
                        try {
                            const headResp = await fetch(currentUrl, {
                                method: 'GET',
                                redirect: 'manual',
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                                    'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
                                },
                            });

                            visitedUrls.push(currentUrl);

                            // Check for Location header redirect
                            const location = headResp.headers.get('location');
                            if (location && (headResp.status >= 300 && headResp.status < 400)) {
                                // Resolve relative URLs
                                const resolvedLocation = location.startsWith('http')
                                    ? location
                                    : new URL(location, currentUrl).href;
                                currentUrl = resolvedLocation;
                                finalUrl = resolvedLocation;

                                // Try to extract coordinates from the redirect URL
                                const coords = extractCoordsFromUrl(resolvedLocation);
                                if (coords) {
                                    lat = coords.lat;
                                    lng = coords.lng;
                                    break;
                                }
                                continue;
                            }

                            // No more redirects — read body for coordinates
                            const html = await headResp.text();

                            // Try extracting from the final URL
                            if (!lat) {
                                const urlCoords = extractCoordsFromUrl(currentUrl);
                                if (urlCoords) { lat = urlCoords.lat; lng = urlCoords.lng; }
                            }

                            // Try extracting from HTML meta refresh or og:url
                            if (!lat) {
                                const metaRefresh = html.match(/content=["'][^"']*url=['"]?([^"'\s>]+)/i);
                                if (metaRefresh) {
                                    const metaUrl = metaRefresh[1];
                                    const coords = extractCoordsFromUrl(metaUrl);
                                    if (coords) { lat = coords.lat; lng = coords.lng; finalUrl = metaUrl; }
                                }
                            }

                            if (!lat) {
                                const ogUrl = html.match(/property=["']og:url["'][^>]*content=["']([^"']+)["']/i)
                                    || html.match(/content=["']([^"']+)["'][^>]*property=["']og:url["']/i);
                                if (ogUrl) {
                                    const coords = extractCoordsFromUrl(ogUrl[1]);
                                    if (coords) { lat = coords.lat; lng = coords.lng; finalUrl = ogUrl[1]; }
                                }
                            }

                            // !3d...!4d... in URL or HTML
                            if (!lat) {
                                const dataMatch = (currentUrl + html).match(/!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
                                if (dataMatch) {
                                    lat = parseFloat(dataMatch[1]);
                                    lng = parseFloat(dataMatch[2]);
                                }
                            }

                            // center= in HTML
                            if (!lat) {
                                const centerMatch = html.match(/center=(-?\d+\.?\d+)%2C(-?\d+\.?\d+)/);
                                if (centerMatch) {
                                    lat = parseFloat(centerMatch[1]);
                                    lng = parseFloat(centerMatch[2]);
                                }
                            }

                            // [null,null,lat,lng] arrays
                            if (!lat) {
                                const arrayMatch = html.match(/\[null,null,(-?\d+\.\d{4,}),(-?\d+\.\d{4,})\]/);
                                if (arrayMatch) {
                                    lat = parseFloat(arrayMatch[1]);
                                    lng = parseFloat(arrayMatch[2]);
                                }
                            }

                            // APP_INITIALIZATION_STATE
                            if (!lat) {
                                const initMatch = html.match(/APP_INITIALIZATION_STATE.*?\[\[(-?\d+\.\d+),(-?\d+\.\d+)/s);
                                if (initMatch) {
                                    lng = parseFloat(initMatch[1]);
                                    lat = parseFloat(initMatch[2]);
                                }
                            }

                            // pb= protocol buffer lat/lng: ...!2d{lng}!3d{lat}...
                            if (!lat) {
                                const pbMatch = html.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/);
                                if (pbMatch) {
                                    lng = parseFloat(pbMatch[1]);
                                    lat = parseFloat(pbMatch[2]);
                                }
                            }

                            // Any coordinate-like pattern in visited URLs
                            if (!lat) {
                                for (const visited of visitedUrls) {
                                    const coords = extractCoordsFromUrl(visited);
                                    if (coords) { lat = coords.lat; lng = coords.lng; break; }
                                }
                            }

                            break; // End of redirect chain

                        } catch {
                            break;
                        }
                    }

                    // ===== Strategy 2: Full fetch with redirect:follow as fallback =====
                    if (!lat) {
                        try {
                            const response = await fetch(targetUrl, {
                                redirect: 'follow',
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                                    'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
                                },
                            });
                            finalUrl = response.url;
                            const html = await response.text();

                            const coords = extractCoordsFromUrl(finalUrl);
                            if (coords) { lat = coords.lat; lng = coords.lng; }

                            if (!lat) {
                                const dataMatch = (finalUrl + html).match(/!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
                                if (dataMatch) { lat = parseFloat(dataMatch[1]); lng = parseFloat(dataMatch[2]); }
                            }
                            if (!lat) {
                                const pbMatch = (finalUrl + html).match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/);
                                if (pbMatch) { lng = parseFloat(pbMatch[1]); lat = parseFloat(pbMatch[2]); }
                            }
                            if (!lat) {
                                const centerMatch = html.match(/center=(-?\d+\.?\d+)%2C(-?\d+\.?\d+)/);
                                if (centerMatch) { lat = parseFloat(centerMatch[1]); lng = parseFloat(centerMatch[2]); }
                            }
                            if (!lat) {
                                const arrayMatch = html.match(/\[null,null,(-?\d+\.\d{4,}),(-?\d+\.\d{4,})\]/);
                                if (arrayMatch) { lat = parseFloat(arrayMatch[1]); lng = parseFloat(arrayMatch[2]); }
                            }
                        } catch {
                            // Ignore, will return null coordinates
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

    // !3d...!4d... data encoding
    const dataMatch = url.match(/!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
    if (dataMatch) return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };

    // !2d{lng}!3d{lat} protocol buffer encoding
    const pbMatch = url.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/);
    if (pbMatch) return { lat: parseFloat(pbMatch[2]), lng: parseFloat(pbMatch[1]) };

    // ftid= or place/ then coords later
    const placeMatch = url.match(/place\/[^/]*\/(-?\d+\.\d{3,}),(-?\d+\.\d{3,})/);
    if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };

    return null;
}

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        resolveUrlPlugin(),
    ],
})

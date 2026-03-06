import https from 'https';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const targetUrl = req.query.url as string;

    if (!targetUrl) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        const { finalUrl, body } = await followRedirects(targetUrl, 10);

        let lat: number | null = null;
        let lng: number | null = null;

        const urlCoords = extractCoordsFromUrl(finalUrl);
        if (urlCoords) {
            lat = urlCoords.lat;
            lng = urlCoords.lng;
        }

        if (!lat && body) {
            const htmlCoords = extractCoordsFromHtml(body);
            if (htmlCoords) {
                lat = htmlCoords.lat;
                lng = htmlCoords.lng;
            }
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json({ url: finalUrl, lat, lng });
    } catch (err) {
        console.error('URL resolution error:', err);
        return res.status(500).json({ error: 'Failed to resolve URL' });
    }
}

function followRedirects(url: string, maxRedirects: number): Promise<{ finalUrl: string; body: string }> {
    return new Promise((resolve, reject) => {
        const doRequest = (currentUrl: string, redirectsLeft: number) => {
            const request = https.get(currentUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
                },
            }, (response) => {
                const statusCode = response.statusCode || 0;
                const location = response.headers.location;

                if (statusCode >= 300 && statusCode < 400 && location) {
                    if (redirectsLeft <= 0) { reject(new Error('Too many redirects')); return; }
                    const nextUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href;
                    const coords = extractCoordsFromUrl(nextUrl);
                    if (coords) {
                        resolve({ finalUrl: nextUrl, body: '' });
                        response.destroy();
                        return;
                    }
                    response.destroy();
                    doRequest(nextUrl, redirectsLeft - 1);
                    return;
                }

                let body = '';
                response.setEncoding('utf8');
                response.on('data', (chunk: string) => { body += chunk; });
                response.on('end', () => { resolve({ finalUrl: currentUrl, body }); });
            });

            request.on('error', reject);
            request.setTimeout(10000, () => { request.destroy(); reject(new Error('Timeout')); });
        };

        doRequest(url, maxRedirects);
    });
}

function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

    const qMatch = url.match(/[?&](?:q|ll)=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

    const pathMatch = url.match(/\/(-?\d+\.\d{3,}),(-?\d+\.\d{3,})/);
    if (pathMatch) return { lat: parseFloat(pathMatch[1]), lng: parseFloat(pathMatch[2]) };

    const dataMatch = url.match(/!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
    if (dataMatch) return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };

    const pbMatch = url.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/);
    if (pbMatch) return { lat: parseFloat(pbMatch[2]), lng: parseFloat(pbMatch[1]) };

    const placeMatch = url.match(/place\/[^/]*\/(-?\d+\.\d{3,}),(-?\d+\.\d{3,})/);
    if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };

    return null;
}

function extractCoordsFromHtml(html: string): { lat: number; lng: number } | null {
    const metaRefresh = html.match(/content=["'][^"']*url=['"]?([^"'\s>]+)/i);
    if (metaRefresh) { const c = extractCoordsFromUrl(metaRefresh[1]); if (c) return c; }

    const ogUrl = html.match(/property=["']og:url["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/content=["']([^"']+)["'][^>]*property=["']og:url["']/i);
    if (ogUrl) { const c = extractCoordsFromUrl(ogUrl[1]); if (c) return c; }

    const dataMatch = html.match(/!3d(-?\d+\.?\d+)!4d(-?\d+\.?\d+)/);
    if (dataMatch) return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };

    const pbMatch = html.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/);
    if (pbMatch) return { lat: parseFloat(pbMatch[2]), lng: parseFloat(pbMatch[1]) };

    const centerMatch = html.match(/center=(-?\d+\.?\d+)%2C(-?\d+\.?\d+)/);
    if (centerMatch) return { lat: parseFloat(centerMatch[1]), lng: parseFloat(centerMatch[2]) };

    const arrayMatch = html.match(/\[null,null,(-?\d+\.\d{4,}),(-?\d+\.\d{4,})\]/);
    if (arrayMatch) return { lat: parseFloat(arrayMatch[1]), lng: parseFloat(arrayMatch[2]) };

    const atInHtml = html.match(/@(-?\d+\.\d{4,}),(-?\d+\.\d{4,})/);
    if (atInHtml) return { lat: parseFloat(atInHtml[1]), lng: parseFloat(atInHtml[2]) };

    return null;
}

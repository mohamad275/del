/**
 * Parse a Google Maps URL and extract latitude/longitude coordinates.
 * Supports various Google Maps URL formats:
 *  - https://www.google.com/maps/place/.../@25.2048,55.2708,...
 *  - https://maps.google.com/?q=25.2048,55.2708
 *  - https://www.google.com/maps/dir/25.2048,55.2708/...
 *  - Shortened URLs via resolveShortUrl() first
 */
export function parseGoogleMapsLink(url: string): { lat: number; lng: number } | null {
    try {
        // Pattern 1: /@lat,lng
        const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
        const atMatch = url.match(atPattern);
        if (atMatch) {
            return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
        }

        // Pattern 2: ?q=lat,lng or ?ll=lat,lng
        const qPattern = /[?&](?:q|ll)=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
        const qMatch = url.match(qPattern);
        if (qMatch) {
            return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
        }

        // Pattern 3: /place/lat,lng or coords in path like /25.2048,55.2708
        const pathPattern = /\/(-?\d+\.\d{3,}),(-?\d+\.\d{3,})/;
        const pathMatch = url.match(pathPattern);
        if (pathMatch) {
            return { lat: parseFloat(pathMatch[1]), lng: parseFloat(pathMatch[2]) };
        }

        // Pattern 4: data= with lat/lng encoded
        const dataPattern = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/;
        const dataMatch = url.match(dataPattern);
        if (dataMatch) {
            return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Parse coordinate strings in various formats:
 *  - DMS: 25°17'27.0"N 55°34'34.1"E
 *  - Decimal: 25.2908, 55.5761
 *  - Decimal with direction: 25.2908N 55.5761E
 *  - Mixed: 25°17.45'N 55°34.57'E (degrees + decimal minutes)
 */
export function parseCoordinates(text: string): { lat: number; lng: number } | null {
    try {
        const trimmed = text.trim();

        // Pattern 1: DMS format — 25°17'27.0"N 55°34'34.1"E
        const dmsPattern = /(-?\d+)[°]\s*(\d+)[′']\s*(\d+\.?\d*)[″"]\s*([NSns])\s*,?\s*(-?\d+)[°]\s*(\d+)[′']\s*(\d+\.?\d*)[″"]\s*([EWew])/;
        const dmsMatch = trimmed.match(dmsPattern);
        if (dmsMatch) {
            let lat = parseInt(dmsMatch[1]) + parseInt(dmsMatch[2]) / 60 + parseFloat(dmsMatch[3]) / 3600;
            let lng = parseInt(dmsMatch[5]) + parseInt(dmsMatch[6]) / 60 + parseFloat(dmsMatch[7]) / 3600;
            if (dmsMatch[4].toUpperCase() === 'S') lat = -lat;
            if (dmsMatch[8].toUpperCase() === 'W') lng = -lng;
            return { lat, lng };
        }

        // Pattern 2: Degrees + decimal minutes — 25°17.45'N 55°34.57'E
        const dmPattern = /(-?\d+)[°]\s*(\d+\.?\d*)[′']\s*([NSns])\s*,?\s*(-?\d+)[°]\s*(\d+\.?\d*)[′']\s*([EWew])/;
        const dmMatch = trimmed.match(dmPattern);
        if (dmMatch) {
            let lat = parseInt(dmMatch[1]) + parseFloat(dmMatch[2]) / 60;
            let lng = parseInt(dmMatch[4]) + parseFloat(dmMatch[5]) / 60;
            if (dmMatch[3].toUpperCase() === 'S') lat = -lat;
            if (dmMatch[6].toUpperCase() === 'W') lng = -lng;
            return { lat, lng };
        }

        // Pattern 3: Simple decimal pair — 25.2908, 55.5761 or 25.2908 55.5761
        const decimalPattern = /^(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)$/;
        const decimalMatch = trimmed.match(decimalPattern);
        if (decimalMatch) {
            const lat = parseFloat(decimalMatch[1]);
            const lng = parseFloat(decimalMatch[2]);
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                return { lat, lng };
            }
        }

        // Pattern 4: Decimal with direction — 25.2908N, 55.5761E
        const decDirPattern = /(-?\d+\.?\d*)\s*([NSns])\s*,?\s*(-?\d+\.?\d*)\s*([EWew])/;
        const decDirMatch = trimmed.match(decDirPattern);
        if (decDirMatch) {
            let lat = parseFloat(decDirMatch[1]);
            let lng = parseFloat(decDirMatch[3]);
            if (decDirMatch[2].toUpperCase() === 'S') lat = -lat;
            if (decDirMatch[4].toUpperCase() === 'W') lng = -lng;
            return { lat, lng };
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Check if a string looks like a Google Maps URL.
 */
export function isGoogleMapsLink(text: string): boolean {
    return /google\.com\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl/i.test(text);
}

/**
 * Check if a URL is a shortened Google Maps link that needs server-side resolution.
 * These URLs (maps.app.goo.gl, goo.gl/maps) don't contain coordinates directly —
 * they're redirect URLs that must be expanded first.
 */
export function isShortGoogleMapsUrl(text: string): boolean {
    return /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(text);
}

/**
 * Resolve a shortened Google Maps URL via the dev server proxy.
 * The proxy follows the redirect chain and returns the final expanded URL,
 * which will contain extractable coordinates.
 */
export async function resolveShortUrl(shortUrl: string): Promise<string | null> {
    try {
        const response = await fetch(`/api/resolve-url?url=${encodeURIComponent(shortUrl)}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.url || null;
    } catch {
        return null;
    }
}

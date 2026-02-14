import { useCallback, useRef } from 'react';
import type { LatLng } from '../types';

/**
 * Geocoding hook with localStorage caching to minimize API calls.
 * Converts addresses to lat/lng coordinates and vice versa.
 */

const CACHE_KEY = 'routeflow_geocode_cache';

interface CacheEntry {
    address: string;
    location: LatLng;
    timestamp: number;
}

function getCache(): Record<string, CacheEntry> {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function setCache(key: string, entry: CacheEntry) {
    try {
        const cache = getCache();
        cache[key] = entry;
        // Keep cache under 500 entries
        const keys = Object.keys(cache);
        if (keys.length > 500) {
            const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
            sorted.slice(0, 100).forEach((k) => delete cache[k]);
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
        // Storage full, clear old entries
    }
}

export function useGeocode() {
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);

    const getGeocoder = useCallback(() => {
        if (!geocoderRef.current && window.google?.maps) {
            geocoderRef.current = new google.maps.Geocoder();
        }
        return geocoderRef.current;
    }, []);

    /** Convert an address string to LatLng */
    const geocodeAddress = useCallback(
        async (address: string): Promise<{ location: LatLng; formattedAddress: string } | null> => {
            const cacheKey = address.toLowerCase().trim();
            const cache = getCache();

            // Check cache first (valid for 30 days)
            if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < 30 * 24 * 60 * 60 * 1000) {
                return { location: cache[cacheKey].location, formattedAddress: cache[cacheKey].address };
            }

            const geocoder = getGeocoder();
            if (!geocoder) return null;

            try {
                const result = await geocoder.geocode({ address });
                if (result.results.length > 0) {
                    const loc = result.results[0].geometry.location;
                    const entry: CacheEntry = {
                        address: result.results[0].formatted_address,
                        location: { lat: loc.lat(), lng: loc.lng() },
                        timestamp: Date.now(),
                    };
                    setCache(cacheKey, entry);
                    return { location: entry.location, formattedAddress: entry.address };
                }
            } catch (err) {
                console.error('Geocoding failed:', err);
            }
            return null;
        },
        [getGeocoder]
    );

    /** Reverse geocode a LatLng to an address */
    const reverseGeocode = useCallback(
        async (location: LatLng): Promise<string | null> => {
            const cacheKey = `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
            const cache = getCache();

            if (cache[cacheKey]) {
                return cache[cacheKey].address;
            }

            const geocoder = getGeocoder();
            if (!geocoder) return null;

            try {
                const result = await geocoder.geocode({ location });
                if (result.results.length > 0) {
                    const addr = result.results[0].formatted_address;
                    setCache(cacheKey, { address: addr, location, timestamp: Date.now() });
                    return addr;
                }
            } catch (err) {
                console.error('Reverse geocoding failed:', err);
            }
            return null;
        },
        [getGeocoder]
    );

    return { geocodeAddress, reverseGeocode };
}

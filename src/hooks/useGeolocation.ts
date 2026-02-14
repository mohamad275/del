import { useState, useCallback } from 'react';
import type { LatLng } from '../types';

/**
 * Hook to grab the user's current GPS location via the browser Geolocation API.
 */
export function useGeolocation() {
    const [location, setLocation] = useState<LatLng | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        setLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000, // 5 minutes cache
            }
        );
    }, []);

    return { location, loading, error, getCurrentLocation };
}

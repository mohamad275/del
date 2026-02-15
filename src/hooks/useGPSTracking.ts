import { useState, useCallback, useRef, useEffect } from 'react';
import type { GPSPosition } from '../types';

/**
 * Live GPS tracking hook using browser Geolocation API.
 * Uses watchPosition for continuous updates.
 * Provides: position, speed, heading, accuracy.
 */
export function useGPSTracking() {
    const [position, setPosition] = useState<GPSPosition | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const watchIdRef = useRef<number | null>(null);

    const start = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        setIsTracking(true);
        setError(null);

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const speedMs = pos.coords.speed ?? 0;
                setPosition({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    speed: Math.max(0, speedMs * 3.6), // m/s → km/h
                    heading: pos.coords.heading ?? 0,
                    accuracy: pos.coords.accuracy,
                    timestamp: pos.timestamp,
                });
                setError(null);
            },
            (err) => {
                setError(err.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 3000, // 3 seconds cache
            }
        );
    }, []);

    const stop = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsTracking(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    return { position, isTracking, error, start, stop };
}

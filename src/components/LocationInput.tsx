import { useState, useCallback, useRef, useEffect } from 'react';
import type { DeliveryStop, LatLng } from '../types';
import { useGeolocation } from '../hooks/useGeolocation';
import { useGeocode } from '../hooks/useGeocode';
import { isGoogleMapsLink, isShortGoogleMapsUrl, parseGoogleMapsLink, parseCoordinates, resolveShortUrl } from '../utils/parseGoogleMapsLink';
import { generateId } from '../utils/formatTime';

interface LocationInputProps {
    label: string;
    sublabel?: string;
    icon: 'start' | 'end';
    value: DeliveryStop;
    onChange: (stop: DeliveryStop) => void;
    showGPS?: boolean;
    optional?: boolean;
}

/**
 * Input component for setting start/end locations.
 * Supports GPS auto-detect, manual text entry, and Google Maps link pasting.
 */
export default function LocationInput({
    label,
    sublabel,
    icon,
    value,
    onChange,
    showGPS = false,
    optional = false,
}: LocationInputProps) {
    const [inputText, setInputText] = useState(value.address);
    const [isLoading, setIsLoading] = useState(false);
    const { location: gpsLocation, loading: gpsLoading, getCurrentLocation } = useGeolocation();
    const { geocodeAddress, reverseGeocode } = useGeocode();
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    // When GPS location is obtained, reverse-geocode it
    useEffect(() => {
        if (gpsLocation && showGPS) {
            setIsLoading(true);
            reverseGeocode(gpsLocation).then((address) => {
                const addr = address || `${gpsLocation.lat.toFixed(6)}, ${gpsLocation.lng.toFixed(6)}`;
                setInputText(addr);
                onChange({ ...value, address: addr, location: gpsLocation });
                setIsLoading(false);
            });
        }
    }, [gpsLocation]);

    const handleInputChange = useCallback(
        async (text: string) => {
            setInputText(text);
            onChange({ ...value, address: text, location: null });

            // Clear previous debounce
            if (debounceRef.current) clearTimeout(debounceRef.current);

            if (text.trim().length < 3) return;

            // Check if it's a Google Maps link
            if (isGoogleMapsLink(text)) {
                setIsLoading(true);

                // If it's a shortened URL, resolve it first
                let urlToparse = text;
                if (isShortGoogleMapsUrl(text)) {
                    const expanded = await resolveShortUrl(text);
                    if (expanded) urlToparse = expanded;
                }

                const coords = parseGoogleMapsLink(urlToparse);
                if (coords) {
                    reverseGeocode(coords).then((address) => {
                        const addr = address || text;
                        setInputText(addr);
                        onChange({ ...value, address: addr, location: coords });
                        setIsLoading(false);
                    });
                    return;
                }
                setIsLoading(false);
            }

            // Check if it's raw coordinates (DMS, decimal, etc.)
            const coordsParsed = parseCoordinates(text);
            if (coordsParsed) {
                setIsLoading(true);
                reverseGeocode(coordsParsed).then((address) => {
                    const addr = address || text;
                    setInputText(addr);
                    onChange({ ...value, address: addr, location: coordsParsed });
                    setIsLoading(false);
                });
                return;
            }

            // Debounced geocoding for regular text
            debounceRef.current = setTimeout(async () => {
                setIsLoading(true);
                const result = await geocodeAddress(text);
                if (result) {
                    onChange({
                        ...value,
                        address: result.formattedAddress,
                        location: result.location,
                    });
                    setInputText(result.formattedAddress);
                }
                setIsLoading(false);
            }, 800);
        },
        [value, onChange, geocodeAddress, reverseGeocode]
    );

    const iconColor = icon === 'start' ? 'bg-success' : 'bg-accent-500';

    return (
        <div className="animate-fadeInUp">
            <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-3 h-3 rounded-full ${iconColor}`} />
                <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">
                    {label}
                </span>
                {optional && (
                    <span className="text-xs text-surface-400 dark:text-surface-500">(Optional)</span>
                )}
                {sublabel && (
                    <span className="text-xs text-surface-400 dark:text-surface-500">{sublabel}</span>
                )}
            </div>

            <div className="relative">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Enter address or paste Google Maps link..."
                    className="w-full px-4 py-3 pr-24 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all duration-200 placeholder:text-surface-400"
                />

                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isLoading && (
                        <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                    )}

                    {value.location && (
                        <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                    )}

                    {showGPS && (
                        <button
                            onClick={getCurrentLocation}
                            disabled={gpsLoading}
                            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50 transition-all duration-200 disabled:opacity-50"
                        >
                            {gpsLoading ? (
                                <span className="flex items-center gap-1">
                                    <div className="w-3 h-3 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
                                    GPS
                                </span>
                            ) : (
                                <span className="flex items-center gap-1">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="3" />
                                        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                                    </svg>
                                    GPS
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

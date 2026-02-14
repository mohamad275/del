import { useState, useCallback, useRef, useEffect } from 'react';
import type { DeliveryStop } from '../types';
import { useGeolocation } from '../hooks/useGeolocation';
import { useGeocode } from '../hooks/useGeocode';
import { isGoogleMapsLink, isShortGoogleMapsUrl, parseGoogleMapsLink, parseCoordinates, resolveShortUrl } from '../utils/parseGoogleMapsLink';
import { t, type Language } from '../i18n';

interface LocationInputProps {
    lang: Language;
    label: 'start' | 'end';
    value: DeliveryStop;
    onChange: (stop: DeliveryStop) => void;
    showGPS?: boolean;
}

export default function LocationInput({ lang, label, value, onChange, showGPS = false }: LocationInputProps) {
    const [inputText, setInputText] = useState(value.address);
    const [isLoading, setIsLoading] = useState(false);
    const { location: gpsLocation, loading: gpsLoading, getCurrentLocation } = useGeolocation();
    const { geocodeAddress, reverseGeocode } = useGeocode();
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    const isStart = label === 'start';

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
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (text.trim().length < 3) return;

            // Google Maps link
            if (isGoogleMapsLink(text)) {
                setIsLoading(true);
                if (isShortGoogleMapsUrl(text)) {
                    const coords = await resolveShortUrl(text);
                    if (coords) {
                        reverseGeocode(coords).then((address) => {
                            setInputText(address || text);
                            onChange({ ...value, address: address || text, location: coords });
                            setIsLoading(false);
                        });
                        return;
                    }
                }
                const coords = parseGoogleMapsLink(text);
                if (coords) {
                    reverseGeocode(coords).then((address) => {
                        setInputText(address || text);
                        onChange({ ...value, address: address || text, location: coords });
                        setIsLoading(false);
                    });
                    return;
                }
                setIsLoading(false);
            }

            // Raw coordinates
            const coordsParsed = parseCoordinates(text);
            if (coordsParsed) {
                setIsLoading(true);
                reverseGeocode(coordsParsed).then((address) => {
                    setInputText(address || text);
                    onChange({ ...value, address: address || text, location: coordsParsed });
                    setIsLoading(false);
                });
                return;
            }

            // Debounced geocoding
            debounceRef.current = setTimeout(async () => {
                setIsLoading(true);
                const result = await geocodeAddress(text);
                if (result) {
                    onChange({ ...value, address: result.formattedAddress, location: result.location });
                    setInputText(result.formattedAddress);
                }
                setIsLoading(false);
            }, 800);
        },
        [value, onChange, geocodeAddress, reverseGeocode]
    );

    return (
        <div>
            {/* Label */}
            <div className="flex items-center gap-2 mb-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isStart ? 'bg-success' : 'bg-primary-500'}`} />
                <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">
                    {isStart ? t('location.start', lang) : t('location.end', lang)}
                </span>
                {!isStart && <span className="text-xs text-surface-400">{t('location.endHint', lang)}</span>}
            </div>

            {/* Input */}
            <div className="relative">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={t('location.placeholder', lang)}
                    className="input"
                    dir="auto"
                />

                {/* Status indicators */}
                <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 ${lang === 'ar' ? 'left-2' : 'right-2'}`}>
                    {isLoading && <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />}
                    {value.location && !isLoading && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                    {showGPS && (
                        <button onClick={getCurrentLocation} disabled={gpsLoading} className="px-2 py-1.5 text-xs font-semibold rounded-lg bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600 transition-colors disabled:opacity-50 flex items-center gap-1">
                            {gpsLoading ? (
                                <div className="w-3 h-3 border-2 border-surface-400/30 border-t-surface-400 rounded-full animate-spin" />
                            ) : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
                            )}
                            {t('location.gps', lang)}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

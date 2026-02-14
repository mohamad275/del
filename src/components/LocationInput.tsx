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
    const labelText = isStart ? t('location.start', lang) : t('location.end', lang);

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
                let urlToParse = text;
                if (isShortGoogleMapsUrl(text)) {
                    const expanded = await resolveShortUrl(text);
                    if (expanded) urlToParse = expanded;
                }
                const coords = parseGoogleMapsLink(urlToParse);
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

            // Raw coordinates (DMS, decimal, etc.)
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

            // Regular address — debounced geocoding
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
            <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-3 h-3 rounded-full ${isStart ? 'bg-success' : 'bg-accent-500'}`} />
                <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">{labelText}</span>
                {!isStart && (
                    <span className="text-xs text-surface-400">{t('location.endHint', lang)}</span>
                )}
            </div>

            <div className="relative">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={t('location.placeholder', lang)}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all"
                    dir="auto"
                />

                <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 ${lang === 'ar' ? 'left-2' : 'right-2'}`}>
                    {isLoading && (
                        <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                    )}
                    {value.location && !isLoading && (
                        <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                    )}
                    {showGPS && (
                        <button
                            onClick={getCurrentLocation}
                            disabled={gpsLoading}
                            className="px-2 py-1.5 text-xs font-semibold rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 transition-all disabled:opacity-50 flex items-center gap-1"
                        >
                            {gpsLoading ? (
                                <div className="w-3 h-3 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
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

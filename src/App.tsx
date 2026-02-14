import { useState, useCallback, useEffect } from 'react';
import type { DeliveryStop } from './types';
import { generateId } from './utils/formatTime';
import { useRouteOptimizer } from './hooks/useRouteOptimizer';
import { useGeocode } from './hooks/useGeocode';
import { getSavedLanguage, saveLanguage, isRTL, type Language } from './i18n';
import Header from './components/Header';
import LocationInput from './components/LocationInput';
import StopList from './components/StopList';
import MapView from './components/MapView';
import RouteSummary from './components/RouteSummary';
import OptimizeButton from './components/OptimizeButton';
import SavedRoutes from './components/SavedRoutes';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

/**
 * Main application component — Single page layout.
 * Arabic-first with English toggle. Simple, clean, mobile-friendly.
 */
export default function App() {
    const [lang, setLang] = useState<Language>(getSavedLanguage);
    const [mapsLoaded, setMapsLoaded] = useState(false);
    const [showSavedRoutes, setShowSavedRoutes] = useState(false);

    // Location state
    const [startLocation, setStartLocation] = useState<DeliveryStop>({
        id: 'start',
        address: '',
        location: null,
    });
    const [endLocation, setEndLocation] = useState<DeliveryStop>({
        id: 'end',
        address: '',
        location: null,
    });
    const [stops, setStops] = useState<DeliveryStop[]>([]);

    // Optimization
    const { optimizedRoute, isOptimizing, error, optimizeRoute, clearRoute } = useRouteOptimizer();
    const { reverseGeocode } = useGeocode();

    // Language toggle
    const toggleLanguage = useCallback(() => {
        const newLang = lang === 'ar' ? 'en' : 'ar';
        setLang(newLang);
        saveLanguage(newLang);
    }, [lang]);

    // Apply RTL direction to document
    useEffect(() => {
        document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
    }, [lang]);

    // Load Google Maps API script
    useEffect(() => {
        if (window.google?.maps) {
            setMapsLoaded(true);
            return;
        }
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => setMapsLoaded(true);
        document.head.appendChild(script);
    }, []);

    /** Handle clicking on the map to add a stop */
    const handleMapClick = useCallback(
        async (lat: number, lng: number) => {
            const location = { lat, lng };
            let address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            if (mapsLoaded) {
                const resolved = await reverseGeocode(location);
                if (resolved) address = resolved;
            }
            setStops((prev) => [...prev, { id: generateId(), address, location }]);
            clearRoute();
        },
        [mapsLoaded, reverseGeocode, clearRoute]
    );

    /** Handle optimization */
    const handleOptimize = useCallback(() => {
        optimizeRoute(startLocation, stops, endLocation.location ? endLocation : null);
    }, [startLocation, stops, endLocation, optimizeRoute]);

    /** Handle navigation — open Google Maps */
    const handleNavigate = useCallback(() => {
        const routeStops = optimizedRoute?.orderedStops || [startLocation, ...stops, ...(endLocation.location ? [endLocation] : [])];
        const validStops = routeStops.filter((s) => s.location);
        if (validStops.length < 2) return;

        let url = `https://www.google.com/maps/dir`;
        validStops.forEach((s) => {
            url += `/${s.location!.lat},${s.location!.lng}`;
        });
        window.open(url, '_blank');
    }, [optimizedRoute, startLocation, stops, endLocation]);

    /** Handle loading a saved route */
    const handleLoadRoute = useCallback(
        (start: DeliveryStop, end: DeliveryStop | null, savedStops: DeliveryStop[]) => {
            setStartLocation(start);
            setEndLocation(end || { id: 'end', address: '', location: null });
            setStops(savedStops);
            clearRoute();
            setShowSavedRoutes(false);
        },
        [clearRoute]
    );

    const handleStopsChange = useCallback(
        (newStops: DeliveryStop[]) => {
            setStops(newStops);
            clearRoute();
        },
        [clearRoute]
    );

    const canOptimize = startLocation.location && stops.filter((s) => s.location).length >= 1;
    const rtl = isRTL(lang);

    return (
        <div className={`min-h-screen flex flex-col ${rtl ? 'font-arabic' : ''}`}>
            <Header
                lang={lang}
                onToggleLanguage={toggleLanguage}
                onSavedRoutesToggle={() => setShowSavedRoutes(!showSavedRoutes)}
                showSavedRoutes={showSavedRoutes}
            />

            <main className="flex-1 max-w-7xl mx-auto w-full px-3 py-3 lg:px-6 lg:py-5">
                <div className="flex flex-col lg:flex-row gap-4 h-full">
                    {/* Controls Panel */}
                    <div className="w-full lg:w-[400px] flex-shrink-0 space-y-3">
                        {/* Saved Routes */}
                        <SavedRoutes
                            lang={lang}
                            currentStart={startLocation}
                            currentEnd={endLocation}
                            currentStops={stops}
                            onLoadRoute={handleLoadRoute}
                            isVisible={showSavedRoutes}
                        />

                        {/* Start & End Locations */}
                        <div className="glass-card rounded-2xl p-4 space-y-3">
                            <LocationInput
                                lang={lang}
                                label="start"
                                value={startLocation}
                                onChange={(s) => { setStartLocation(s); clearRoute(); }}
                                showGPS
                            />

                            <div className="flex items-center gap-3 px-3">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-0.5 h-2 bg-surface-300 dark:bg-surface-600 rounded" />
                                    <div className="w-0.5 h-2 bg-surface-300 dark:bg-surface-600 rounded" />
                                    <div className="w-0.5 h-2 bg-surface-300 dark:bg-surface-600 rounded" />
                                </div>
                            </div>

                            <LocationInput
                                lang={lang}
                                label="end"
                                value={endLocation}
                                onChange={(e) => { setEndLocation(e); clearRoute(); }}
                            />
                        </div>

                        {/* Delivery Stops */}
                        <div className="glass-card rounded-2xl p-4">
                            <StopList lang={lang} stops={stops} onStopsChange={handleStopsChange} />
                        </div>

                        {/* Optimize Button */}
                        <OptimizeButton
                            lang={lang}
                            onClick={handleOptimize}
                            isOptimizing={isOptimizing}
                            disabled={!canOptimize}
                            stopCount={stops.filter((s) => s.location).length}
                        />

                        {/* Error */}
                        {error && (
                            <div className="animate-fadeInUp rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error flex items-center gap-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                {error}
                            </div>
                        )}

                        {/* Route Summary */}
                        {optimizedRoute && (
                            <RouteSummary lang={lang} route={optimizedRoute} onNavigate={handleNavigate} />
                        )}
                    </div>

                    {/* Map Panel */}
                    <div className="flex-1 min-h-[350px] lg:min-h-0 lg:sticky lg:top-16 lg:self-start lg:h-[calc(100vh-90px)]">
                        {mapsLoaded ? (
                            <MapView
                                lang={lang}
                                startLocation={startLocation}
                                endLocation={endLocation}
                                stops={stops}
                                optimizedRoute={optimizedRoute}
                                onMapClick={handleMapClick}
                            />
                        ) : (
                            <div className="w-full h-full min-h-[350px] rounded-2xl glass-card flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-10 h-10 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-3" />
                                    <p className="text-sm text-surface-400">{lang === 'ar' ? 'جاري تحميل الخريطة...' : 'Loading map...'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

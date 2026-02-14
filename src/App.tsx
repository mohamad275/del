import { useState, useCallback, useEffect } from 'react';
import type { DeliveryStop } from './types';
import { generateId } from './utils/formatTime';
import { useRouteOptimizer } from './hooks/useRouteOptimizer';
import { useGeocode } from './hooks/useGeocode';
import { getSavedLanguage, saveLanguage, isRTL, t, type Language } from './i18n';
import Header from './components/Header';
import LocationInput from './components/LocationInput';
import StopList from './components/StopList';
import MapView from './components/MapView';
import RouteSummary from './components/RouteSummary';
import OptimizeButton from './components/OptimizeButton';
import SavedRoutes from './components/SavedRoutes';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export default function App() {
    const [lang, setLang] = useState<Language>(getSavedLanguage);
    const [mapsLoaded, setMapsLoaded] = useState(false);
    const [showSavedRoutes, setShowSavedRoutes] = useState(false);

    const [startLocation, setStartLocation] = useState<DeliveryStop>({ id: 'start', address: '', location: null });
    const [endLocation, setEndLocation] = useState<DeliveryStop>({ id: 'end', address: '', location: null });
    const [stops, setStops] = useState<DeliveryStop[]>([]);

    const { optimizedRoute, isOptimizing, error, optimizeRoute, clearRoute } = useRouteOptimizer();
    const { reverseGeocode } = useGeocode();

    const toggleLanguage = useCallback(() => {
        const newLang = lang === 'ar' ? 'en' : 'ar';
        setLang(newLang);
        saveLanguage(newLang);
    }, [lang]);

    useEffect(() => {
        document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
    }, [lang]);

    useEffect(() => {
        if (window.google?.maps) { setMapsLoaded(true); return; }
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => setMapsLoaded(true);
        document.head.appendChild(script);
    }, []);

    const handleMapClick = useCallback(async (lat: number, lng: number) => {
        const location = { lat, lng };
        let address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        if (mapsLoaded) {
            const resolved = await reverseGeocode(location);
            if (resolved) address = resolved;
        }
        setStops((prev) => [...prev, { id: generateId(), address, location }]);
        clearRoute();
    }, [mapsLoaded, reverseGeocode, clearRoute]);

    const handleOptimize = useCallback(() => {
        optimizeRoute(startLocation, stops, endLocation.location ? endLocation : null);
    }, [startLocation, stops, endLocation, optimizeRoute]);

    const handleNavigate = useCallback(() => {
        const routeStops = optimizedRoute?.orderedStops || [startLocation, ...stops, ...(endLocation.location ? [endLocation] : [])];
        const validStops = routeStops.filter((s) => s.location);
        if (validStops.length < 2) return;
        let url = `https://www.google.com/maps/dir`;
        validStops.forEach((s) => { url += `/${s.location!.lat},${s.location!.lng}`; });
        window.open(url, '_blank');
    }, [optimizedRoute, startLocation, stops, endLocation]);

    const handleLoadRoute = useCallback((start: DeliveryStop, end: DeliveryStop | null, savedStops: DeliveryStop[]) => {
        setStartLocation(start);
        setEndLocation(end || { id: 'end', address: '', location: null });
        setStops(savedStops);
        clearRoute();
        setShowSavedRoutes(false);
    }, [clearRoute]);

    const handleStopsChange = useCallback((newStops: DeliveryStop[]) => { setStops(newStops); clearRoute(); }, [clearRoute]);

    const canOptimize = startLocation.location && stops.filter((s) => s.location).length >= 1;

    return (
        <div className="min-h-screen flex flex-col">
            <Header lang={lang} onToggleLanguage={toggleLanguage} onSavedRoutesToggle={() => setShowSavedRoutes(!showSavedRoutes)} showSavedRoutes={showSavedRoutes} />

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 lg:px-6">
                {/* Mobile: map first on top, controls below */}
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Controls Panel */}
                    <div className="w-full lg:w-[420px] flex-shrink-0 space-y-3">
                        {/* Saved Routes */}
                        <SavedRoutes lang={lang} currentStart={startLocation} currentEnd={endLocation} currentStops={stops} onLoadRoute={handleLoadRoute} isVisible={showSavedRoutes} />

                        {/* Start & End */}
                        <div className="card p-4 space-y-4">
                            <LocationInput lang={lang} label="start" value={startLocation} onChange={(s) => { setStartLocation(s); clearRoute(); }} showGPS />
                            <div className="flex justify-center">
                                <div className="flex flex-col items-center gap-0.5 py-1">
                                    <div className="w-[2px] h-1.5 bg-surface-200 dark:bg-surface-600 rounded-full" />
                                    <div className="w-[2px] h-1.5 bg-surface-200 dark:bg-surface-600 rounded-full" />
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                                    <div className="w-[2px] h-1.5 bg-surface-200 dark:bg-surface-600 rounded-full" />
                                    <div className="w-[2px] h-1.5 bg-surface-200 dark:bg-surface-600 rounded-full" />
                                </div>
                            </div>
                            <LocationInput lang={lang} label="end" value={endLocation} onChange={(e) => { setEndLocation(e); clearRoute(); }} />
                        </div>

                        {/* Stops */}
                        <div className="card p-4">
                            <StopList lang={lang} stops={stops} onStopsChange={handleStopsChange} />
                        </div>

                        {/* Optimize */}
                        <OptimizeButton lang={lang} onClick={handleOptimize} isOptimizing={isOptimizing} disabled={!canOptimize} stopCount={stops.filter((s) => s.location).length} />

                        {/* Error */}
                        {error && (
                            <div className="animate-fadeIn card border-error/30 bg-error/5 px-4 py-3 text-sm text-error flex items-center gap-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                {error}
                            </div>
                        )}

                        {/* Route Summary */}
                        {optimizedRoute && <RouteSummary lang={lang} route={optimizedRoute} onNavigate={handleNavigate} />}
                    </div>

                    {/* Map — below controls */}
                    <div className="flex-1 min-h-[400px]">
                        {mapsLoaded ? (
<<<<<<< HEAD
                            <MapView lang={lang} startLocation={startLocation} endLocation={endLocation} stops={stops} optimizedRoute={optimizedRoute} onMapClick={handleMapClick} />
=======
                            <MapView
                                startLocation={startLocation}
                                endLocation={endLocation}
                                stops={stops}
                                optimizedRoute={optimizedRoute}
                                onMapClick={handleMapClick}
                            />
>>>>>>> c93cec675a9c3daf11a6679a3458711a696103d9
                        ) : (
                            <div className="w-full h-full min-h-[400px] rounded-2xl card flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-3" />
                                    <p className="text-sm text-surface-400">{t('app.loadingMap', lang)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

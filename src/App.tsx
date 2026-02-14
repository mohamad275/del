import { useState, useCallback, useEffect } from 'react';
import type { DeliveryStop } from './types';
import { generateId } from './utils/formatTime';
import { useRouteOptimizer } from './hooks/useRouteOptimizer';
import { useGeocode } from './hooks/useGeocode';
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
 * Orchestrates: location inputs → stop management → optimization → map display → summary.
 */
export default function App() {
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

    // Load Google Maps API script
    useEffect(() => {
        if (window.google?.maps) {
            setMapsLoaded(true);
            return;
        }

        if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
            console.warn('Google Maps API key not set. Please set VITE_GOOGLE_MAPS_API_KEY in .env');
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => setMapsLoaded(true);
        script.onerror = () => console.error('Failed to load Google Maps');
        document.head.appendChild(script);

        return () => {
            // Script cleanup not needed since Maps loads once
        };
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

            setStops((prev) => [
                ...prev,
                {
                    id: generateId(),
                    address,
                    location,
                },
            ]);

            // Clear existing optimized route when stops change
            clearRoute();
        },
        [mapsLoaded, reverseGeocode, clearRoute]
    );

    /** Handle optimization */
    const handleOptimize = useCallback(() => {
        optimizeRoute(startLocation, stops, endLocation.location ? endLocation : null);
    }, [startLocation, stops, endLocation, optimizeRoute]);

    /** Handle navigation — open Google Maps with all waypoints */
    const handleNavigate = useCallback(() => {
        const routeStops = optimizedRoute?.orderedStops || [startLocation, ...stops, ...(endLocation.location ? [endLocation] : [])];
        const validStops = routeStops.filter((s) => s.location);

        if (validStops.length < 2) return;

        const origin = `${validStops[0].location!.lat},${validStops[0].location!.lng}`;
        const destination = `${validStops[validStops.length - 1].location!.lat},${validStops[validStops.length - 1].location!.lng}`;
        const waypoints = validStops
            .slice(1, -1)
            .map((s) => `${s.location!.lat},${s.location!.lng}`)
            .join('|');

        let url = `https://www.google.com/maps/dir/${origin}`;
        if (waypoints) {
            const waypointCoords = validStops
                .slice(1, -1)
                .map((s) => `${s.location!.lat},${s.location!.lng}`);
            waypointCoords.forEach((wp) => {
                url += `/${wp}`;
            });
        }
        url += `/${destination}`;

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

    /** When stops change, clear existing optimization */
    const handleStopsChange = useCallback(
        (newStops: DeliveryStop[]) => {
            setStops(newStops);
            clearRoute();
        },
        [clearRoute]
    );

    const canOptimize = startLocation.location && stops.filter((s) => s.location).length >= 1;

    return (
        <div className="min-h-screen flex flex-col">
            <Header
                onSavedRoutesToggle={() => setShowSavedRoutes(!showSavedRoutes)}
                showSavedRoutes={showSavedRoutes}
            />

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 lg:py-6">
                <div className="flex flex-col lg:flex-row gap-5 h-full">
                    {/* Left Panel — Controls */}
                    <div className="w-full lg:w-[420px] flex-shrink-0 space-y-4">
                        {/* Saved Routes Panel */}
                        <SavedRoutes
                            currentStart={startLocation}
                            currentEnd={endLocation}
                            currentStops={stops}
                            onLoadRoute={handleLoadRoute}
                            isVisible={showSavedRoutes}
                        />

                        {/* Start Location */}
                        <div className="glass-card rounded-2xl p-4 space-y-4">
                            <LocationInput
                                label="Start Location"
                                icon="start"
                                value={startLocation}
                                onChange={(s) => { setStartLocation(s); clearRoute(); }}
                                showGPS
                            />

                            {/* Divider with connector */}
                            <div className="flex items-center gap-3 px-4">
                                <div className="flex flex-col items-center gap-0.5">
                                    <div className="w-0.5 h-3 bg-surface-200 dark:bg-surface-700" />
                                    <div className="w-0.5 h-3 bg-surface-200 dark:bg-surface-700" />
                                    <div className="w-0.5 h-3 bg-surface-200 dark:bg-surface-700" />
                                </div>
                                <div className="flex-1 border-t border-dashed border-surface-200 dark:border-surface-700" />
                            </div>

                            {/* End Location */}
                            <LocationInput
                                label="End Location"
                                sublabel="(same as start if empty)"
                                icon="end"
                                value={endLocation}
                                onChange={(e) => { setEndLocation(e); clearRoute(); }}
                                optional
                            />
                        </div>

                        {/* Delivery Stops */}
                        <div className="glass-card rounded-2xl p-4">
                            <StopList stops={stops} onStopsChange={handleStopsChange} />
                        </div>

                        {/* Optimize Button */}
                        <OptimizeButton
                            onClick={handleOptimize}
                            isOptimizing={isOptimizing}
                            disabled={!canOptimize}
                            stopCount={stops.filter((s) => s.location).length}
                        />

                        {/* Error message */}
                        {error && (
                            <div className="animate-fadeInUp rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-sm text-error flex items-center gap-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* Route Summary */}
                        {optimizedRoute && (
                            <RouteSummary route={optimizedRoute} onNavigate={handleNavigate} />
                        )}
                    </div>

                    {/* Right Panel — Map */}
                    <div className="flex-1 min-h-[400px] lg:min-h-0 lg:sticky lg:top-20 lg:self-start lg:h-[calc(100vh-100px)]">
                        {mapsLoaded ? (
                            <MapView
                                startLocation={startLocation}
                                endLocation={endLocation}
                                stops={stops}
                                optimizedRoute={optimizedRoute}
                                onMapClick={handleMapClick}
                            />
                        ) : (
                            <div className="w-full h-full min-h-[400px] rounded-2xl glass-card flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-12 h-12 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
                                    <p className="text-sm text-surface-500 dark:text-surface-400 font-medium">
                                        Loading Google Maps...
                                    </p>
                                    {(!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') && (
                                        <p className="text-xs text-warning mt-2 max-w-xs mx-auto">
                                            Set your API key in <code className="bg-surface-200 dark:bg-surface-700 px-1.5 py-0.5 rounded text-xs">.env</code> file
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-4 text-center text-xs text-surface-400 dark:text-surface-600">
                RouteFlow — Delivery Route Optimizer · Built for speed
            </footer>
        </div>
    );
}

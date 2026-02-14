import { useEffect, useRef, useState } from 'react';
import type { DeliveryStop, OptimizedRoute } from '../types';

interface MapViewProps {
    startLocation: DeliveryStop;
    endLocation: DeliveryStop | null;
    stops: DeliveryStop[];
    optimizedRoute: OptimizedRoute | null;
    onMapClick: (lat: number, lng: number) => void;
}

/**
 * Interactive Google Map component showing markers for all stops,
 * route polyline, and supporting click-to-add.
 */
export default function MapView({
    startLocation,
    endLocation,
    stops,
    optimizedRoute,
    onMapClick,
}: MapViewProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const polylineRef = useRef<google.maps.Polyline | null>(null);
    const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
    const [mapReady, setMapReady] = useState(false);

    // Initialize map
    useEffect(() => {
        if (!mapRef.current || !window.google?.maps) return;

        const map = new google.maps.Map(mapRef.current, {
            center: { lat: 25.2048, lng: 55.2708 }, // Default: Dubai
            zoom: 12,
            styles: getMapStyles(),
            disableDefaultUI: true,
            zoomControl: true,
            fullscreenControl: true,
            gestureHandling: 'greedy',
            mapTypeControl: false,
            streetViewControl: false,
        });

        map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
                onMapClick(e.latLng.lat(), e.latLng.lng());
            }
        });

        // DirectionsRenderer for showing routes
        const renderer = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#6366f1',
                strokeWeight: 5,
                strokeOpacity: 0.8,
            },
        });

        mapInstanceRef.current = map;
        directionsRendererRef.current = renderer;
        setMapReady(true);

        return () => {
            markersRef.current.forEach((m) => m.setMap(null));
            polylineRef.current?.setMap(null);
            renderer.setMap(null);
        };
    }, []);

    // Update markers whenever stops change
    useEffect(() => {
        if (!mapInstanceRef.current || !mapReady) return;
        const map = mapInstanceRef.current;

        // Clear existing markers
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];

        const bounds = new google.maps.LatLngBounds();
        let hasValidBound = false;

        // All points to display
        const displayStops = optimizedRoute ? optimizedRoute.orderedStops : [startLocation, ...stops, ...(endLocation?.location ? [endLocation] : [])];

        displayStops.forEach((stop, index) => {
            if (!stop.location) return;

            const isStart = index === 0;
            const isEnd = index === displayStops.length - 1 && endLocation?.location;
            let label = '';
            let color = '#6366f1'; // primary

            if (isStart) {
                label = 'S';
                color = '#10b981'; // green
            } else if (isEnd) {
                label = 'E';
                color = '#f97316'; // orange
            } else {
                // Number the intermediate stops
                label = String(isStart ? 'S' : (optimizedRoute ? index : index));
                color = '#6366f1';
            }

            const marker = new google.maps.Marker({
                position: stop.location,
                map,
                label: {
                    text: isStart ? 'S' : isEnd ? 'E' : String(index),
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '12px',
                },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: color,
                    fillOpacity: 1,
                    strokeColor: 'white',
                    strokeWeight: 2.5,
                    scale: 16,
                },
                title: stop.address,
                zIndex: isStart ? 100 : 50,
            });

            markersRef.current.push(marker);
            bounds.extend(stop.location);
            hasValidBound = true;
        });

        if (hasValidBound) {
            map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
            // Don't zoom in too much for single markers
            const listener = google.maps.event.addListener(map, 'idle', () => {
                if (map.getZoom()! > 16) map.setZoom(16);
                google.maps.event.removeListener(listener);
            });
        }
    }, [stops, startLocation, endLocation, optimizedRoute, mapReady]);

    // Display optimized route directions
    useEffect(() => {
        if (!directionsRendererRef.current || !mapReady) return;

        if (optimizedRoute && optimizedRoute.orderedStops.length >= 2) {
            // Rebuild directions request
            const waypoints = optimizedRoute.orderedStops.filter(s => s.location);
            if (waypoints.length < 2) return;

            const origin = waypoints[0].location!;
            const destination = waypoints[waypoints.length - 1].location!;
            const intermediateWaypoints = waypoints.slice(1, -1).map(s => ({
                location: new google.maps.LatLng(s.location!.lat, s.location!.lng),
                stopover: true
            }));

            const service = new google.maps.DirectionsService();
            service.route({
                origin: new google.maps.LatLng(origin.lat, origin.lng),
                destination: new google.maps.LatLng(destination.lat, destination.lng),
                waypoints: intermediateWaypoints,
                optimizeWaypoints: false,
                travelMode: google.maps.TravelMode.DRIVING,
            }, (result, status) => {
                if (status === 'OK' && result) {
                    directionsRendererRef.current!.setDirections(result);
                }
            });
        } else {
            directionsRendererRef.current.setDirections({ routes: [] } as any);
        }
    }, [optimizedRoute, mapReady]);

    return (
        <div className="map-container relative w-full h-full min-h-[300px]">
            <div ref={mapRef} className="w-full h-full" />

            {/* Map loading placeholder */}
            {!mapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-100 dark:bg-surface-800 rounded-2xl">
                    <div className="text-center">
                        <div className="w-10 h-10 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-surface-400">Loading map...</p>
                    </div>
                </div>
            )}

            {/* Click instruction overlay */}
            <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg glass-card text-xs text-surface-500 dark:text-surface-400 pointer-events-none">
                Click on map to add a stop
            </div>
        </div>
    );
}

/**
 * Clean, minimal map styles for a premium look.
 */
function getMapStyles(): google.maps.MapTypeStyle[] {
    return [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9d6ff' }] },
        { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f0f4f8' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e2e8f0' }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#fbbf24' }, { lightness: 40 }] },
    ];
}

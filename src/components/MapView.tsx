import { useEffect, useRef, useState } from 'react';
import type { DeliveryStop, OptimizedRoute } from '../types';
import { t, type Language } from '../i18n';

interface MapViewProps {
    lang: Language;
    startLocation: DeliveryStop;
    endLocation: DeliveryStop | null;
    stops: DeliveryStop[];
    optimizedRoute: OptimizedRoute | null;
    onMapClick: (lat: number, lng: number) => void;
}

export default function MapView({ lang, startLocation, endLocation, stops, optimizedRoute, onMapClick }: MapViewProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
    const [mapReady, setMapReady] = useState(false);

    // Initialize map
    useEffect(() => {
        if (!mapRef.current || !window.google?.maps) return;

        const map = new google.maps.Map(mapRef.current, {
            center: { lat: 25.2048, lng: 55.2708 },
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
            if (e.latLng) onMapClick(e.latLng.lat(), e.latLng.lng());
        });

        const renderer = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: { strokeColor: '#3b82f6', strokeWeight: 5, strokeOpacity: 0.85 },
        });

        mapInstanceRef.current = map;
        directionsRendererRef.current = renderer;
        setMapReady(true);

        return () => {
            markersRef.current.forEach((m) => m.setMap(null));
            renderer.setMap(null);
        };
    }, []);

    // Update markers
    useEffect(() => {
        if (!mapInstanceRef.current || !mapReady) return;
        const map = mapInstanceRef.current;

        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];

        const bounds = new google.maps.LatLngBounds();
        let hasValidBound = false;

        const displayStops = optimizedRoute ? optimizedRoute.orderedStops : [startLocation, ...stops, ...(endLocation?.location ? [endLocation] : [])];

        displayStops.forEach((stop, index) => {
            if (!stop.location) return;

            const isStart = index === 0;
            const isEnd = index === displayStops.length - 1 && endLocation?.location;
            let color = '#3b82f6';
            if (isStart) color = '#10b981';
            else if (isEnd) color = '#f97316';

            const marker = new google.maps.Marker({
                position: stop.location,
                map,
                label: { text: isStart ? 'S' : isEnd ? 'E' : String(index), color: 'white', fontWeight: 'bold', fontSize: '12px' },
                icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: color, fillOpacity: 1, strokeColor: 'white', strokeWeight: 2.5, scale: 15 },
                title: stop.address,
                zIndex: isStart ? 100 : 50,
            });

            markersRef.current.push(marker);
            bounds.extend(stop.location);
            hasValidBound = true;
        });

        if (hasValidBound) {
            map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
            const listener = google.maps.event.addListener(map, 'idle', () => {
                if (map.getZoom()! > 16) map.setZoom(16);
                google.maps.event.removeListener(listener);
            });
        }
    }, [stops, startLocation, endLocation, optimizedRoute, mapReady]);

    // Display route
    useEffect(() => {
        if (!directionsRendererRef.current || !mapReady) return;
        if (optimizedRoute && optimizedRoute.orderedStops.length >= 2) {
            const waypoints = optimizedRoute.orderedStops.filter(s => s.location);
            if (waypoints.length < 2) return;
            const origin = waypoints[0].location!;
            const destination = waypoints[waypoints.length - 1].location!;
            const intermediateWaypoints = waypoints.slice(1, -1).map(s => ({
                location: new google.maps.LatLng(s.location!.lat, s.location!.lng), stopover: true
            }));

            new google.maps.DirectionsService().route({
                origin: new google.maps.LatLng(origin.lat, origin.lng),
                destination: new google.maps.LatLng(destination.lat, destination.lng),
                waypoints: intermediateWaypoints,
                optimizeWaypoints: false,
                travelMode: google.maps.TravelMode.DRIVING,
            }, (result, status) => {
                if (status === 'OK' && result) directionsRendererRef.current!.setDirections(result);
            });
        } else {
            directionsRendererRef.current.setDirections({ routes: [] } as any);
        }
    }, [optimizedRoute, mapReady]);

    return (
        <div className="map-container relative w-full h-full min-h-[280px]">
            <div ref={mapRef} className="w-full h-full" />
            {!mapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-50 dark:bg-surface-800 rounded-2xl">
                    <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                </div>
            )}
            <div className="absolute bottom-3 start-3 px-3 py-1.5 rounded-lg bg-white/90 dark:bg-surface-800/90 text-xs text-surface-500 pointer-events-none backdrop-blur-sm">
                {t('app.mapClickHint', lang)}
            </div>
        </div>
    );
}

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

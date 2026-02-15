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

            const sequenceLabel = isStart ? 'S' : isEnd ? 'E' : String(index);
            const orderNum = stop.orderNumber ? `#${stop.orderNumber}` : '';

            const svgIcon = createMarkerSVG(sequenceLabel, orderNum, color);

            const marker = new google.maps.Marker({
                position: stop.location,
                map,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon),
                    scaledSize: orderNum
                        ? new google.maps.Size(56, 68)
                        : new google.maps.Size(36, 44),
                    anchor: orderNum
                        ? new google.maps.Point(28, 68)
                        : new google.maps.Point(18, 44),
                },
                title: stop.orderNumber ? `#${stop.orderNumber} — ${stop.address}` : stop.address,
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

/**
 * Generate an SVG marker icon as a string.
 * Shows a pin with the sequence number, and optionally an order number tag below.
 */
function createMarkerSVG(sequence: string, orderNumber: string, color: string): string {
    if (orderNumber) {
        // Pin with order number tag — taller SVG
        return `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="68" viewBox="0 0 56 68">
  <defs>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- Pin body -->
  <path d="M28 42 L22 32 A14 14 0 1 1 34 32 Z" fill="${color}" stroke="white" stroke-width="2" filter="url(#s)"/>
  <!-- Sequence circle -->
  <circle cx="28" cy="18" r="12" fill="${color}" stroke="white" stroke-width="2"/>
  <text x="28" y="23" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-weight="bold" font-size="13">${sequence}</text>
  <!-- Order number tag -->
  <rect x="4" y="46" width="48" height="18" rx="9" fill="white" stroke="${color}" stroke-width="1.5" filter="url(#s)"/>
  <text x="28" y="59" text-anchor="middle" fill="${color}" font-family="Arial,sans-serif" font-weight="bold" font-size="10">${orderNumber}</text>
</svg>`;
    }

    // Simple pin without order number
    return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
  <defs>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.25"/>
    </filter>
  </defs>
  <path d="M18 38 L12 28 A12 12 0 1 1 24 28 Z" fill="${color}" stroke="white" stroke-width="2" filter="url(#s)"/>
  <circle cx="18" cy="16" r="10" fill="${color}" stroke="white" stroke-width="2"/>
  <text x="18" y="20.5" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-weight="bold" font-size="12">${sequence}</text>
</svg>`;
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

import { useEffect, useRef, useState } from 'react';
import type { OptimizedRoute, GPSPosition, NavigationState } from '../types';
import { t, type Language } from '../i18n';
import TurnInstructions from './TurnInstructions';
import NextStopCard from './NextStopCard';
import SpeedIndicator from './SpeedIndicator';

interface NavigationViewProps {
    lang: Language;
    optimizedRoute: OptimizedRoute;
    gpsPosition: GPSPosition | null;
    navState: NavigationState;
    voiceEnabled: boolean;
    directionsResult: google.maps.DirectionsResult | null;
    onDelivered: () => void;
    onSkip: () => void;
    onExit: () => void;
    onToggleVoice: () => void;
}

export default function NavigationView({
    lang,
    optimizedRoute,
    gpsPosition,
    navState,
    voiceEnabled,
    directionsResult,
    onDelivered,
    onSkip,
    onExit,
    onToggleVoice,
}: NavigationViewProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const driverMarkerRef = useRef<google.maps.Marker | null>(null);
    const stopMarkersRef = useRef<google.maps.Marker[]>([]);
    const routePolylinesRef = useRef<google.maps.Polyline[]>([]);
    const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
    const isFollowingRef = useRef(true);
    const [showTraffic, setShowTraffic] = useState(true);

    // ===== Initialize Map (Google Maps Navigation style) =====
    useEffect(() => {
        if (!mapRef.current || !window.google?.maps) return;

        const center = gpsPosition
            ? { lat: gpsPosition.lat, lng: gpsPosition.lng }
            : optimizedRoute.orderedStops[0]?.location || { lat: 25.2048, lng: 55.2708 };

        // Google Maps Navigation-style map
        const map = new google.maps.Map(mapRef.current, {
            center,
            zoom: 18,
            tilt: 60, // Google Maps uses ~60° tilt in navigation
            heading: gpsPosition?.heading || 0,
            mapId: undefined,
            styles: getGoogleMapsNavStyles(),
            disableDefaultUI: true,
            zoomControl: false,
            fullscreenControl: false,
            gestureHandling: 'greedy',
            mapTypeControl: false,
            streetViewControl: false,
            clickableIcons: false, // No POI clicks like GMaps nav
        });

        // Live traffic layer (exactly like Google Maps)
        const trafficLayer = new google.maps.TrafficLayer();
        trafficLayer.setMap(map);
        trafficLayerRef.current = trafficLayer;

        // Stop following when user drags (like Google Maps)
        map.addListener('dragstart', () => { isFollowingRef.current = false; });

        mapInstanceRef.current = map;

        return () => {
            stopMarkersRef.current.forEach(m => m.setMap(null));
            routePolylinesRef.current.forEach(p => p.setMap(null));
            driverMarkerRef.current?.setMap(null);
            trafficLayer.setMap(null);
        };
    }, []);

    // ===== Render Route (Google Maps style - thick blue with dark outline + traffic colors) =====
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !directionsResult) return;

        // Clear old polylines
        routePolylinesRef.current.forEach(p => p.setMap(null));
        routePolylinesRef.current = [];

        const route = directionsResult.routes[0];
        if (!route) return;

        // Get the overview path
        const overviewPath = route.overview_path;

        // === 1. Route outline (dark gray shadow — like Google Maps) ===
        const outlinePolyline = new google.maps.Polyline({
            path: overviewPath,
            strokeColor: '#1a3a5c',
            strokeOpacity: 0.6,
            strokeWeight: 10,
            map,
            zIndex: 1,
        });
        routePolylinesRef.current.push(outlinePolyline);

        // === 2. Main route (bright blue — Google Maps style) ===
        const mainPolyline = new google.maps.Polyline({
            path: overviewPath,
            strokeColor: '#4285F4',  // Google blue
            strokeOpacity: 1.0,
            strokeWeight: 7,
            map,
            zIndex: 2,
        });
        routePolylinesRef.current.push(mainPolyline);

        // === 3. Traffic-colored segments on route (green/orange/red like Google Maps) ===
        // Extract per-leg traffic data from Directions API
        for (const leg of route.legs) {
            for (const step of leg.steps) {
                if (!step.path || step.path.length < 2) continue;

                // Google returns duration_in_traffic vs duration — use ratio for color
                const durationVal = step.duration?.value || 1;
                const distanceVal = step.distance?.value || 1;
                const speedKmh = (distanceVal / durationVal) * 3.6;

                let trafficColor: string;
                let trafficOpacity: number;
                if (speedKmh > 60) {
                    continue; // Don't overlay green on blue, it's already clear
                } else if (speedKmh > 30) {
                    trafficColor = '#FBBC04'; // Yellow — moderate traffic (Google Maps style)
                    trafficOpacity = 0.85;
                } else if (speedKmh > 15) {
                    trafficColor = '#EA4335'; // Red — heavy traffic (Google Maps style)
                    trafficOpacity = 0.9;
                } else {
                    trafficColor = '#B71C1C'; // Dark red — severe traffic
                    trafficOpacity = 0.95;
                }

                const trafficPolyline = new google.maps.Polyline({
                    path: step.path,
                    strokeColor: trafficColor,
                    strokeOpacity: trafficOpacity,
                    strokeWeight: 7,
                    map,
                    zIndex: 3,
                });
                routePolylinesRef.current.push(trafficPolyline);
            }
        }

        // === 4. Traveled portion (grayed out — like Google Maps) ===
        // This gets updated in the GPS update effect

    }, [directionsResult]);

    // ===== Update Stop Markers =====
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        stopMarkersRef.current.forEach(m => m.setMap(null));
        stopMarkersRef.current = [];

        optimizedRoute.orderedStops.forEach((stop, index) => {
            if (!stop.location) return;

            const status = navState.stopStatuses[index];
            const isDelivered = status === 'delivered';
            const isSkipped = status === 'skipped';
            const isCurrent = status === 'current';
            const isStart = index === 0;

            // Google Maps uses red pins for destinations, green for start
            let color: string;
            if (isStart) color = '#0F9D58'; // Google green
            else if (isDelivered) color = '#9E9E9E'; // Gray
            else if (isSkipped) color = '#BDBDBD'; // Light gray
            else if (isCurrent) color = '#EA4335'; // Google red — active destination
            else color = '#4285F4'; // Google blue — upcoming

            const orderNum = stop.orderNumber ? `#${stop.orderNumber}` : '';
            const label = isStart ? 'S' : isDelivered ? '✓' : isSkipped ? '—' : String(index);
            const svgIcon = createGoogleStyleMarker(label, orderNum, color, isCurrent);

            const marker = new google.maps.Marker({
                position: stop.location,
                map,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon),
                    scaledSize: isCurrent
                        ? new google.maps.Size(56, 70)
                        : new google.maps.Size(44, 56),
                    anchor: isCurrent
                        ? new google.maps.Point(28, 70)
                        : new google.maps.Point(22, 56),
                },
                title: stop.orderNumber ? `#${stop.orderNumber} — ${stop.address}` : stop.address,
                zIndex: isCurrent ? 100 : isStart ? 90 : isDelivered ? 10 : 50,
                opacity: isDelivered || isSkipped ? 0.5 : 1,
            });

            stopMarkersRef.current.push(marker);
        });
    }, [optimizedRoute, navState.stopStatuses]);

    // ===== Update Driver Position (Google Maps blue chevron + auto-follow) =====
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !gpsPosition) return;

        const pos = { lat: gpsPosition.lat, lng: gpsPosition.lng };

        if (!driverMarkerRef.current) {
            driverMarkerRef.current = new google.maps.Marker({
                position: pos,
                map,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(createGoogleNavArrow(gpsPosition.heading)),
                    scaledSize: new google.maps.Size(48, 48),
                    anchor: new google.maps.Point(24, 24),
                },
                zIndex: 999,
            });
        } else {
            // Smooth position update
            driverMarkerRef.current.setPosition(pos);
            driverMarkerRef.current.setIcon({
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(createGoogleNavArrow(gpsPosition.heading)),
                scaledSize: new google.maps.Size(48, 48),
                anchor: new google.maps.Point(24, 24),
            });
        }

        // Auto-follow like Google Maps: rotate map, keep driver centered
        if (isFollowingRef.current) {
            map.panTo(pos);
            // Rotate map with driver heading (exactly like Google Maps navigation)
            if (gpsPosition.heading > 0 && gpsPosition.speed > 3) {
                map.setHeading(gpsPosition.heading);
            }
        }
    }, [gpsPosition]);

    // ===== Toggle Traffic Layer =====
    const handleToggleTraffic = () => {
        const layer = trafficLayerRef.current;
        if (!layer) return;
        if (showTraffic) {
            layer.setMap(null);
        } else {
            layer.setMap(mapInstanceRef.current);
        }
        setShowTraffic(!showTraffic);
    };

    // ===== Recenter (like Google Maps recenter button) =====
    const handleRecenter = () => {
        const map = mapInstanceRef.current;
        if (!map || !gpsPosition) return;
        isFollowingRef.current = true;
        map.panTo({ lat: gpsPosition.lat, lng: gpsPosition.lng });
        map.setZoom(18);
        map.setTilt(60);
        if (gpsPosition.heading > 0) {
            map.setHeading(gpsPosition.heading);
        }
    };

    const currentStop = optimizedRoute.orderedStops[navState.currentStopIndex];

    return (
        <div className="nav-fullscreen">
            {/* Map */}
            <div ref={mapRef} className="nav-map" />

            {/* Top: Turn Instructions */}
            <div className="nav-top-overlay">
                <TurnInstructions
                    currentStep={navState.currentStep}
                    nextStep={navState.nextStep}
                />
            </div>

            {/* Top-right: Controls (Google Maps style) */}
            <div className="nav-controls-top">
                {/* Mute/Unmute */}
                <button onClick={onToggleVoice} className="nav-control-btn" title={voiceEnabled ? (lang === 'ar' ? 'كتم الصوت' : 'Mute') : (lang === 'ar' ? 'تفعيل الصوت' : 'Unmute')}>
                    {voiceEnabled ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
                        </svg>
                    )}
                </button>
                {/* Traffic toggle */}
                <button onClick={handleToggleTraffic} className={`nav-control-btn ${showTraffic ? 'nav-control-btn--active' : ''}`} title={lang === 'ar' ? 'حركة المرور' : 'Traffic'}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="6" y="2" width="12" height="20" rx="3" />
                        <circle cx="12" cy="7" r="1.5" fill={showTraffic ? '#EA4335' : 'currentColor'} />
                        <circle cx="12" cy="12" r="1.5" fill={showTraffic ? '#FBBC04' : 'currentColor'} />
                        <circle cx="12" cy="17" r="1.5" fill={showTraffic ? '#0F9D58' : 'currentColor'} />
                    </svg>
                </button>
                {/* Exit */}
                <button onClick={onExit} className="nav-control-btn nav-control-btn--exit" title={t('nav.exit', lang)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Recenter button (Google Maps style compass/recenter) */}
            <button
                onClick={handleRecenter}
                className="nav-control-btn"
                style={{ position: 'absolute', right: '16px', bottom: '240px', zIndex: 20 }}
                title={lang === 'ar' ? 'إعادة التوسيط' : 'Re-center'}
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" fill="#4285F4" stroke="none" />
                    <circle cx="12" cy="12" r="8" />
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                </svg>
            </button>

            {/* ETA bar (Google Maps style - just above bottom card) */}
            {navState.isActive && (
                <div style={{
                    position: 'absolute',
                    bottom: '200px',
                    left: '16px',
                    zIndex: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                }}>
                    <SpeedIndicator speed={gpsPosition?.speed || 0} />
                    {/* Remaining distance chip */}
                    <div style={{
                        background: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        letterSpacing: '0.3px',
                        backdropFilter: 'blur(8px)',
                        textAlign: 'center',
                    }}>
                        {navState.totalRemainingDistance}
                    </div>
                </div>
            )}

            {/* Off-route warning (Google Maps red bar style) */}
            {navState.isOffRoute && (
                <div className="nav-offroute-banner">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {t('nav.offRoute', lang)}
                </div>
            )}

            {/* Bottom: Next Stop Card */}
            {currentStop && (
                <div className="nav-bottom-overlay">
                    <NextStopCard
                        lang={lang}
                        stop={currentStop}
                        stopIndex={navState.currentStopIndex}
                        totalStops={navState.totalStops}
                        completedStops={navState.completedStops}
                        stopStatuses={navState.stopStatuses}
                        distance={navState.distanceToNextStop}
                        eta={navState.etaToNextStop}
                        isNearStop={navState.isNearStop}
                        onDelivered={onDelivered}
                        onSkip={onSkip}
                    />
                </div>
            )}

            {/* All delivered overlay */}
            {!navState.isActive && navState.completedStops > 0 && (
                <div className="nav-completed-overlay">
                    <div className="nav-completed-card">
                        <div className="text-5xl mb-3">🎉</div>
                        <h2 className="text-xl font-bold text-surface-800 dark:text-white mb-1">{t('nav.allDone', lang)}</h2>
                        <p className="text-sm text-surface-500 mb-4">
                            {t('nav.deliveredCount', lang).replace('{n}', String(navState.completedStops))}
                        </p>
                        <button onClick={onExit} className="btn-primary px-8 py-3 text-sm">
                            {t('nav.backToPlanner', lang)}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ===== Google Maps Navigation Style Markers =====

function createGoogleStyleMarker(label: string, orderNum: string, color: string, isCurrent: boolean): string {
    const size = isCurrent ? 56 : 44;
    const pinH = isCurrent ? 70 : 56;
    const cx = size / 2;
    const r = size * 0.36;
    const pinY = pinH - 6;
    const fontSize = isCurrent ? 14 : 11;

    // Pulsing glow for current stop
    const glow = isCurrent ? `
    <circle cx="${cx}" cy="${cx}" r="${r + 8}" fill="${color}" opacity="0.15">
      <animate attributeName="r" values="${r + 4};${r + 10};${r + 4}" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.2;0.06;0.2" dur="2s" repeatCount="indefinite"/>
    </circle>` : '';

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${pinH}" viewBox="0 0 ${size} ${pinH}">
  <defs><filter id="ds" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.35"/></filter></defs>
  ${glow}
  <path d="M${cx} ${pinY} L${cx - 6} ${cx + r * 0.5} A${r} ${r} 0 1 1 ${cx + 6} ${cx + r * 0.5} Z" fill="${color}" filter="url(#ds)"/>
  <circle cx="${cx}" cy="${cx}" r="${r}" fill="${color}" stroke="white" stroke-width="2.5"/>
  <text x="${cx}" y="${cx + fontSize * 0.35}" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-weight="bold" font-size="${fontSize}">${label}</text>`;

    if (orderNum) {
        svg += `
  <rect x="${cx - 20}" y="${pinH - 14}" width="40" height="14" rx="7" fill="white" stroke="${color}" stroke-width="1" filter="url(#ds)"/>
  <text x="${cx}" y="${pinH - 4}" text-anchor="middle" fill="${color}" font-family="Arial,sans-serif" font-weight="bold" font-size="8">${orderNum}</text>`;
    }

    svg += `\n</svg>`;
    return svg;
}

// ===== Google Maps Navigation Arrow (Blue chevron/arrow) =====
function createGoogleNavArrow(heading: number): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <defs>
    <filter id="navGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <!-- Accuracy circle -->
  <circle cx="24" cy="24" r="22" fill="#4285F4" opacity="0.08">
    <animate attributeName="r" values="18;22;18" dur="3s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.12;0.04;0.12" dur="3s" repeatCount="indefinite"/>
  </circle>
  <!-- Beam/cone showing direction (like Google Maps) -->
  <g transform="rotate(${heading}, 24, 24)">
    <path d="M24,4 L14,22 Q24,18 34,22 Z" fill="#4285F4" opacity="0.15"/>
  </g>
  <!-- Outer blue ring -->
  <circle cx="24" cy="24" r="14" fill="#4285F4" opacity="0.2"/>
  <!-- Main dot -->
  <circle cx="24" cy="24" r="9" fill="#4285F4" stroke="white" stroke-width="3.5" filter="url(#navGlow)"/>
  <!-- Direction chevron -->
  <g transform="rotate(${heading}, 24, 24)">
    <polygon points="24,6 18,16 24,13 30,16" fill="white" opacity="0.95"/>
  </g>
</svg>`;
}

// ===== Google Maps Navigation Dark Mode Styles =====
// Matches Google Maps navigation mode: dark roads, muted background, clear labels
function getGoogleMapsNavStyles(): google.maps.MapTypeStyle[] {
    return [
        // Background
        { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },

        // Land
        { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#1d3d5c' }] },

        // Water
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
        { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },

        // Roads — clear and prominent like Google Maps nav
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
        { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#255b78' }] },
        { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
        { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },

        // Highways — prominent yellow-orange like Google Maps
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
        { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#255b78' }] },
        { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0d5ce' }] },

        // Arterial roads
        { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#36576e' }] },
        { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#264a60' }] },

        // Hide POIs and transit (clean map like navigation mode)
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },

        // Admin boundaries
        { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
        { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
    ];
}

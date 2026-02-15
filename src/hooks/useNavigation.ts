import { useState, useCallback, useRef, useEffect } from 'react';
import type { OptimizedRoute, GPSPosition, NavigationState, NavigationStep, StopStatus } from '../types';
import type { Language } from '../i18n';

const NEAR_STOP_THRESHOLD = 50;     // meters — triggers "Delivered?" prompt
const OFF_ROUTE_THRESHOLD = 150;    // meters — triggers recalculate

/**
 * Core navigation engine hook.
 * Takes an optimized route + live GPS position and produces full navigation state.
 */
export function useNavigation(
    optimizedRoute: OptimizedRoute | null,
    gpsPosition: GPSPosition | null,
    mapsLoaded: boolean,
    lang: Language = 'ar'
) {
    const [navState, setNavState] = useState<NavigationState>(getInitialState());
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const directionsRef = useRef<google.maps.DirectionsResult | null>(null);
    const stepsRef = useRef<NavigationStep[]>([]);
    const lastSpokenStepRef = useRef(-1);
    const isActiveRef = useRef(false);

    // ===== Start Navigation =====
    const startNavigation = useCallback(async () => {
        if (!optimizedRoute || !mapsLoaded) return;
        if (optimizedRoute.orderedStops.length < 2) return;

        const stops = optimizedRoute.orderedStops;
        const statuses: StopStatus[] = stops.map((_, i) =>
            i === 0 ? 'delivered' : i === 1 ? 'current' : 'pending'
        );

        // Fetch directions for the full route (with language for Arabic instructions)
        const directions = await fetchDirections(stops, lang);
        if (!directions) return;

        directionsRef.current = directions;

        // Extract turn-by-turn steps from the first leg
        const allSteps = extractAllSteps(directions);
        stepsRef.current = allSteps;

        isActiveRef.current = true;
        lastSpokenStepRef.current = -1;

        setNavState({
            isActive: true,
            currentStopIndex: 1,
            stopStatuses: statuses,
            currentStep: allSteps[0] || null,
            nextStep: allSteps[1] || null,
            allSteps,
            currentStepIndex: 0,
            distanceToNextStop: optimizedRoute.legs[0]?.distanceValue || 0,
            etaToNextStop: optimizedRoute.legs[0]?.duration || '',
            totalRemainingDistance: optimizedRoute.totalDistance,
            totalRemainingTime: optimizedRoute.totalDuration,
            isOffRoute: false,
            isRecalculating: false,
            isNearStop: false,
            completedStops: 0,
            totalStops: stops.length - 1, // exclude start
        });

        speak(
            lang === 'ar' ? 'بدأت الملاحة. توجه إلى أول نقطة توصيل.' : 'Navigation started. Head to your first delivery stop.',
            voiceEnabled, lang
        );
    }, [optimizedRoute, mapsLoaded, voiceEnabled, lang]);

    // ===== Update navigation state on GPS change =====
    useEffect(() => {
        if (!isActiveRef.current || !gpsPosition || !optimizedRoute) return;

        setNavState(prev => {
            if (!prev.isActive) return prev;

            const stops = optimizedRoute.orderedStops;
            const currentStop = stops[prev.currentStopIndex];
            if (!currentStop?.location) return prev;

            // Distance to current target stop
            const distToStop = haversineDistance(
                gpsPosition.lat, gpsPosition.lng,
                currentStop.location.lat, currentStop.location.lng
            );

            const isNearStop = distToStop < NEAR_STOP_THRESHOLD;

            // Check off-route (simplified: distance to current stop vs expected)
            const isOffRoute = !prev.isRecalculating && distToStop > OFF_ROUTE_THRESHOLD * 3;

            // Calculate ETA based on speed
            const speedMs = (gpsPosition.speed / 3.6) || 1; // km/h → m/s, min 1
            const etaSeconds = distToStop / speedMs;
            const etaToNextStop = formatETA(etaSeconds);

            // Advance steps based on position
            let newStepIndex = prev.currentStepIndex;
            const steps = stepsRef.current;
            if (steps.length > 0 && newStepIndex < steps.length - 1) {
                // Simple advancement: if distance to stop decreases, we're progressing
                // More sophisticated: compare to step waypoints
                const progress = 1 - (distToStop / (prev.distanceToNextStop || distToStop || 1));
                const expectedStep = Math.min(
                    Math.floor(progress * steps.length * 0.5) + prev.currentStepIndex,
                    steps.length - 1
                );
                if (expectedStep > newStepIndex) {
                    newStepIndex = expectedStep;
                }
            }

            // Voice announce new step
            if (newStepIndex !== lastSpokenStepRef.current && steps[newStepIndex]) {
                speak(steps[newStepIndex].instruction, voiceEnabled, lang);
                lastSpokenStepRef.current = newStepIndex;
            }

            // Near stop announcement
            if (isNearStop && !prev.isNearStop) {
                if (lang === 'ar') {
                    const orderLabel = currentStop.orderNumber ? `، طلب رقم ${currentStop.orderNumber}` : '';
                    speak(`وصلت للنقطة ${prev.currentStopIndex}${orderLabel}`, voiceEnabled, lang);
                } else {
                    const orderLabel = currentStop.orderNumber ? `, order number ${currentStop.orderNumber}` : '';
                    speak(`Arriving at stop ${prev.currentStopIndex}${orderLabel}`, voiceEnabled, lang);
                }
            }

            // Calculate remaining totals
            const remainingLegs = optimizedRoute.legs.slice(prev.currentStopIndex - 1);
            const totalRemDist = remainingLegs.reduce((sum, leg) => sum + leg.distanceValue, 0);
            const totalRemTime = remainingLegs.reduce((sum, leg) => sum + leg.durationValue, 0);

            return {
                ...prev,
                distanceToNextStop: Math.round(distToStop),
                etaToNextStop,
                isNearStop,
                isOffRoute,
                currentStepIndex: newStepIndex,
                currentStep: steps[newStepIndex] || prev.currentStep,
                nextStep: steps[newStepIndex + 1] || null,
                totalRemainingDistance: formatDistance(totalRemDist),
                totalRemainingTime: formatDuration(totalRemTime),
            };
        });
    }, [gpsPosition, optimizedRoute, voiceEnabled, lang]);

    // ===== Mark Delivered =====
    const markDelivered = useCallback(() => {
        setNavState(prev => {
            if (!prev.isActive || !optimizedRoute) return prev;

            const newStatuses = [...prev.stopStatuses];
            newStatuses[prev.currentStopIndex] = 'delivered';

            const nextIndex = findNextPendingStop(newStatuses, prev.currentStopIndex);
            const completed = newStatuses.filter(s => s === 'delivered').length - 1; // exclude start

            if (nextIndex === -1) {
                // All delivered!
                speak(
                    lang === 'ar' ? 'تم توصيل جميع الطلبات! عمل رائع.' : 'All deliveries completed! Great job.',
                    voiceEnabled, lang
                );
                isActiveRef.current = false;
                return {
                    ...prev,
                    stopStatuses: newStatuses,
                    isActive: false,
                    completedStops: completed,
                    isNearStop: false,
                };
            }

            newStatuses[nextIndex] = 'current';
            speak(
                lang === 'ar' ? `تم التوصيل. التوجه للنقطة ${nextIndex}.` : `Delivery confirmed. Heading to stop ${nextIndex}.`,
                voiceEnabled, lang
            );

            // Update steps for next leg
            const directions = directionsRef.current;
            if (directions) {
                const legIndex = nextIndex - 1;
                const legSteps = extractLegSteps(directions, legIndex);
                stepsRef.current = legSteps;
                lastSpokenStepRef.current = -1;

                return {
                    ...prev,
                    currentStopIndex: nextIndex,
                    stopStatuses: newStatuses,
                    completedStops: completed,
                    isNearStop: false,
                    currentStepIndex: 0,
                    currentStep: legSteps[0] || null,
                    nextStep: legSteps[1] || null,
                    allSteps: legSteps,
                    distanceToNextStop: optimizedRoute.legs[legIndex]?.distanceValue || 0,
                    etaToNextStop: optimizedRoute.legs[legIndex]?.duration || '',
                };
            }

            return {
                ...prev,
                currentStopIndex: nextIndex,
                stopStatuses: newStatuses,
                completedStops: completed,
                isNearStop: false,
            };
        });
    }, [optimizedRoute, voiceEnabled, lang]);

    // ===== Skip Stop =====
    const skipStop = useCallback(() => {
        setNavState(prev => {
            if (!prev.isActive || !optimizedRoute) return prev;

            const newStatuses = [...prev.stopStatuses];
            newStatuses[prev.currentStopIndex] = 'skipped';

            const nextIndex = findNextPendingStop(newStatuses, prev.currentStopIndex);
            if (nextIndex === -1) {
                isActiveRef.current = false;
                return { ...prev, stopStatuses: newStatuses, isActive: false };
            }

            newStatuses[nextIndex] = 'current';
            speak(
                lang === 'ar' ? `تم تخطي النقطة. التوجه للنقطة ${nextIndex}.` : `Stop skipped. Heading to stop ${nextIndex}.`,
                voiceEnabled, lang
            );

            const directions = directionsRef.current;
            if (directions) {
                const legIndex = nextIndex - 1;
                const legSteps = extractLegSteps(directions, legIndex);
                stepsRef.current = legSteps;
                lastSpokenStepRef.current = -1;

                return {
                    ...prev,
                    currentStopIndex: nextIndex,
                    stopStatuses: newStatuses,
                    isNearStop: false,
                    currentStepIndex: 0,
                    currentStep: legSteps[0] || null,
                    nextStep: legSteps[1] || null,
                    allSteps: legSteps,
                };
            }

            return { ...prev, currentStopIndex: nextIndex, stopStatuses: newStatuses, isNearStop: false };
        });
    }, [optimizedRoute, voiceEnabled, lang]);

    // ===== Exit Navigation =====
    const exitNavigation = useCallback(() => {
        isActiveRef.current = false;
        setNavState(getInitialState());
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }, []);

    // ===== Toggle Voice =====
    const toggleVoice = useCallback(() => {
        setVoiceEnabled(v => !v);
    }, []);

    return {
        navState,
        voiceEnabled,
        startNavigation,
        markDelivered,
        skipStop,
        exitNavigation,
        toggleVoice,
        directionsResult: directionsRef.current,
    };
}

// ===== Helper Functions =====

function getInitialState(): NavigationState {
    return {
        isActive: false,
        currentStopIndex: 0,
        stopStatuses: [],
        currentStep: null,
        nextStep: null,
        allSteps: [],
        currentStepIndex: 0,
        distanceToNextStop: 0,
        etaToNextStop: '',
        totalRemainingDistance: '',
        totalRemainingTime: '',
        isOffRoute: false,
        isRecalculating: false,
        isNearStop: false,
        completedStops: 0,
        totalStops: 0,
    };
}

function findNextPendingStop(statuses: StopStatus[], afterIndex: number): number {
    for (let i = afterIndex + 1; i < statuses.length; i++) {
        if (statuses[i] === 'pending' || statuses[i] === 'current') return i;
    }
    return -1;
}

/** Haversine distance in meters */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatETA(seconds: number): string {
    if (seconds < 60) return '< 1 min';
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h ${rem}m`;
}

function formatDistance(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return '< 1 min';
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h ${rem}m`;
}

/** Fetch full directions for all ordered stops */
async function fetchDirections(
    stops: { location: { lat: number; lng: number } | null }[],
    lang: Language = 'ar'
): Promise<google.maps.DirectionsResult | null> {
    const valid = stops.filter(s => s.location);
    if (valid.length < 2) return null;

    const origin = new google.maps.LatLng(valid[0].location!.lat, valid[0].location!.lng);
    const destination = new google.maps.LatLng(
        valid[valid.length - 1].location!.lat,
        valid[valid.length - 1].location!.lng
    );
    const waypoints = valid.slice(1, -1).map(s => ({
        location: new google.maps.LatLng(s.location!.lat, s.location!.lng),
        stopover: true,
    }));

    return new Promise((resolve) => {
        const request: google.maps.DirectionsRequest & { language?: string } = {
            origin,
            destination,
            waypoints,
            optimizeWaypoints: false,
            travelMode: google.maps.TravelMode.DRIVING,
            language: lang,            // Arabic or English directions
            drivingOptions: {
                departureTime: new Date(),  // real-time traffic
                trafficModel: google.maps.TrafficModel.BEST_GUESS,
            },
        };

        new google.maps.DirectionsService().route(
            request as google.maps.DirectionsRequest,
            (result, status) => {
                resolve(status === 'OK' && result ? result : null);
            }
        );
    });
}

/** Extract all steps from all legs */
function extractAllSteps(directions: google.maps.DirectionsResult): NavigationStep[] {
    const steps: NavigationStep[] = [];
    const route = directions.routes[0];
    if (!route) return steps;

    for (const leg of route.legs) {
        for (const step of leg.steps) {
            steps.push({
                instruction: stripHTML(step.instructions || ''),
                distance: step.distance?.text || '',
                distanceValue: step.distance?.value || 0,
                maneuver: (step as any).maneuver || undefined,
            });
        }
    }
    return steps;
}

/** Extract steps from a specific leg */
function extractLegSteps(directions: google.maps.DirectionsResult, legIndex: number): NavigationStep[] {
    const route = directions.routes[0];
    if (!route || !route.legs[legIndex]) return [];

    return route.legs[legIndex].steps.map(step => ({
        instruction: stripHTML(step.instructions || ''),
        distance: step.distance?.text || '',
        distanceValue: step.distance?.value || 0,
        maneuver: (step as any).maneuver || undefined,
    }));
}

function stripHTML(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

/** Speak using Web Speech API — language-aware */
function speak(text: string, enabled: boolean, lang: Language = 'ar') {
    if (!enabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    window.speechSynthesis.speak(utterance);
}

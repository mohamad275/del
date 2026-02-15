/** Core type definitions for the Delivery Route Optimizer */

export interface LatLng {
    lat: number;
    lng: number;
}

export interface DeliveryStop {
    id: string;
    address: string;
    location: LatLng | null;
    label?: string;
    orderNumber?: string;   // e.g. "1023"
}

export interface RouteLeg {
    stopIndex: number;
    address: string;
    duration: string;       // e.g. "12 mins"
    durationValue: number;  // seconds
    distance: string;       // e.g. "5.2 km"
    distanceValue: number;  // meters
    eta: string;            // e.g. "2:35 PM"
}

export interface OptimizedRoute {
    orderedStops: DeliveryStop[];
    legs: RouteLeg[];
    totalDistance: string;
    totalDistanceValue: number;
    totalDuration: string;
    totalDurationValue: number;
    polyline: string;       // encoded polyline
}

export interface SavedRoute {
    id: string;
    name: string;
    timestamp: number;
    startLocation: DeliveryStop;
    endLocation: DeliveryStop | null;
    stops: DeliveryStop[];
}

/** ===== Navigation Types ===== */

export type StopStatus = 'pending' | 'current' | 'delivered' | 'skipped';

export interface NavigationStep {
    instruction: string;        // e.g. "Turn right onto Sheikh Zayed Rd"
    distance: string;           // e.g. "200 m"
    distanceValue: number;      // meters
    maneuver?: string;          // "turn-right", "turn-left", "straight", etc.
}

export interface GPSPosition {
    lat: number;
    lng: number;
    speed: number;              // km/h
    heading: number;            // degrees (0 = north)
    accuracy: number;           // meters
    timestamp: number;
}

export interface NavigationState {
    isActive: boolean;
    currentStopIndex: number;
    stopStatuses: StopStatus[];
    currentStep: NavigationStep | null;
    nextStep: NavigationStep | null;
    allSteps: NavigationStep[];
    currentStepIndex: number;
    distanceToNextStop: number;     // meters
    etaToNextStop: string;          // "3 min"
    totalRemainingDistance: string;
    totalRemainingTime: string;
    isOffRoute: boolean;
    isRecalculating: boolean;
    isNearStop: boolean;            // within 50m of next stop
    completedStops: number;
    totalStops: number;
}

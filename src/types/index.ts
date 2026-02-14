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

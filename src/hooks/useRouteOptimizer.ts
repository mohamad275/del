import { useState, useCallback } from 'react';
import type { DeliveryStop, OptimizedRoute, RouteLeg } from '../types';
import { solveTSP } from '../utils/tsp';
import { formatDuration, formatDistance, getETA } from '../utils/formatTime';

/**
 * Hook that orchestrates the full route optimization flow:
 * 1. Build distance matrix via Google Distance Matrix API
 * 2. Solve TSP for optimal ordering
 * 3. Fetch detailed directions via Google Directions API
 * 4. Return fully structured OptimizedRoute
 */
export function useRouteOptimizer() {
    const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const optimizeRoute = useCallback(
        async (
            startLocation: DeliveryStop,
            stops: DeliveryStop[],
            endLocation: DeliveryStop | null
        ) => {
            setIsOptimizing(true);
            setError(null);
            setOptimizedRoute(null);

            try {
                // Filter stops with valid locations
                const validStops = stops.filter((s) => s.location !== null);
                if (!startLocation.location) {
                    throw new Error('Start location must be set');
                }
                if (validStops.length === 0) {
                    throw new Error('Add at least one delivery stop');
                }

                // Build the list of all points: start + stops + (optional end)
                const allPoints = [startLocation, ...validStops];
                const hasEnd = endLocation && endLocation.location;
                if (hasEnd) {
                    allPoints.push(endLocation);
                }

                // Step 1: Get distance matrix from Google
                const distanceMatrix = await getDistanceMatrix(allPoints);

                // Step 2: If we have an end point, we need to fix it at the end.
                // For TSP we only optimize the middle stops.
                let optimizedOrder: number[];

                if (allPoints.length <= 2) {
                    optimizedOrder = allPoints.map((_, i) => i);
                } else if (hasEnd) {
                    // Extract the sub-matrix for start + middle stops (exclude end)
                    const middleCount = allPoints.length - 1; // everything except the end
                    const subMatrix = distanceMatrix.slice(0, middleCount).map((row) => row.slice(0, middleCount));
                    const tspOrder = solveTSP(subMatrix);
                    // Append the end point index
                    optimizedOrder = [...tspOrder, allPoints.length - 1];
                } else {
                    optimizedOrder = solveTSP(distanceMatrix);
                }

                // Step 3: Build ordered stops list
                const orderedAll = optimizedOrder.map((i) => allPoints[i]);

                // Step 4: Get detailed directions via Google Directions API
                const directionsResult = await getDirections(orderedAll);

                if (!directionsResult) {
                    throw new Error('Could not compute directions');
                }

                // Step 5: Build the response
                const route = directionsResult.routes[0];
                const legs: RouteLeg[] = [];
                let cumulativeSeconds = 0;
                let totalDistanceMeters = 0;
                let totalDurationSeconds = 0;
                const startTime = new Date();

                for (let i = 0; i < route.legs.length; i++) {
                    const leg = route.legs[i];
                    cumulativeSeconds += leg.duration!.value;
                    totalDistanceMeters += leg.distance!.value;
                    totalDurationSeconds += leg.duration!.value;

                    legs.push({
                        stopIndex: i + 1,
                        address: orderedAll[i + 1]?.address || leg.end_address,
                        duration: leg.duration!.text,
                        durationValue: leg.duration!.value,
                        distance: leg.distance!.text,
                        distanceValue: leg.distance!.value,
                        eta: getETA(cumulativeSeconds, startTime),
                    });
                }

                const result: OptimizedRoute = {
                    orderedStops: orderedAll,
                    legs,
                    totalDistance: formatDistance(totalDistanceMeters),
                    totalDistanceValue: totalDistanceMeters,
                    totalDuration: formatDuration(totalDurationSeconds),
                    totalDurationValue: totalDurationSeconds,
                    polyline: route.overview_polyline,
                };

                setOptimizedRoute(result);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Optimization failed';
                setError(message);
                console.error('Route optimization error:', err);
            } finally {
                setIsOptimizing(false);
            }
        },
        []
    );

    const clearRoute = useCallback(() => {
        setOptimizedRoute(null);
        setError(null);
    }, []);

    return { optimizedRoute, isOptimizing, error, optimizeRoute, clearRoute };
}

/**
 * Build an NxN distance matrix using Google Distance Matrix API.
 * Always batches to stay within the 100-element-per-request limit.
 */
async function getDistanceMatrix(points: DeliveryStop[]): Promise<number[][]> {
    if (!window.google?.maps) {
        throw new Error('Google Maps not loaded');
    }

    const service = new google.maps.DistanceMatrixService();
    const locations = points.map(
        (p) => new google.maps.LatLng(p.location!.lat, p.location!.lng)
    );

    const n = locations.length;

    // For very small sets (≤10), a single request is fine (≤100 elements)
    if (n <= 10) {
        return new Promise((resolve, reject) => {
            service.getDistanceMatrix(
                {
                    origins: locations,
                    destinations: locations,
                    travelMode: google.maps.TravelMode.DRIVING,
                    unitSystem: google.maps.UnitSystem.METRIC,
                },
                (response, status) => {
                    if (status === 'OK' && response) {
                        const matrix = response.rows.map((row) =>
                            row.elements.map((el) =>
                                el.status === 'OK' ? el.duration!.value : Infinity
                            )
                        );
                        resolve(matrix);
                    } else {
                        reject(new Error(`Distance Matrix failed: ${status}`));
                    }
                }
            );
        });
    }

    // For larger sets, batch to stay under 100 elements per request
    return buildLargeDistanceMatrix(locations, service);
}

/**
 * Build a large distance matrix by batching API calls.
 */
async function buildLargeDistanceMatrix(
    locations: google.maps.LatLng[],
    service: google.maps.DistanceMatrixService
): Promise<number[][]> {
    const n = locations.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
    // Keep each request under 100 elements: batchSize × n ≤ 100
    const batchSize = Math.max(1, Math.min(10, Math.floor(100 / n)));

    for (let i = 0; i < n; i += batchSize) {
        const origins = locations.slice(i, Math.min(i + batchSize, n));
        for (let j = 0; j < n; j += batchSize) {
            const destinations = locations.slice(j, Math.min(j + batchSize, n));

            const response = await new Promise<google.maps.DistanceMatrixResponse>(
                (resolve, reject) => {
                    service.getDistanceMatrix(
                        {
                            origins,
                            destinations,
                            travelMode: google.maps.TravelMode.DRIVING,
                            unitSystem: google.maps.UnitSystem.METRIC,
                        },
                        (resp, status) => {
                            if (status === 'OK' && resp) {
                                resolve(resp);
                            } else {
                                reject(new Error(`Distance Matrix batch failed: ${status}`));
                            }
                        }
                    );
                }
            );

            for (let oi = 0; oi < response.rows.length; oi++) {
                for (let di = 0; di < response.rows[oi].elements.length; di++) {
                    const el = response.rows[oi].elements[di];
                    if (el.status === 'OK') {
                        matrix[i + oi][j + di] = el.duration!.value;
                    }
                }
            }

            // Small delay between batches to avoid rate limiting
            if (j + batchSize < n) {
                await new Promise((r) => setTimeout(r, 200));
            }
        }
        if (i + batchSize < n) {
            await new Promise((r) => setTimeout(r, 200));
        }
    }

    return matrix;
}

/**
 * Get detailed directions between ordered stops.
 */
async function getDirections(
    orderedStops: DeliveryStop[]
): Promise<google.maps.DirectionsResult | null> {
    return new Promise((resolve, reject) => {
        if (!window.google?.maps) {
            reject(new Error('Google Maps not loaded'));
            return;
        }

        const service = new google.maps.DirectionsService();
        const origin = new google.maps.LatLng(
            orderedStops[0].location!.lat,
            orderedStops[0].location!.lng
        );
        const destination = new google.maps.LatLng(
            orderedStops[orderedStops.length - 1].location!.lat,
            orderedStops[orderedStops.length - 1].location!.lng
        );

        // Middle stops become waypoints
        const waypoints = orderedStops.slice(1, -1).map((stop) => ({
            location: new google.maps.LatLng(stop.location!.lat, stop.location!.lng),
            stopover: true,
        }));

        service.route(
            {
                origin,
                destination,
                waypoints,
                optimizeWaypoints: false, // We already optimized
                travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === 'OK' && result) {
                    resolve(result);
                } else {
                    reject(new Error(`Directions failed: ${status}`));
                }
            }
        );
    });
}

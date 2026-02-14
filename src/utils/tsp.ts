/**
 * TSP (Travelling Salesman Problem) heuristic solver.
 * Uses Nearest Neighbor + 2-opt improvement for fast, good-enough solutions.
 * Handles up to 50 stops efficiently.
 */

/**
 * Nearest Neighbor heuristic: Starting from the origin (index 0),
 * always visit the closest unvisited node.
 */
export function nearestNeighbor(distanceMatrix: number[][]): number[] {
    const n = distanceMatrix.length;
    if (n <= 1) return [0];
    if (n === 2) return [0, 1];

    const visited = new Set<number>([0]);
    const route = [0];
    let current = 0;

    while (visited.size < n) {
        let nearest = -1;
        let nearestDist = Infinity;

        for (let i = 0; i < n; i++) {
            if (!visited.has(i) && distanceMatrix[current][i] < nearestDist) {
                nearestDist = distanceMatrix[current][i];
                nearest = i;
            }
        }

        if (nearest === -1) break;
        visited.add(nearest);
        route.push(nearest);
        current = nearest;
    }

    return route;
}

/**
 * Calculate the total distance of a route given a distance matrix.
 */
function routeDistance(route: number[], distanceMatrix: number[][]): number {
    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
        total += distanceMatrix[route[i]][route[i + 1]];
    }
    return total;
}

/**
 * 2-opt improvement: Iteratively reverse segments of the route
 * to reduce total distance. Runs until no more improvements are found.
 */
export function twoOpt(route: number[], distanceMatrix: number[][]): number[] {
    const improved = [...route];
    let bestDistance = routeDistance(improved, distanceMatrix);
    let foundImprovement = true;

    while (foundImprovement) {
        foundImprovement = false;

        // Start from 1 to keep the origin (index 0) fixed at the start
        for (let i = 1; i < improved.length - 1; i++) {
            for (let j = i + 1; j < improved.length; j++) {
                // Reverse the segment between i and j
                const newRoute = [
                    ...improved.slice(0, i),
                    ...improved.slice(i, j + 1).reverse(),
                    ...improved.slice(j + 1),
                ];

                const newDistance = routeDistance(newRoute, distanceMatrix);
                if (newDistance < bestDistance) {
                    improved.splice(0, improved.length, ...newRoute);
                    bestDistance = newDistance;
                    foundImprovement = true;
                }
            }
        }
    }

    return improved;
}

/**
 * Solve TSP using Nearest Neighbor + 2-opt.
 * @param distanceMatrix - NxN matrix of distances between all points
 * @returns Optimized order of indices
 */
export function solveTSP(distanceMatrix: number[][]): number[] {
    if (distanceMatrix.length <= 2) {
        return Array.from({ length: distanceMatrix.length }, (_, i) => i);
    }

    // Step 1: Get initial route via nearest neighbor
    const initial = nearestNeighbor(distanceMatrix);

    // Step 2: Improve with 2-opt
    const optimized = twoOpt(initial, distanceMatrix);

    return optimized;
}

/**
 * Formatting utilities for time and distance display.
 */

/** Format seconds into a human-readable duration string */
export function formatDuration(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)} sec`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    if (hours === 0) return `${mins} min`;
    return `${hours}h ${mins}m`;
}

/** Format meters into km or m strings */
export function formatDistance(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
}

/** Get a time string from now + offset seconds, e.g. "2:35 PM" */
export function getETA(offsetSeconds: number, startTime?: Date): string {
    const now = startTime || new Date();
    const eta = new Date(now.getTime() + offsetSeconds * 1000);
    return eta.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** Generate a unique ID */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

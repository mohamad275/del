import { useState, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import type { DeliveryStop } from '../types';
import { useGeocode } from '../hooks/useGeocode';
import { isGoogleMapsLink, isShortGoogleMapsUrl, parseGoogleMapsLink, parseCoordinates, resolveShortUrl } from '../utils/parseGoogleMapsLink';
import { generateId } from '../utils/formatTime';

interface StopListProps {
    stops: DeliveryStop[];
    onStopsChange: (stops: DeliveryStop[]) => void;
}

/**
 * Draggable list of delivery stops with add/remove/reorder capabilities.
 */
export default function StopList({ stops, onStopsChange }: StopListProps) {
    const [newStopText, setNewStopText] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const { geocodeAddress, reverseGeocode } = useGeocode();
    const inputRef = useRef<HTMLInputElement>(null);

    /** Handle drag-and-drop reorder */
    const handleDragEnd = useCallback(
        (result: DropResult) => {
            if (!result.destination) return;
            const items = Array.from(stops);
            const [removed] = items.splice(result.source.index, 1);
            items.splice(result.destination.index, 0, removed);
            onStopsChange(items);
        },
        [stops, onStopsChange]
    );

    /** Add a new stop from text input */
    const addStop = useCallback(async () => {
        const text = newStopText.trim();
        if (!text) return;

        setIsAdding(true);

        // Check for Google Maps link
        if (isGoogleMapsLink(text)) {
            // If it's a shortened URL (maps.app.goo.gl), resolve it first
            let urlToParse = text;
            if (isShortGoogleMapsUrl(text)) {
                const expanded = await resolveShortUrl(text);
                if (expanded) urlToParse = expanded;
            }

            const coords = parseGoogleMapsLink(urlToParse);
            if (coords) {
                const address = await reverseGeocode(coords);
                onStopsChange([
                    ...stops,
                    {
                        id: generateId(),
                        address: address || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
                        location: coords,
                    },
                ]);
                setNewStopText('');
                setIsAdding(false);
                return;
            }
        }

        // Check if it's raw coordinates (DMS, decimal, etc.)
        const coordsParsed = parseCoordinates(text);
        if (coordsParsed) {
            const address = await reverseGeocode(coordsParsed);
            onStopsChange([
                ...stops,
                {
                    id: generateId(),
                    address: address || `${coordsParsed.lat.toFixed(6)}, ${coordsParsed.lng.toFixed(6)}`,
                    location: coordsParsed,
                },
            ]);
            setNewStopText('');
            setIsAdding(false);
            return;
        }

        // Regular address geocoding
        const result = await geocodeAddress(text);
        if (result) {
            onStopsChange([
                ...stops,
                {
                    id: generateId(),
                    address: result.formattedAddress,
                    location: result.location,
                },
            ]);
        } else {
            // Still add it, but without location (will show warning)
            onStopsChange([
                ...stops,
                {
                    id: generateId(),
                    address: text,
                    location: null,
                },
            ]);
        }
        setNewStopText('');
        setIsAdding(false);
    }, [newStopText, stops, onStopsChange, geocodeAddress, reverseGeocode]);

    /** Remove a stop by index */
    const removeStop = useCallback(
        (index: number) => {
            const updated = stops.filter((_, i) => i !== index);
            onStopsChange(updated);
        },
        [stops, onStopsChange]
    );

    /** Handle enter key in input */
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addStop();
        }
    };

    const stopColors = [
        'bg-primary-500', 'bg-primary-600', 'bg-primary-700',
        'bg-accent-500', 'bg-accent-600',
        'bg-purple-500', 'bg-pink-500', 'bg-teal-500',
    ];

    return (
        <div className="animate-fadeInUp">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                    </svg>
                    <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">
                        Delivery Stops
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400 font-medium">
                        {stops.length}
                    </span>
                </div>
                {stops.length > 0 && (
                    <button
                        onClick={() => onStopsChange([])}
                        className="text-xs text-surface-400 hover:text-error transition-colors"
                    >
                        Clear all
                    </button>
                )}
            </div>

            {/* Drag-and-drop stop list */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="stops">
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 mb-3">
                            {stops.map((stop, index) => (
                                <Draggable key={stop.id} draggableId={stop.id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 transition-all duration-200 ${snapshot.isDragging ? 'dragging shadow-lg border-primary-400' : ''
                                                }`}
                                        >
                                            {/* Drag handle */}
                                            <div
                                                {...provided.dragHandleProps}
                                                className="cursor-grab active:cursor-grabbing text-surface-300 dark:text-surface-600 hover:text-surface-500"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                    <circle cx="9" cy="6" r="1.5" />
                                                    <circle cx="15" cy="6" r="1.5" />
                                                    <circle cx="9" cy="12" r="1.5" />
                                                    <circle cx="15" cy="12" r="1.5" />
                                                    <circle cx="9" cy="18" r="1.5" />
                                                    <circle cx="15" cy="18" r="1.5" />
                                                </svg>
                                            </div>

                                            {/* Number badge */}
                                            <div
                                                className={`stop-badge ${stopColors[index % stopColors.length]}`}
                                            >
                                                {index + 1}
                                            </div>

                                            {/* Address */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-surface-800 dark:text-surface-200 truncate">
                                                    {stop.address}
                                                </p>
                                                {!stop.location && (
                                                    <p className="text-xs text-warning flex items-center gap-1 mt-0.5">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                                            <line x1="12" y1="9" x2="12" y2="13" />
                                                            <line x1="12" y1="17" x2="12.01" y2="17" />
                                                        </svg>
                                                        Location not found
                                                    </p>
                                                )}
                                            </div>

                                            {/* Location status */}
                                            {stop.location && (
                                                <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                </div>
                                            )}

                                            {/* Remove button */}
                                            <button
                                                onClick={() => removeStop(index)}
                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-300 hover:text-error hover:bg-error/10 transition-all duration-200 flex-shrink-0"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            {/* Add stop input */}
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newStopText}
                        onChange={(e) => setNewStopText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Address, building name, or Maps link..."
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-800 border border-dashed border-surface-300 dark:border-surface-600 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all duration-200"
                    />
                    {isAdding && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                        </div>
                    )}
                </div>
                <button
                    onClick={addStop}
                    disabled={!newStopText.trim() || isAdding}
                    className="px-4 py-3 rounded-xl gradient-primary text-white text-sm font-semibold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </button>
            </div>

            {stops.length === 0 && (
                <p className="text-center text-xs text-surface-400 dark:text-surface-500 mt-4 py-4">
                    Add delivery stops above to get started.<br />
                    You can drag to reorder them manually.
                </p>
            )}
        </div>
    );
}

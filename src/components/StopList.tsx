import { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import type { DeliveryStop } from '../types';
import { useGeocode } from '../hooks/useGeocode';
import { isGoogleMapsLink, isShortGoogleMapsUrl, parseGoogleMapsLink, parseCoordinates, resolveShortUrl } from '../utils/parseGoogleMapsLink';
import { generateId } from '../utils/formatTime';
import { t, type Language } from '../i18n';

interface StopListProps {
    lang: Language;
    stops: DeliveryStop[];
    onStopsChange: (stops: DeliveryStop[]) => void;
}

export default function StopList({ lang, stops, onStopsChange }: StopListProps) {
    const [newStopText, setNewStopText] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const { geocodeAddress, reverseGeocode } = useGeocode();

    const handleDragEnd = useCallback((result: DropResult) => {
        if (!result.destination) return;
        const items = Array.from(stops);
        const [removed] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, removed);
        onStopsChange(items);
    }, [stops, onStopsChange]);

    const addStop = useCallback(async () => {
        const text = newStopText.trim();
        if (!text) return;
        setIsAdding(true);

        // Google Maps link
        if (isGoogleMapsLink(text)) {
            if (isShortGoogleMapsUrl(text)) {
                const coords = await resolveShortUrl(text);
                if (coords) {
                    const address = await reverseGeocode(coords);
                    onStopsChange([...stops, { id: generateId(), address: address || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`, location: coords }]);
                    setNewStopText(''); setIsAdding(false); return;
                }
            }
            const coords = parseGoogleMapsLink(text);
            if (coords) {
                const address = await reverseGeocode(coords);
                onStopsChange([...stops, { id: generateId(), address: address || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`, location: coords }]);
                setNewStopText(''); setIsAdding(false); return;
            }
        }

        // Raw coordinates
        const coordsParsed = parseCoordinates(text);
        if (coordsParsed) {
            const address = await reverseGeocode(coordsParsed);
            onStopsChange([...stops, { id: generateId(), address: address || `${coordsParsed.lat.toFixed(6)}, ${coordsParsed.lng.toFixed(6)}`, location: coordsParsed }]);
            setNewStopText(''); setIsAdding(false); return;
        }

        // Regular address
        const result = await geocodeAddress(text);
        if (result) {
            onStopsChange([...stops, { id: generateId(), address: result.formattedAddress, location: result.location }]);
        } else {
            onStopsChange([...stops, { id: generateId(), address: text, location: null }]);
        }
        setNewStopText(''); setIsAdding(false);
    }, [newStopText, stops, onStopsChange, geocodeAddress, reverseGeocode]);

    const removeStop = useCallback((index: number) => {
        onStopsChange(stops.filter((_, i) => i !== index));
    }, [stops, onStopsChange]);

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">{t('stops.title', lang)}</span>
                    <span className="chip bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">{stops.length}</span>
                </div>
                {stops.length > 0 && (
                    <button onClick={() => onStopsChange([])} className="text-xs text-surface-400 hover:text-error transition-colors">{t('stops.clearAll', lang)}</button>
                )}
            </div>

            {/* Add stop input */}
            <div className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={newStopText}
                        onChange={(e) => setNewStopText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addStop()}
                        placeholder={t('stops.addPlaceholder', lang)}
                        className="input"
                        dir="auto"
                    />
                    {isAdding && (
                        <div className={`absolute top-1/2 -translate-y-1/2 ${lang === 'ar' ? 'left-3' : 'right-3'}`}>
                            <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                        </div>
                    )}
                </div>
                <button onClick={addStop} disabled={!newStopText.trim() || isAdding} className="btn-primary px-4 py-3 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
            </div>

            {/* Stop list */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="stops">
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                            {stops.map((stop, index) => (
                                <Draggable key={stop.id} draggableId={stop.id} index={index}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 transition-all ${snapshot.isDragging ? 'shadow-lg scale-[1.02] border-primary-300' : ''}`}
                                        >
                                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-surface-300 dark:text-surface-600 flex-shrink-0">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" /></svg>
                                            </div>
                                            <div className="stop-badge bg-primary-500">{index + 1}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-surface-800 dark:text-surface-200 truncate">{stop.address}</p>
                                                {!stop.location && <p className="text-xs text-warning mt-0.5">⚠ {t('location.notFound', lang)}</p>}
                                            </div>
                                            {stop.location && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" className="flex-shrink-0"><polyline points="20 6 9 17 4 12" /></svg>}
                                            <button onClick={() => removeStop(index)} className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-300 hover:text-error hover:bg-error/10 transition-all flex-shrink-0">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
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

            {stops.length === 0 && (
                <p className="text-center text-xs text-surface-400 py-4 whitespace-pre-line">{t('stops.emptyMessage', lang)}</p>
            )}
        </div>
    );
}

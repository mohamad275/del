import { useState, useEffect } from 'react';
import type { DeliveryStop, SavedRoute } from '../types';
import { generateId } from '../utils/formatTime';
import { t, type Language } from '../i18n';

interface SavedRoutesProps {
    lang: Language;
    currentStart: DeliveryStop;
    currentEnd: DeliveryStop | null;
    currentStops: DeliveryStop[];
    onLoadRoute: (start: DeliveryStop, end: DeliveryStop | null, stops: DeliveryStop[]) => void;
    isVisible: boolean;
}

const STORAGE_KEY = 'routeflow_saved_routes';

function getSavedRoutes(): SavedRoute[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

export default function SavedRoutes({ lang, currentStart, currentEnd, currentStops, onLoadRoute, isVisible }: SavedRoutesProps) {
    const [routes, setRoutes] = useState<SavedRoute[]>([]);
    const [routeName, setRouteName] = useState('');

    useEffect(() => { setRoutes(getSavedRoutes()); }, [isVisible]);

    const saveRoute = () => {
        if (!routeName.trim() || currentStops.length === 0) return;
        const newRoute: SavedRoute = {
            id: generateId(), name: routeName.trim(), timestamp: Date.now(),
            startLocation: currentStart, endLocation: currentEnd, stops: currentStops,
        };
        const updated = [newRoute, ...routes].slice(0, 20);
        setRoutes(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setRouteName('');
    };

    const deleteRoute = (id: string) => {
        const updated = routes.filter((r) => r.id !== id);
        setRoutes(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    };

    if (!isVisible) return null;

    return (
        <div className="animate-fadeInUp glass-card rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-surface-200/50 dark:border-surface-700/50">
                <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                    {t('saved.title', lang)}
                </h3>
            </div>

            {/* Save current */}
            <div className="p-3 border-b border-surface-100 dark:border-surface-700/50">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={routeName}
                        onChange={(e) => setRouteName(e.target.value)}
                        placeholder={t('saved.namePlaceholder', lang)}
                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                        onKeyDown={(e) => e.key === 'Enter' && saveRoute()}
                        dir="auto"
                    />
                    <button
                        onClick={saveRoute}
                        disabled={!routeName.trim() || currentStops.length === 0}
                        className="px-4 py-2 rounded-lg gradient-primary text-white text-xs font-semibold disabled:opacity-40 transition-opacity"
                    >
                        {t('saved.save', lang)}
                    </button>
                </div>
            </div>

            {/* Routes list */}
            <div className="max-h-[200px] overflow-y-auto">
                {routes.length === 0 ? (
                    <p className="text-center text-xs text-surface-400 py-6">{t('saved.empty', lang)}</p>
                ) : (
                    <div className="divide-y divide-surface-100 dark:divide-surface-700/50">
                        {routes.map((route) => (
                            <div key={route.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                <button onClick={() => onLoadRoute(route.startLocation, route.endLocation, route.stops)} className="flex-1 text-start min-w-0">
                                    <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{route.name}</p>
                                    <p className="text-xs text-surface-400">{route.stops.length} {t('saved.stops', lang)} · {new Date(route.timestamp).toLocaleDateString()}</p>
                                </button>
                                <button onClick={() => deleteRoute(route.id)} className="p-1.5 rounded-lg text-surface-300 hover:text-error hover:bg-error/10 transition-all">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

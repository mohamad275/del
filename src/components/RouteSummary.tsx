import type { OptimizedRoute } from '../types';
import { t, type Language } from '../i18n';

interface RouteSummaryProps {
    lang: Language;
    route: OptimizedRoute;
    onNavigate: () => void;
    onStartNavigation: () => void;
}

export default function RouteSummary({ lang, route, onNavigate, onStartNavigation }: RouteSummaryProps) {
    return (
        <div className="animate-fadeIn space-y-3">
            {/* Summary stats */}
            <div className="card overflow-hidden">
                <div className="bg-primary-500 px-5 py-4 text-white">
                    <h3 className="font-bold text-base mb-3">{t('summary.title', lang)}</h3>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <p className="text-2xl font-bold">{route.orderedStops.length - 1}</p>
                            <p className="text-xs text-white/70">{t('summary.stops', lang)}</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{route.totalDistance}</p>
                            <p className="text-xs text-white/70">{t('summary.distance', lang)}</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{route.totalDuration}</p>
                            <p className="text-xs text-white/70">{t('summary.duration', lang)}</p>
                        </div>
                    </div>
                </div>

                {/* Stop details */}
                <div className="border-t border-surface-200 dark:border-surface-700">
                    <div className="px-4 py-2.5">
                        <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wide">{t('summary.stopDetails', lang)}</h4>
                    </div>
                    <div className="divide-y divide-surface-100 dark:divide-surface-700/50 max-h-[260px] overflow-y-auto">
                        <div className="flex items-center gap-3 px-4 py-2.5">
                            <div className="stop-badge bg-success">S</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-surface-800 dark:text-surface-200 truncate">
                                    {route.orderedStops[0]?.orderNumber && (
                                        <span className="inline-block mr-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-success/15 text-success">#{route.orderedStops[0].orderNumber}</span>
                                    )}
                                    {route.orderedStops[0]?.address}
                                </p>
                            </div>
                            <span className="text-xs text-surface-400">{t('summary.now', lang)}</span>
                        </div>

                        {route.legs.map((leg, i) => {
                            const stop = route.orderedStops[i + 1];
                            return (
                                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                                    <div className={`stop-badge ${i === route.legs.length - 1 ? 'bg-primary-500' : 'bg-primary-400'}`}>
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-surface-800 dark:text-surface-200 truncate">
                                            {stop?.orderNumber && (
                                                <span className="inline-block mr-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary-500/15 text-primary-600 dark:text-primary-400">#{stop.orderNumber}</span>
                                            )}
                                            {leg.address}
                                        </p>
                                        <p className="text-xs text-surface-400">{leg.distance} · {leg.duration}</p>
                                    </div>
                                    <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">{leg.eta}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Navigation buttons */}
            <button onClick={onStartNavigation} className="btn-success w-full py-4 text-base flex items-center justify-center gap-2.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
                {t('nav.startNavigation', lang)}
            </button>
            <button onClick={onNavigate} className="w-full py-2.5 text-sm flex items-center justify-center gap-2 rounded-xl text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                {t('nav.openGoogleMaps', lang)}
            </button>
        </div>
    );
}


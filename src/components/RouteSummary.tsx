import type { OptimizedRoute } from '../types';
import { t, type Language } from '../i18n';

interface RouteSummaryProps {
    lang: Language;
    route: OptimizedRoute;
    onNavigate: () => void;
}

export default function RouteSummary({ lang, route, onNavigate }: RouteSummaryProps) {
    return (
        <div className="animate-fadeInUp space-y-3">
            {/* Summary card */}
            <div className="gradient-primary rounded-2xl p-5 text-white shadow-xl shadow-primary-600/20">
                <div className="flex items-center gap-2 mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                    <h3 className="font-bold text-base">{t('summary.title', lang)}</h3>
                </div>
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
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-surface-200/50 dark:border-surface-700/50">
                    <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300">{t('summary.stopDetails', lang)}</h4>
                </div>
                <div className="divide-y divide-surface-100 dark:divide-surface-700/50 max-h-[280px] overflow-y-auto">
                    {/* Start */}
                    <div className="flex items-center gap-3 px-4 py-2.5">
                        <div className="stop-badge bg-success">S</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-surface-800 dark:text-surface-200 truncate">{route.orderedStops[0]?.address}</p>
                            <p className="text-xs text-surface-400">{t('summary.start', lang)}</p>
                        </div>
                        <span className="text-xs font-medium text-surface-500">{t('summary.now', lang)}</span>
                    </div>

                    {route.legs.map((leg, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                            <div className={`stop-badge ${i === route.legs.length - 1 ? 'bg-accent-500' : 'bg-primary-500'}`}>
                                {i === route.legs.length - 1 ? 'E' : i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-surface-800 dark:text-surface-200 truncate">{leg.address}</p>
                                <p className="text-xs text-surface-400">{leg.distance} · {leg.duration}</p>
                            </div>
                            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 flex-shrink-0">{leg.eta}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigate button */}
            <button
                onClick={onNavigate}
                className="w-full py-4 rounded-2xl gradient-accent text-white font-bold text-base shadow-xl shadow-accent-500/25 hover:shadow-accent-500/40 transition-all flex items-center justify-center gap-2.5"
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
                {t('summary.navigate', lang)}
            </button>
        </div>
    );
}

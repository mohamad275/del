import type { OptimizedRoute } from '../types';

interface RouteSummaryProps {
    route: OptimizedRoute;
    onNavigate: () => void;
}

/**
 * Route summary card showing total distance, time, per-stop ETAs,
 * and a navigation button to open Google Maps.
 */
export default function RouteSummary({ route, onNavigate }: RouteSummaryProps) {
    return (
        <div className="animate-fadeInUp space-y-4">
            {/* Summary header card */}
            <div className="gradient-primary rounded-2xl p-5 text-white shadow-xl shadow-primary-600/20">
                <div className="flex items-center gap-2 mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    <h3 className="font-bold text-base">Route Summary</h3>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <p className="text-2xl font-bold">{route.orderedStops.length - 1}</p>
                        <p className="text-xs text-white/70">Stops</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold">{route.totalDistance}</p>
                        <p className="text-xs text-white/70">Distance</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold">{route.totalDuration}</p>
                        <p className="text-xs text-white/70">Duration</p>
                    </div>
                </div>
            </div>

            {/* Per-stop breakdown */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-200/50 dark:border-surface-700/50">
                    <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300">
                        Stop Details
                    </h4>
                </div>
                <div className="divide-y divide-surface-100 dark:divide-surface-700/50 max-h-[300px] overflow-y-auto">
                    {/* Starting point */}
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="stop-badge bg-success">S</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-surface-800 dark:text-surface-200 truncate">
                                {route.orderedStops[0]?.address}
                            </p>
                            <p className="text-xs text-surface-400">Start</p>
                        </div>
                        <span className="text-xs font-medium text-surface-500 dark:text-surface-400">
                            Now
                        </span>
                    </div>

                    {route.legs.map((leg, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                            <div className={`stop-badge ${i === route.legs.length - 1 ? 'bg-accent-500' : 'bg-primary-500'
                                }`}>
                                {i === route.legs.length - 1 ? 'E' : i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-surface-800 dark:text-surface-200 truncate">
                                    {leg.address}
                                </p>
                                <p className="text-xs text-surface-400">
                                    {leg.distance} · {leg.duration}
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 flex-shrink-0">
                                ETA {leg.eta}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigate button */}
            <button
                onClick={onNavigate}
                className="w-full py-4 rounded-2xl gradient-accent text-white font-bold text-base shadow-xl shadow-accent-500/25 hover:shadow-accent-500/40 transition-all duration-200 flex items-center justify-center gap-2.5"
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                </svg>
                Start Navigation
            </button>
        </div>
    );
}

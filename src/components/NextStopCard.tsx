import type { DeliveryStop, StopStatus } from '../types';
import { t, type Language } from '../i18n';

interface NextStopCardProps {
    lang: Language;
    stop: DeliveryStop;
    stopIndex: number;
    totalStops: number;
    completedStops: number;
    stopStatuses: StopStatus[];
    distance: number;       // meters
    eta: string;
    isNearStop: boolean;
    onDelivered: () => void;
    onSkip: () => void;
}

export default function NextStopCard({
    lang,
    stop,
    stopIndex,
    totalStops,
    completedStops,
    stopStatuses,
    distance,
    eta,
    isNearStop,
    onDelivered,
    onSkip,
}: NextStopCardProps) {
    const distanceText = distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`;

    return (
        <div className={`nav-bottom-card ${isNearStop ? 'nav-bottom-card--near' : ''}`}>
            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 mb-3">
                {stopStatuses.slice(1).map((status, i) => (
                    <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all ${status === 'delivered' ? 'bg-success scale-110' :
                                status === 'current' ? 'bg-primary-500 scale-125 ring-2 ring-primary-200' :
                                    status === 'skipped' ? 'bg-surface-300' :
                                        'bg-surface-200 dark:bg-surface-600'
                            }`}
                    />
                ))}
            </div>

            {/* Stop info */}
            <div className="flex items-start gap-3 mb-3">
                <div className="stop-badge bg-primary-500 mt-0.5">{stopIndex}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {stop.orderNumber && (
                            <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-full bg-primary-500 text-white">
                                #{stop.orderNumber}
                            </span>
                        )}
                        <span className="text-xs text-surface-400">
                            {t('nav.stopOf', lang).replace('{n}', String(stopIndex)).replace('{total}', String(totalStops))}
                        </span>
                    </div>
                    <p className="text-sm font-medium text-surface-800 dark:text-surface-200 leading-snug">
                        {stop.address}
                    </p>
                </div>
            </div>

            {/* ETA & Distance */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800">
                    <p className="text-lg font-bold text-primary-600 dark:text-primary-400">{eta}</p>
                    <p className="text-[10px] text-surface-400 font-medium uppercase">{t('nav.eta', lang)}</p>
                </div>
                <div className="text-center px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800">
                    <p className="text-lg font-bold text-surface-700 dark:text-surface-300">{distanceText}</p>
                    <p className="text-[10px] text-surface-400 font-medium uppercase">{t('nav.distance', lang)}</p>
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
                <button onClick={onSkip} className="flex-shrink-0 px-4 py-3 rounded-xl text-sm font-semibold bg-surface-100 dark:bg-surface-700 text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors">
                    {t('nav.skip', lang)}
                </button>
                <button
                    onClick={onDelivered}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all ${isNearStop
                            ? 'bg-success hover:bg-success/90 shadow-lg shadow-success/30 animate-pulse'
                            : 'bg-primary-500 hover:bg-primary-600'
                        }`}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {t('nav.delivered', lang)}
                </button>
            </div>

            {/* Completed count */}
            <p className="text-center text-xs text-surface-400 mt-2">
                {t('nav.completed', lang).replace('{n}', String(completedStops)).replace('{total}', String(totalStops))}
            </p>
        </div>
    );
}

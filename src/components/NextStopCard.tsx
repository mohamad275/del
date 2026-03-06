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

            <div className="flex items-start gap-3 mb-3">
                <div className="stop-badge bg-primary-500 mt-0.5">{stopIndex}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {stop.orderNumber && (
                            <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-full bg-primary-500 text-white">
                                #{stop.orderNumber}
                            </span>
                        )}
                        {stop.phone && (() => {
                            const cleaned = stop.phone.replace(/[^0-9]/g, '');
                            return cleaned ? (
                                <a
                                    href={`https://wa.me/${cleaned}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-500/20 hover:bg-green-500/30 transition-colors"
                                    title={`WhatsApp: ${stop.phone}`}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                </a>
                            ) : null;
                        })()}
                        {stop.phone && (() => {
                            const cleaned = stop.phone.replace(/[^0-9+]/g, '');
                            return cleaned ? (
                                <a
                                    href={`tel:${cleaned}`}
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/20 hover:bg-blue-500/30 transition-colors"
                                    title={`Call: ${stop.phone}`}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                </a>
                            ) : null;
                        })()}
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

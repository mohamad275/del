import { useState, useRef, useCallback } from 'react';
import type { OptimizedRoute } from '../types';
import { t, type Language } from '../i18n';

interface RouteSummaryProps {
    lang: Language;
    route: OptimizedRoute;
    onNavigate: () => void;
    onStartNavigation: () => void;
    onRemoveStop?: (stopIndex: number) => void;
}

// WhatsApp icon component
function WhatsAppLink({ phone }: { phone: string }) {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (!cleaned) return null;
    return (
        <a
            href={`https://wa.me/${cleaned}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/15 hover:bg-green-500/25 transition-colors flex-shrink-0"
            title={`WhatsApp: ${phone}`}
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
        </a>
    );
}

// Phone call icon component
function PhoneCallLink({ phone }: { phone: string }) {
    const cleaned = phone.replace(/[^0-9+]/g, '');
    if (!cleaned) return null;
    return (
        <a
            href={`tel:${cleaned}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/15 hover:bg-blue-500/25 transition-colors flex-shrink-0"
            title={`Call: ${phone}`}
        >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
        </a>
    );
}

// Swipeable row component
function SwipeableStopRow({
    children,
    onDelete,
}: {
    children: React.ReactNode;
    onDelete: () => void;
}) {
    const rowRef = useRef<HTMLDivElement>(null);
    const [offsetX, setOffsetX] = useState(0);
    const [swiping, setSwiping] = useState(false);
    const startXRef = useRef(0);
    const currentXRef = useRef(0);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        startXRef.current = e.touches[0].clientX;
        currentXRef.current = e.touches[0].clientX;
        setSwiping(true);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!swiping) return;
        currentXRef.current = e.touches[0].clientX;
        const diff = startXRef.current - currentXRef.current;
        // Only allow swipe left (positive diff)
        if (diff > 0) {
            setOffsetX(Math.min(diff, 120));
        } else {
            setOffsetX(0);
        }
    }, [swiping]);

    const handleTouchEnd = useCallback(() => {
        setSwiping(false);
        if (offsetX > 80) {
            // Swipe far enough → delete with animation
            setOffsetX(300);
            setTimeout(() => onDelete(), 250);
        } else {
            setOffsetX(0);
        }
    }, [offsetX, onDelete]);

    // Mouse support for desktop testing
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        startXRef.current = e.clientX;
        currentXRef.current = e.clientX;
        setSwiping(true);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!swiping) return;
        currentXRef.current = e.clientX;
        const diff = startXRef.current - currentXRef.current;
        if (diff > 0) {
            setOffsetX(Math.min(diff, 120));
        } else {
            setOffsetX(0);
        }
    }, [swiping]);

    const handleMouseUp = useCallback(() => {
        if (!swiping) return;
        setSwiping(false);
        if (offsetX > 80) {
            setOffsetX(300);
            setTimeout(() => onDelete(), 250);
        } else {
            setOffsetX(0);
        }
    }, [swiping, offsetX, onDelete]);

    return (
        <div className="swipeable-row-container" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Delete background */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(to left, #ef4444, #f87171)',
                    borderRadius: '12px',
                    opacity: Math.min(offsetX / 60, 1),
                    transition: swiping ? 'none' : 'opacity 0.2s ease',
                }}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
            </div>
            {/* Content row */}
            <div
                ref={rowRef}
                style={{
                    transform: `translateX(-${offsetX}px)`,
                    transition: swiping ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    position: 'relative',
                    zIndex: 1,
                    cursor: 'grab',
                    userSelect: 'none',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {children}
            </div>
        </div>
    );
}

export default function RouteSummary({ lang, route, onNavigate, onStartNavigation, onRemoveStop }: RouteSummaryProps) {
    const openGoogleMaps = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

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
                        {/* Start stop */}
                        <div
                            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                            onClick={() => route.orderedStops[0]?.location && openGoogleMaps(route.orderedStops[0].location.lat, route.orderedStops[0].location.lng)}
                        >
                            <div className="stop-badge bg-success">S</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-surface-800 dark:text-surface-200 truncate">
                                    <span className="inline-block mr-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-success/15 text-success">{lang === 'ar' ? 'البداية' : 'Start'}</span>
                                    {route.orderedStops[0]?.address}
                                </p>
                            </div>
                            <span className="text-xs text-surface-400">{t('summary.now', lang)}</span>
                            {/* Google Maps arrow indicator */}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="flex-shrink-0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                        </div>

                        {/* Optimized stops with swipe-to-delete */}
                        {route.legs.map((leg, i) => {
                            const stop = route.orderedStops[i + 1];
                            const stopRow = (
                                <div
                                    key={stop?.id || i}
                                    className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-surface-900 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                                    onClick={() => stop?.location && openGoogleMaps(stop.location.lat, stop.location.lng)}
                                >
                                    <div className={`stop-badge ${i === route.legs.length - 1 ? 'bg-primary-500' : 'bg-primary-400'}`}>
                                        {i === route.legs.length - 1 && !stop?.orderNumber ? (lang === 'ar' ? 'N' : 'E') : (i + 1)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-surface-800 dark:text-surface-200 truncate">
                                            {i === route.legs.length - 1 && !stop?.orderNumber ? (
                                                <span className="inline-block mr-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary-500/15 text-primary-600 dark:text-primary-400">{lang === 'ar' ? 'النهاية' : 'End'}</span>
                                            ) : stop?.orderNumber ? (
                                                <span className="inline-block mr-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-primary-500/15 text-primary-600 dark:text-primary-400">#{stop.orderNumber}</span>
                                            ) : null}
                                            {stop?.houseNumber && (
                                                <span className="inline-block mr-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">🏠{stop.houseNumber}</span>
                                            )}
                                            {leg.address}
                                        </p>
                                        <p className="text-xs text-surface-400">{leg.distance} · {leg.duration}</p>
                                    </div>
                                    {stop?.phone && <><WhatsAppLink phone={stop.phone} /><PhoneCallLink phone={stop.phone} /></>}
                                    <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">{leg.eta}</span>
                                    {/* Google Maps arrow indicator */}
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="flex-shrink-0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                </div>
                            );

                            if (onRemoveStop) {
                                return (
                                    <SwipeableStopRow key={stop?.id || i} onDelete={() => onRemoveStop(i + 1)}>
                                        {stopRow}
                                    </SwipeableStopRow>
                                );
                            }

                            return stopRow;
                        })}
                    </div>
                </div>
            </div>

            {/* Navigation buttons */}
            <button onClick={onNavigate} className="w-full py-2.5 text-sm flex items-center justify-center gap-2 rounded-xl text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                {t('nav.openGoogleMaps', lang)}
            </button>
        </div>
    );
}

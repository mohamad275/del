import { useState, useEffect } from 'react';

interface HeaderProps {
    onSavedRoutesToggle: () => void;
    showSavedRoutes: boolean;
}

/**
 * App header with logo, dark mode toggle, and saved routes button.
 */
export default function Header({ onSavedRoutesToggle, showSavedRoutes }: HeaderProps) {
    const [dark, setDark] = useState(() => {
        return localStorage.getItem('routeflow_dark') === 'true';
    });

    useEffect(() => {
        document.body.classList.toggle('dark', dark);
        localStorage.setItem('routeflow_dark', String(dark));
    }, [dark]);

    return (
        <header className="sticky top-0 z-50 glass-card border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary-500/25">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                            <circle cx="12" cy="9" r="2.5" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-surface-900 dark:text-white leading-none">
                            RouteFlow
                        </h1>
                        <p className="text-[10px] font-medium text-surface-400 dark:text-surface-500 tracking-wide uppercase">
                            Delivery Optimizer
                        </p>
                    </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2">
                    {/* Saved Routes */}
                    <button
                        onClick={onSavedRoutesToggle}
                        className={`p-2 rounded-xl transition-all duration-200 ${showSavedRoutes
                                ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400'
                                : 'text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 dark:hover:text-surface-300'
                            }`}
                        title="Saved Routes"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                    </button>

                    {/* Dark mode toggle */}
                    <button
                        onClick={() => setDark(!dark)}
                        className="p-2 rounded-xl text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 dark:hover:text-surface-300 transition-all duration-200"
                        title="Toggle dark mode"
                    >
                        {dark ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}

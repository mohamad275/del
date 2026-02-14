import { useState, useEffect } from 'react';
import { t, type Language } from '../i18n';

interface HeaderProps {
    lang: Language;
    onToggleLanguage: () => void;
    onSavedRoutesToggle: () => void;
    showSavedRoutes: boolean;
}

export default function Header({ lang, onToggleLanguage, onSavedRoutesToggle, showSavedRoutes }: HeaderProps) {
    const [dark, setDark] = useState(() => localStorage.getItem('routeflow_dark') === 'true');

    useEffect(() => {
        document.body.classList.toggle('dark', dark);
        localStorage.setItem('routeflow_dark', String(dark));
    }, [dark]);

    return (
        <header className="sticky top-0 z-50 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700">
            <div className="max-w-7xl mx-auto px-4 h-[56px] flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                            <circle cx="12" cy="9" r="2.5" />
                        </svg>
                    </div>
                    <span className="text-lg font-bold text-surface-900 dark:text-white">{t('app.name', lang)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    {/* Language */}
                    <button onClick={onToggleLanguage} className="px-3 py-1.5 rounded-lg text-xs font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 transition-colors">
                        {t('header.language', lang)}
                    </button>

                    {/* Saved */}
                    <button onClick={onSavedRoutesToggle} className={`p-2 rounded-lg transition-colors ${showSavedRoutes ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800'}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                    </button>

                    {/* Dark mode */}
                    <button onClick={() => setDark(!dark)} className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                        {dark ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}

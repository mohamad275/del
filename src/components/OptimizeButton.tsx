import { t, type Language } from '../i18n';

interface OptimizeButtonProps {
    lang: Language;
    onClick: () => void;
    isOptimizing: boolean;
    disabled: boolean;
    stopCount: number;
}

export default function OptimizeButton({ lang, onClick, isOptimizing, disabled, stopCount }: OptimizeButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled || isOptimizing}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-3 ${disabled
                    ? 'bg-surface-200 text-surface-400 dark:bg-surface-700 dark:text-surface-500 cursor-not-allowed'
                    : isOptimizing
                        ? 'gradient-primary text-white shadow-xl shadow-primary-500/30 cursor-wait'
                        : 'gradient-primary text-white shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.01] active:scale-[0.99]'
                }`}
        >
            {isOptimizing ? (
                <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('optimize.optimizing', lang)} {stopCount} {t('optimize.stops', lang)}...
                </>
            ) : (
                <>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                    {disabled
                        ? t('optimize.addStops', lang)
                        : `${t('optimize.button', lang)} (${stopCount} ${t('optimize.stops', lang)})`
                    }
                </>
            )}
        </button>
    );
}

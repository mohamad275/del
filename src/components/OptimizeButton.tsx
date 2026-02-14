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
        <button onClick={onClick} disabled={disabled || isOptimizing} className="btn-primary w-full py-4 text-base flex items-center justify-center gap-3">
            {isOptimizing ? (
                <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('optimize.optimizing', lang)}...
                </>
            ) : (
                <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                    {disabled ? t('optimize.addStops', lang) : `${t('optimize.button', lang)} (${stopCount})`}
                </>
            )}
        </button>
    );
}

import type { NavigationStep } from '../types';

interface TurnInstructionsProps {
    currentStep: NavigationStep | null;
    nextStep: NavigationStep | null;
}

/** Google Maps-style maneuver icons (white on green) */
function ManeuverIcon({ maneuver }: { maneuver?: string }) {
    const size = 32;
    const color = 'white';

    switch (maneuver) {
        case 'turn-left':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="14 6 8 6 8 18" /><polyline points="12 4 8 6 12 8" />
                </svg>
            );
        case 'turn-right':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="10 6 16 6 16 18" /><polyline points="12 4 16 6 12 8" />
                </svg>
            );
        case 'turn-slight-left':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="14 18 14 10 7 4" /><polyline points="11 3 7 4 8 8" />
                </svg>
            );
        case 'turn-slight-right':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="10 18 10 10 17 4" /><polyline points="13 3 17 4 16 8" />
                </svg>
            );
        case 'uturn-left':
        case 'uturn-right':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 14L4 9l5-5" /><path d="M4 9h10a4 4 0 0 1 0 8h-1" />
                </svg>
            );
        case 'roundabout-left':
        case 'roundabout-right':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="10" r="4" /><path d="M12 14v6" /><polyline points="9 12 12 14 15 12" />
                </svg>
            );
        case 'merge':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4l6 8 6-8" /><path d="M12 12v8" />
                </svg>
            );
        case 'fork-left':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20V10L6 4" /><polyline points="8 3 6 4 7 7" />
                </svg>
            );
        case 'fork-right':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20V10l6-6" /><polyline points="16 3 18 4 17 7" />
                </svg>
            );
        case 'ramp-left':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 20V10L8 4" /><polyline points="11 3 8 4 9 7" />
                </svg>
            );
        case 'ramp-right':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 20V10l8-6" /><polyline points="13 3 16 4 15 7" />
                </svg>
            );
        default: // straight / head
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="8 9 12 5 16 9" />
                </svg>
            );
    }
}

export default function TurnInstructions({ currentStep, nextStep }: TurnInstructionsProps) {
    if (!currentStep) return null;

    return (
        <div className="nav-turn-banner">
            {/* Google Maps green header bar */}
            <div className="flex items-center gap-4">
                <div className="nav-turn-icon">
                    <ManeuverIcon maneuver={currentStep.maneuver} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-base leading-tight" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                        {currentStep.instruction}
                    </p>
                    <p className="text-white/80 text-sm font-medium mt-1">{currentStep.distance}</p>
                </div>
            </div>
            {/* "Then" preview (like Google Maps) */}
            {nextStep && (
                <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-white/15">
                    <ManeuverIcon maneuver={nextStep.maneuver} />
                    <p className="text-white/60 text-xs truncate flex-1">{nextStep.instruction}</p>
                    <span className="text-white/50 text-xs font-medium whitespace-nowrap">{nextStep.distance}</span>
                </div>
            )}
        </div>
    );
}

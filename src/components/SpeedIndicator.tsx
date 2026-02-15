interface SpeedIndicatorProps {
    speed: number; // km/h
}

export default function SpeedIndicator({ speed }: SpeedIndicatorProps) {
    return (
        <div className="nav-speed-badge">
            <span className="text-lg font-bold leading-none">{Math.round(speed)}</span>
            <span className="text-[9px] text-white/60 font-medium">km/h</span>
        </div>
    );
}

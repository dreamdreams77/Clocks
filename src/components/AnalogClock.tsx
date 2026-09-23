import { useMemo } from 'react';

export interface AnalogClockProps {
  now: Date;
  target?: Date | null;
  size?: number;
  showSeconds?: boolean;
  showArc?: boolean;
  reducedMotion?: boolean;
  ringColor?: string;
  faceColor?: string;
  hourColor?: string;
  minuteColor?: string;
  secondColor?: string;
  tickColor?: string;
  arcColor?: string;
  targetColor?: string;
  label?: string;
  className?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  let sweep = ((endAngle - startAngle) % 360 + 360) % 360;
  if (sweep < 0.01) sweep = 359.99; // full-circle guard, avoid degenerate 0-length arc
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, startAngle + sweep);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function hourAngle(d: Date): number {
  return ((d.getHours() % 12) + d.getMinutes() / 60 + d.getSeconds() / 3600) * 30;
}
function minuteAngle(d: Date): number {
  return (d.getMinutes() + d.getSeconds() / 60) * 6;
}
function secondAngle(d: Date): number {
  return d.getSeconds() * 6;
}

const NUMERALS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export function AnalogClock({
  now,
  target,
  size = 220,
  showSeconds = false,
  showArc = true,
  reducedMotion = false,
  ringColor = 'var(--clock-ring, #ffffff)',
  faceColor = 'var(--clock-face, rgba(255,255,255,0.92))',
  hourColor = 'var(--clock-hour, #2b2560)',
  minuteColor = 'var(--clock-minute, #2b2560)',
  secondColor = 'var(--clock-second, #e0663f)',
  tickColor = 'var(--clock-tick, rgba(43,37,96,0.35))',
  arcColor = 'var(--clock-arc, #f2b134)',
  targetColor = 'var(--clock-target, #e0663f)',
  label,
  className,
}: AnalogClockProps) {
  const cx = 100;
  const cy = 100;
  const r = 90;

  const hAngle = hourAngle(now);
  const mAngle = minuteAngle(now);
  const sAngle = secondAngle(now);
  const targetHAngle = target ? hourAngle(target) : null;

  const arcPath = useMemo(() => {
    if (!showArc || targetHAngle == null) return null;
    return describeArc(cx, cy, 78, hAngle, targetHAngle);
  }, [showArc, targetHAngle, hAngle]);

  const transition = reducedMotion ? 'none' : 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={label ?? `Clock showing ${now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`}
    >
      <circle cx={cx} cy={cy} r={r} fill={faceColor} stroke={ringColor} strokeWidth={6} />

      {arcPath && (
        <path d={arcPath} fill="none" stroke={arcColor} strokeWidth={8} strokeLinecap="round" opacity={0.55} />
      )}

      {NUMERALS.map((n) => {
        const angle = n * 30;
        const tickInner = polarToCartesian(cx, cy, 78, angle);
        const tickOuter = polarToCartesian(cx, cy, 86, angle);
        const numPos = polarToCartesian(cx, cy, 66, angle);
        return (
          <g key={n}>
            <line x1={tickInner.x} y1={tickInner.y} x2={tickOuter.x} y2={tickOuter.y} stroke={tickColor} strokeWidth={n % 3 === 0 ? 3.5 : 2} strokeLinecap="round" />
            <text x={numPos.x} y={numPos.y} textAnchor="middle" dominantBaseline="central" fontSize={n % 3 === 0 ? 15 : 11} fontWeight={n % 3 === 0 ? 700 : 500} fill={hourColor} opacity={n % 3 === 0 ? 0.85 : 0.5}>
              {n}
            </text>
          </g>
        );
      })}

      {targetHAngle != null && (
        <g style={{ transition, transformOrigin: '100px 100px', transform: `rotate(${targetHAngle}deg)` }}>
          <circle cx={cx} cy={14} r={5} fill={targetColor} stroke="white" strokeWidth={1.5} />
        </g>
      )}

      <g style={{ transition, transformOrigin: '100px 100px', transform: `rotate(${hAngle}deg)` }}>
        <rect x={cx - 3.5} y={cy - 46} width={7} height={50} rx={3.5} fill={hourColor} />
      </g>
      <g style={{ transition, transformOrigin: '100px 100px', transform: `rotate(${mAngle}deg)` }}>
        <rect x={cx - 2.5} y={cy - 68} width={5} height={72} rx={2.5} fill={minuteColor} />
      </g>
      {showSeconds && (
        <g style={{ transition: reducedMotion ? 'none' : 'transform 0.15s linear', transformOrigin: '100px 100px', transform: `rotate(${sAngle}deg)` }}>
          <line x1={cx} y1={cy + 16} x2={cx} y2={cy - 74} stroke={secondColor} strokeWidth={2} strokeLinecap="round" />
        </g>
      )}

      <circle cx={cx} cy={cy} r={6} fill={hourColor} />
      <circle cx={cx} cy={cy} r={2.5} fill="white" />
    </svg>
  );
}

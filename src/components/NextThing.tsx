import type { Clock } from '../types';
import type { ClockState } from '../engine/schedule';
import { AnalogClock } from './AnalogClock';
import { friendlyDuration } from '../engine/time';

export interface NextThingProps {
  now: Date;
  entry: { clock: Clock; state: ClockState } | null;
  reducedMotion?: boolean;
  onDone?: () => void;
}

export function NextThing({ now, entry, reducedMotion, onDone }: NextThingProps) {
  if (!entry) {
    return (
      <div className="hero">
        <div className="hero-icons" aria-hidden="true">🎉</div>
        <div className="hero-title">All done for now!</div>
        <div className="hero-sub">Nothing else to wait for right now.</div>
      </div>
    );
  }
  const { clock, state } = entry;
  const ready = state.status === 'ready';
  return (
    <div className="hero">
      <div className="hero-icons" aria-hidden="true">{ready ? '❤️' : clock.icon}</div>
      <div className="hero-sub">{ready ? '' : 'NEXT'}</div>
      <div className="hero-title">{clock.name}</div>
      {state.targetInstant && (
        <div className="hero-clock-wrap">
          <AnalogClock now={now} target={state.targetInstant} size={220} reducedMotion={reducedMotion} />
        </div>
      )}
      <div className="hero-countdown">
        {ready ? `${clock.name} time! ❤️` : friendlyDuration(state.msRemaining)}
      </div>
      {ready && onDone && (
        <button className="big-button" onClick={onDone}>
          Done! 🎉
        </button>
      )}
    </div>
  );
}

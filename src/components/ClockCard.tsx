import type { Clock } from '../types';
import type { ClockState } from '../engine/schedule';
import { AnalogClock } from './AnalogClock';
import { friendlyDuration, friendlyClockTime } from '../engine/time';

export interface ClockCardProps {
  clock: Clock;
  state: ClockState;
  now: Date;
  reducedMotion?: boolean;
  faceStyle: 'analog' | 'digital' | 'countdown' | 'analogCountdown';
  onDone?: () => void;
}

function statusText(clock: Clock, state: ClockState): string {
  switch (state.status) {
    case 'ready':
      return `${clock.name} time! ❤️`;
    case 'completed':
      return 'All done ✓';
    case 'waitingForWake':
      return `After you wake up`;
    case 'upcoming':
      return friendlyDuration(state.msRemaining) + ' to go';
    case 'idle':
      return 'Not started';
    default:
      return '';
  }
}

export function ClockCard({ clock, state, now, reducedMotion, faceStyle, onDone }: ClockCardProps) {
  const showAnalog = faceStyle === 'analog' || faceStyle === 'analogCountdown';
  const showCountdownText = faceStyle === 'countdown' || faceStyle === 'analogCountdown' || faceStyle === 'digital';

  return (
    <div
      className={`clock-card${state.status === 'ready' ? ' is-ready' : ''}${state.status === 'completed' ? ' is-completed' : ''}`}
      role="group"
      aria-label={`${clock.name}: ${statusText(clock, state)}`}
    >
      <div style={{ fontSize: '1.8rem' }} aria-hidden="true">{clock.icon}</div>
      {showAnalog && state.targetInstant && (
        <AnalogClock now={now} target={state.targetInstant} size={140} reducedMotion={reducedMotion} />
      )}
      {faceStyle === 'digital' && state.targetInstant && (
        <div style={{ fontSize: '1.6rem', fontWeight: 800, margin: '8px 0' }}>{friendlyClockTime(state.targetInstant)}</div>
      )}
      <div className="clock-card-name">{clock.name}</div>
      <div className={`clock-card-status${state.status === 'ready' ? ' is-ready-text' : ''}`}>
        {state.status === 'completed' ? (
          <span className="completed-badge" aria-hidden="true">✓</span>
        ) : (
          showCountdownText && (
            <span>
              {state.status === 'upcoming' ? '⏳ ' : state.status === 'ready' ? '❤️ ' : ''}
              {statusText(clock, state)}
            </span>
          )
        )}
      </div>
      {state.status === 'ready' && onDone && (
        <button className="done-btn" onClick={onDone}>
          Done! 🎉
        </button>
      )}
    </div>
  );
}

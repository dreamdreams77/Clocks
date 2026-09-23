import type { Clock } from '../types';
import type { ClockState, SleepState } from '../engine/schedule';
import { friendlyClockTime } from '../engine/time';

export interface TimelineEntry {
  clock: Clock;
  state: ClockState;
}

export interface TimelineViewProps {
  sleepClock: Clock | null;
  wakeClock: Clock | null;
  sleepState: SleepState;
  entries: TimelineEntry[];
}

export function TimelineView({ sleepClock, wakeClock, sleepState, entries }: TimelineViewProps) {
  const rows: { icon: string; name: string; time: string; done: boolean; current: boolean }[] = [];

  if (sleepClock) {
    rows.push({
      icon: sleepClock.icon,
      name: sleepClock.name,
      time: friendlyClockTime(sleepState.bedtimeInstant),
      done: sleepState.mode === 'day',
      current: sleepState.mode === 'night',
    });
  }
  if (wakeClock) {
    rows.push({
      icon: wakeClock.icon,
      name: wakeClock.name,
      time: friendlyClockTime(sleepState.wakeInstant),
      done: sleepState.mode === 'day',
      current: sleepState.mode === 'day' && sleepState.msSinceWake < 2 * 60000,
    });
  }
  for (const { clock, state } of entries) {
    if (state.status === 'inactive' || state.status === 'idle') continue;
    rows.push({
      icon: clock.icon,
      name: clock.name,
      time: state.targetInstant ? friendlyClockTime(state.targetInstant) : '',
      done: state.status === 'completed',
      current: state.status === 'ready',
    });
  }

  return (
    <ol className="timeline" aria-label="Today's routine, in order">
      {rows.map((row, i) => (
        <li className="timeline-item" key={`${row.name}-${i}`}>
          {i < rows.length - 1 && <span className="timeline-line" aria-hidden="true" />}
          <span className={`timeline-icon${row.current ? ' is-current' : ''}${row.done ? ' is-done' : ''}`} aria-hidden="true">
            {row.done ? '✓' : row.icon}
          </span>
          <span className="timeline-text">
            <span className="timeline-name">{row.name}</span>
            <span className="timeline-time">{row.time}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

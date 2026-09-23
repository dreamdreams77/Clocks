import type { SleepLogEntry } from '../types';
import { friendlyClockTime, msToDurationParts } from '../engine/time';

export function SleepLogView({ entries }: { entries: SleepLogEntry[] }) {
  const last = entries.find((e) => e.wakeAt != null) ?? entries[0];
  if (!last) return null;
  const duration = last.wakeAt ? last.wakeAt - last.bedtimeAt : null;
  const { hours, minutes } = duration ? msToDurationParts(duration) : { hours: 0, minutes: 0 };

  return (
    <div className="sleep-log">
      <div className="section-title" style={{ justifyContent: 'center' }}>Last night</div>
      <div className="sleep-log-card">
        <div>🌙 {friendlyClockTime(new Date(last.bedtimeAt))}</div>
        {last.wakeAt != null ? (
          <>
            <div>☀️ {friendlyClockTime(new Date(last.wakeAt))}</div>
            <div style={{ fontWeight: 800, marginTop: 6 }}>{hours}h {minutes}m</div>
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)' }}>Still sleeping…</div>
        )}
      </div>
    </div>
  );
}

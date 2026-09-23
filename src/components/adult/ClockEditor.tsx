import { useState } from 'react';
import type { Clock, RepeatKind, ClockRole, ScheduleType } from '../../types';
import type { Profile } from '../../types';
import { COLOR_SWATCHES } from '../../store/defaultData';
import { DAY_NAMES } from '../../types';
import { RINGTONES, playRingtone, getRingtone } from '../../engine/sound';

export interface ClockEditorProps {
  initial: Clock;
  profiles: Profile[];
  isNew: boolean;
  onSave: (clock: Clock) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const REPEAT_OPTIONS: { value: RepeatKind; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'custom', label: 'Custom days' },
  { value: 'once', label: 'Once' },
];

export function ClockEditor({ initial, profiles, isNew, onSave, onCancel, onDelete }: ClockEditorProps) {
  const [clock, setClock] = useState<Clock>(initial);

  const set = <K extends keyof Clock>(key: K, value: Clock[K]) => setClock((c) => ({ ...c, [key]: value }));

  const toggleCustomDay = (day: number) => {
    const days = clock.repeat.days ?? [];
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
    set('repeat', { ...clock.repeat, days: next });
  };

  const scheduleType = clock.scheduleType;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={isNew ? 'Add clock' : 'Edit clock'}>
      <div className="modal-sheet">
        <h2 style={{ marginTop: 0 }}>{isNew ? '+ Add Clock' : `Edit ${initial.name}`}</h2>

        <div className="form-row">
          <label htmlFor="clock-name">Name</label>
          <input id="clock-name" type="text" value={clock.name} onChange={(e) => set('name', e.target.value)} maxLength={30} />
        </div>

        <div className="form-row">
          <label htmlFor="clock-icon">Icon (emoji)</label>
          <input id="clock-icon" type="text" value={clock.icon} onChange={(e) => set('icon', e.target.value.slice(0, 4))} maxLength={4} style={{ width: 80, fontSize: '1.4rem', textAlign: 'center' }} />
        </div>

        <div className="form-row">
          <label>Color</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(COLOR_SWATCHES).map(([id, hex]) => (
              <button
                key={id}
                type="button"
                onClick={() => set('colorId', id)}
                aria-label={`Color ${id}`}
                aria-pressed={clock.colorId === id}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: hex,
                  border: clock.colorId === id ? '3px solid white' : '2px solid rgba(255,255,255,0.4)',
                  boxShadow: clock.colorId === id ? '0 0 0 3px var(--accent)' : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="clock-type">How is this clock timed?</label>
          <select
            id="clock-type"
            value={scheduleType}
            onChange={(e) => {
              const v = e.target.value as ScheduleType;
              set('scheduleType', v);
              if (v === 'timer') set('role', 'timer' as ClockRole);
            }}
          >
            <option value="fixedTime">Fixed time (e.g. 7:30 AM)</option>
            <option value="durationFromWake">A while after getting up</option>
            <option value="timer">Countdown timer (start now)</option>
          </select>
        </div>

        {scheduleType === 'fixedTime' && (
          <div className="form-row">
            <label htmlFor="clock-time">Time</label>
            <input id="clock-time" type="time" value={clock.time ?? '08:00'} onChange={(e) => set('time', e.target.value)} />
          </div>
        )}

        {(scheduleType === 'durationFromWake' || scheduleType === 'timer') && (
          <div className="form-row">
            <label htmlFor="clock-duration">{scheduleType === 'timer' ? 'Timer length (minutes)' : 'Minutes after wake-up'}</label>
            <input
              id="clock-duration"
              type="number"
              min={1}
              max={720}
              value={clock.durationMinutes ?? 15}
              onChange={(e) => set('durationMinutes', Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </div>
        )}

        {scheduleType !== 'timer' && (
          <div className="form-row">
            <label htmlFor="clock-repeat">Repeat</label>
            <select id="clock-repeat" value={clock.repeat.kind} onChange={(e) => set('repeat', { kind: e.target.value as RepeatKind, days: clock.repeat.days, date: clock.repeat.date })}>
              {REPEAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {clock.repeat.kind === 'custom' && (
              <div className="days-row" style={{ marginTop: 8 }}>
                {DAY_NAMES.map((d, i) => (
                  <button key={d} type="button" className={`day-chip${(clock.repeat.days ?? []).includes(i) ? ' is-active' : ''}`} onClick={() => toggleCustomDay(i)}>
                    {d}
                  </button>
                ))}
              </div>
            )}
            {clock.repeat.kind === 'once' && (
              <input type="date" value={clock.repeat.date ?? ''} onChange={(e) => set('repeat', { ...clock.repeat, date: e.target.value })} style={{ marginTop: 8 }} />
            )}
          </div>
        )}

        {profiles.length > 0 && (
          <div className="form-row">
            <label>Which routine(s)?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400 }}>
                <input type="checkbox" checked={!clock.profileIds || clock.profileIds.length === 0} onChange={() => set('profileIds', [])} />
                All routines
              </label>
              {profiles.map((p) => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={(clock.profileIds ?? []).includes(p.id)}
                    onChange={(e) => {
                      const cur = clock.profileIds ?? [];
                      set('profileIds', e.target.checked ? [...cur, p.id] : cur.filter((id) => id !== p.id));
                    }}
                  />
                  {p.icon} {p.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="switch-row">
          <span>Child can see this clock</span>
          <button
            type="button"
            className={`switch${clock.visibility === 'child' ? ' is-on' : ''}`}
            role="switch"
            aria-checked={clock.visibility === 'child'}
            onClick={() => set('visibility', clock.visibility === 'child' ? 'adultOnly' : 'child')}
          >
            <span className="switch-knob" />
          </button>
        </div>

        <div className="switch-row">
          <span>Play a sound when ready</span>
          <button
            type="button"
            className={`switch${clock.soundEnabled ? ' is-on' : ''}`}
            role="switch"
            aria-checked={clock.soundEnabled}
            onClick={() => set('soundEnabled', !clock.soundEnabled)}
          >
            <span className="switch-knob" />
          </button>
        </div>

        {clock.soundEnabled && (
          <div className="form-row">
            <label htmlFor="clock-ringtone">Ringer sound</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                id="clock-ringtone"
                value={clock.ringtoneId}
                onChange={(e) => set('ringtoneId', e.target.value)}
                style={{ flex: 1 }}
              >
                {RINGTONES.filter((r) => r.id !== 'none').map((r) => (
                  <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="small-btn"
                style={{ minWidth: 60 }}
                onClick={() => playRingtone(clock.ringtoneId)}
                aria-label={`Preview ${getRingtone(clock.ringtoneId).name}`}
              >
                ▶ Play
              </button>
            </div>
          </div>
        )}

        <div className="switch-row">
          <span>Enabled</span>
          <button
            type="button"
            className={`switch${clock.enabled ? ' is-on' : ''}`}
            role="switch"
            aria-checked={clock.enabled}
            onClick={() => set('enabled', !clock.enabled)}
          >
            <span className="switch-knob" />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <button className="big-button" style={{ flex: 1, marginTop: 0 }} onClick={() => onSave(clock)} disabled={!clock.name.trim()}>
            Save
          </button>
          <button className="chip-btn" onClick={onCancel}>Cancel</button>
          {onDelete && (
            <button className="chip-btn" style={{ borderColor: '#ef5d5d', color: '#ffb4b4' }} onClick={onDelete}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

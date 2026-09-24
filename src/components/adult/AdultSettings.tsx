import { useState } from 'react';
import { useStore } from '../../store/AppStore';
import { THEMES } from '../../themes/themes';
import { RINGTONES, playRingtone } from '../../engine/sound';
import { hashPin } from '../../store/persistence';
import { ClockList } from './ClockList';
import { ProfileEditor } from './ProfileEditor';
import type { ClockFaceStyle } from '../../types';

export function AdultSettings({ onExit }: { onExit: () => void }) {
  const { data, updateSettings, updateClock } = useStore();
  const [pinInput, setPinInput] = useState('');
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  const sleepClock = data.clocks.find((c) => c.role === 'sleep');
  const wakeClock = data.clocks.find((c) => c.role === 'wakeup');
  const daddyClock = data.clocks.find((c) => c.id === 'daddy') ?? data.clocks.find((c) => c.name.toLowerCase().includes('daddy'));
  const mummyClock = data.clocks.find((c) => c.id === 'mummy') ?? data.clocks.find((c) => c.name.toLowerCase().includes('mummy'));

  return (
    <div className="adult-screen">
      <div className="top-bar" style={{ maxWidth: 'none', padding: 0, marginBottom: 8 }}>
        <h1 style={{ fontSize: '1.4rem', margin: 0 }}>🔧 Grown-up Settings</h1>
        <button className="icon-btn" onClick={onExit} aria-label="Back to child view">✕</button>
      </div>

      <div className="form-row" style={{ maxWidth: 260 }}>
        <label htmlFor="child-name">Child's name</label>
        <input
          id="child-name"
          type="text"
          placeholder="Add name here"
          value={data.settings.childName}
          onChange={(e) => updateSettings({ childName: e.target.value.slice(0, 30) })}
        />
      </div>

      <div className="section-title">⏰ Quick schedule</div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        {sleepClock && (
          <div className="form-row" style={{ minWidth: 140 }}>
            <label htmlFor="bedtime">🌙 Bedtime</label>
            <input id="bedtime" type="time" value={sleepClock.time ?? '21:00'} onChange={(e) => updateClock(sleepClock.id, { time: e.target.value })} />
          </div>
        )}
        {wakeClock && (
          <div className="form-row" style={{ minWidth: 140 }}>
            <label htmlFor="waketime">☀️ Wake-up</label>
            <input id="waketime" type="time" value={wakeClock.time ?? '07:00'} onChange={(e) => updateClock(wakeClock.id, { time: e.target.value })} />
          </div>
        )}
        {daddyClock && (
          <div className="form-row" style={{ minWidth: 140 }}>
            <label htmlFor="daddytime">👨 Daddy available</label>
            <input id="daddytime" type="time" value={daddyClock.time ?? ''} onChange={(e) => updateClock(daddyClock.id, { time: e.target.value })} />
          </div>
        )}
        {mummyClock && (
          <div className="form-row" style={{ minWidth: 140 }}>
            <label htmlFor="mummytime">👩 Mummy available</label>
            <input id="mummytime" type="time" value={mummyClock.time ?? ''} onChange={(e) => updateClock(mummyClock.id, { time: e.target.value })} />
          </div>
        )}
      </div>

      <ClockList />

      <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '24px 0' }} />
      <ProfileEditor />

      <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '24px 0' }} />
      <div className="section-title">🎨 Theme</div>
      <div className="theme-grid">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={`theme-swatch${data.settings.themeId === t.id ? ' is-active' : ''}`}
            style={{ background: `linear-gradient(160deg, ${t.vars['--bg-from']}, ${t.vars['--bg-to']})` }}
            onClick={() => updateSettings({ themeId: t.id })}
          >
            <span style={{ fontSize: '1.4rem' }} aria-hidden="true">{t.icon}</span>
            {t.name}
          </button>
        ))}
      </div>

      <div className="section-title">🖥 Display</div>
      <div className="form-row">
        <label htmlFor="face-style">Clock style</label>
        <select id="face-style" value={data.settings.clockFaceStyle} onChange={(e) => updateSettings({ clockFaceStyle: e.target.value as ClockFaceStyle })}>
          <option value="analogCountdown">Analog + simple countdown text</option>
          <option value="analog">Analog only</option>
          <option value="digital">Large digital</option>
          <option value="countdown">Countdown text only</option>
        </select>
      </div>
      <div className="form-row">
        <label htmlFor="child-view">Child screen shows</label>
        <select id="child-view" value={data.settings.childViewMode} onChange={(e) => updateSettings({ childViewMode: e.target.value as 'all' | 'next' })}>
          <option value="all">All active clocks</option>
          <option value="next">Only the next thing</option>
        </select>
      </div>

      <div className="switch-row">
        <span>Show visual timeline option</span>
        <button className={`switch${data.settings.showTimeline ? ' is-on' : ''}`} role="switch" aria-checked={data.settings.showTimeline} onClick={() => updateSettings({ showTimeline: !data.settings.showTimeline })}>
          <span className="switch-knob" />
        </button>
      </div>
      <div className="switch-row">
        <span>Sounds</span>
        <button className={`switch${data.settings.soundEnabled ? ' is-on' : ''}`} role="switch" aria-checked={data.settings.soundEnabled} onClick={() => updateSettings({ soundEnabled: !data.settings.soundEnabled })}>
          <span className="switch-knob" />
        </button>
      </div>
      {data.settings.soundEnabled && (
        <div style={{ marginBottom: 8 }}>
          <p className="list-item-sub" style={{ marginBottom: 8 }}>
            Preview the ringer sounds — pick which one plays per clock when you edit it.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {RINGTONES.filter((r) => r.id !== 'none').map((r) => (
              <button key={r.id} type="button" className="chip-btn" onClick={() => playRingtone(r.id)}>
                {r.icon} {r.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="switch-row">
        <span>Read clock names out loud</span>
        <button className={`switch${data.settings.readAloudEnabled ? ' is-on' : ''}`} role="switch" aria-checked={data.settings.readAloudEnabled} onClick={() => updateSettings({ readAloudEnabled: !data.settings.readAloudEnabled })}>
          <span className="switch-knob" />
        </button>
      </div>
      <p className="list-item-sub" style={{ marginTop: -6, marginBottom: 8 }}>
        Says things like "Breakfast time!" out loud when a clock is ready — helpful before your child can read.
      </p>

      <div className="section-title">♿ Accessibility</div>
      <div className="switch-row">
        <span>Large text</span>
        <button className={`switch${data.settings.largeText ? ' is-on' : ''}`} role="switch" aria-checked={data.settings.largeText} onClick={() => updateSettings({ largeText: !data.settings.largeText })}>
          <span className="switch-knob" />
        </button>
      </div>
      <div className="switch-row">
        <span>Reduced motion</span>
        <button className={`switch${data.settings.reducedMotion ? ' is-on' : ''}`} role="switch" aria-checked={data.settings.reducedMotion} onClick={() => updateSettings({ reducedMotion: !data.settings.reducedMotion })}>
          <span className="switch-knob" />
        </button>
      </div>
      <div className="switch-row">
        <span>High contrast</span>
        <button className={`switch${data.settings.highContrast ? ' is-on' : ''}`} role="switch" aria-checked={data.settings.highContrast} onClick={() => updateSettings({ highContrast: !data.settings.highContrast })}>
          <span className="switch-knob" />
        </button>
      </div>

      <div className="section-title">🔒 Parent lock</div>
      <p className="list-item-sub">{data.settings.parentPinHash ? 'A PIN protects these settings.' : 'No PIN set — anyone can open grown-up settings.'}</p>
      <div className="form-row" style={{ maxWidth: 220 }}>
        <label htmlFor="new-pin">Set a 4-digit PIN</label>
        <input
          id="new-pin"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className="chip-btn"
          disabled={pinInput.length !== 4}
          onClick={() => {
            updateSettings({ parentPinHash: hashPin(pinInput) });
            setPinInput('');
            setPinMessage('PIN saved.');
          }}
        >
          Save PIN
        </button>
        {data.settings.parentPinHash && (
          <button
            className="chip-btn"
            onClick={() => {
              updateSettings({ parentPinHash: null });
              setPinMessage('PIN removed.');
            }}
          >
            Remove PIN
          </button>
        )}
      </div>
      {pinMessage && <p className="list-item-sub" role="status">{pinMessage}</p>}
    </div>
  );
}

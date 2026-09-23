import { useState } from 'react';
import { useStore } from '../../store/AppStore';
import type { Profile } from '../../types';
import { DAY_NAMES } from '../../types';

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const ICONS = ['🎒', '🌈', '😴', '🏖', '🎂', '🏥', '⭐'];

export function ProfileEditor() {
  const { data, addProfile, updateProfile, deleteProfile, updateSettings } = useStore();
  const [editing, setEditing] = useState<Profile | null>(null);

  const toggleDay = (day: number) => {
    if (!editing) return;
    const days = editing.activeDays.includes(day) ? editing.activeDays.filter((d) => d !== day) : [...editing.activeDays, day].sort();
    setEditing({ ...editing, activeDays: days });
  };

  return (
    <div>
      <div className="section-title">🗓 Routines (recurring schedules)</div>
      <p className="list-item-sub" style={{ marginBottom: 10 }}>
        Give different days their own bedtime, wake-up and clocks — e.g. a School Day routine and a Weekend routine. Leave empty to use one schedule every day.
      </p>

      <div className="form-row">
        <label>Active routine</label>
        <select value={data.settings.activeProfileId ?? ''} onChange={(e) => updateSettings({ activeProfileId: e.target.value || null })}>
          <option value="">Auto-pick by day of week</option>
          {data.profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
          ))}
        </select>
      </div>

      {data.profiles.map((p) => (
        <div className="list-item" key={p.id}>
          <span className="list-item-icon" aria-hidden="true">{p.icon}</span>
          <div className="list-item-main">
            <div className="list-item-name">{p.name}</div>
            <div className="list-item-sub">{p.activeDays.length === 0 ? 'Manual only' : p.activeDays.map((d) => DAY_NAMES[d]).join(', ')}</div>
          </div>
          <div className="list-item-actions">
            <button className="small-btn" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}>✏️</button>
            <button className="small-btn" onClick={() => deleteProfile(p.id)} aria-label={`Delete ${p.name}`}>🗑</button>
          </div>
        </div>
      ))}

      <button className="chip-btn" onClick={() => setEditing({ id: newId(), name: '', icon: '⭐', activeDays: [] })}>+ Add routine</button>

      {editing && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Edit routine">
          <div className="modal-sheet">
            <h2 style={{ marginTop: 0 }}>{editing.name ? `Edit ${editing.name}` : 'New routine'}</h2>
            <div className="form-row">
              <label htmlFor="profile-name">Name</label>
              <input id="profile-name" type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Icon</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ICONS.map((icon) => (
                  <button key={icon} type="button" className={`small-btn${editing.icon === icon ? ' is-active' : ''}`} style={{ fontSize: '1.3rem' }} onClick={() => setEditing({ ...editing, icon })}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-row">
              <label>Active days</label>
              <div className="days-row">
                {DAY_NAMES.map((d, i) => (
                  <button key={d} type="button" className={`day-chip${editing.activeDays.includes(i) ? ' is-active' : ''}`} onClick={() => toggleDay(i)}>{d}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                className="big-button"
                style={{ flex: 1, marginTop: 0 }}
                disabled={!editing.name.trim()}
                onClick={() => {
                  if (data.profiles.some((p) => p.id === editing.id)) updateProfile(editing.id, editing);
                  else addProfile(editing);
                  setEditing(null);
                }}
              >
                Save
              </button>
              <button className="chip-btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

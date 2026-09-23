import { useState } from 'react';
import { useStore } from '../../store/AppStore';
import type { Clock } from '../../types';
import { CLOCK_PRESETS } from '../../store/defaultData';
import { ClockEditor } from './ClockEditor';

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function blankClock(order: number): Clock {
  return {
    id: newId(),
    name: '',
    icon: '⭐',
    role: 'event',
    scheduleType: 'fixedTime',
    time: '08:00',
    repeat: { kind: 'daily' },
    enabled: true,
    visibility: 'child',
    soundEnabled: false,
    ringtoneId: 'gentleChime',
    colorId: 'blue',
    completedDates: [],
    order,
  };
}

export function ClockList() {
  const { data, addClock, updateClock, deleteClock, reorderClocks } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState<Clock | null>(null);
  const [pickingPreset, setPickingPreset] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const sorted = [...data.clocks].sort((a, b) => a.order - b.order);
  const editingClock = data.clocks.find((c) => c.id === editingId) ?? null;

  const move = (id: string, dir: -1 | 1) => {
    const idx = sorted.findIndex((c) => c.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const ids = sorted.map((c) => c.id);
    [ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]];
    reorderClocks(ids);
  };

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = sorted.map((c) => c.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    reorderClocks(ids);
    setDragId(null);
  };

  const roleLabel = (c: Clock) => {
    if (c.role === 'sleep') return 'Sleep clock';
    if (c.role === 'wakeup') return 'Wake-up clock';
    if (c.scheduleType === 'timer') return c.timerStartedAt ? 'Timer running' : 'Timer (manual start)';
    if (c.scheduleType === 'durationFromWake') return `${c.durationMinutes ?? 0} min after wake-up`;
    return c.time ?? '';
  };

  return (
    <div>
      <div className="section-title">🕐 Your clocks</div>
      {sorted.map((c) => (
        <div
          key={c.id}
          className="list-item"
          draggable
          onDragStart={() => setDragId(c.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(c.id)}
        >
          <span className="drag-handle" aria-hidden="true">⠿</span>
          <span className="list-item-icon" aria-hidden="true">{c.icon}</span>
          <div className="list-item-main">
            <div className="list-item-name">{c.name}{!c.enabled && ' (off)'}</div>
            <div className="list-item-sub">{roleLabel(c)} · {c.repeat.kind}{c.visibility === 'adultOnly' ? ' · adult only' : ''}</div>
          </div>
          <div className="list-item-actions">
            <button className="small-btn" onClick={() => move(c.id, -1)} aria-label={`Move ${c.name} up`}>↑</button>
            <button className="small-btn" onClick={() => move(c.id, 1)} aria-label={`Move ${c.name} down`}>↓</button>
            <button className="small-btn" onClick={() => setEditingId(c.id)} aria-label={`Edit ${c.name}`}>✏️</button>
          </div>
        </div>
      ))}

      <button className="big-button" onClick={() => setPickingPreset(true)}>+ Add Clock</button>

      {pickingPreset && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Choose clock type">
          <div className="modal-sheet">
            <h2 style={{ marginTop: 0 }}>What kind of clock?</h2>
            <div className="preset-grid">
              {CLOCK_PRESETS.map((p) => (
                <button
                  key={p.id}
                  className="preset-btn"
                  onClick={() => {
                    setPickingPreset(false);
                    setCreating({
                      ...blankClock(sorted.length),
                      name: p.name,
                      icon: p.icon,
                      role: p.role,
                      scheduleType: p.scheduleType,
                      time: p.time,
                      durationMinutes: p.durationMinutes,
                    });
                  }}
                >
                  <span className="preset-icon" aria-hidden="true">{p.icon}</span>
                  {p.name}
                </button>
              ))}
            </div>
            <button className="chip-btn" onClick={() => setPickingPreset(false)}>Cancel</button>
          </div>
        </div>
      )}

      {creating && (
        <ClockEditor
          initial={creating}
          profiles={data.profiles}
          isNew
          onSave={(c) => {
            addClock(c);
            setCreating(null);
          }}
          onCancel={() => setCreating(null)}
        />
      )}

      {editingClock && (
        <ClockEditor
          initial={editingClock}
          profiles={data.profiles}
          isNew={false}
          onSave={(c) => {
            updateClock(c.id, c);
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
          onDelete={() => {
            deleteClock(editingClock.id);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

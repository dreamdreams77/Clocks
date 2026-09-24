import { useRef, useState } from 'react';
import { AnalogClock } from './AnalogClock';
import { speak } from '../engine/speech';

const SIZE = 260;
const SCALE = SIZE / 200; // AnalogClock's SVG viewBox is 0-200
const HOUR_HAND_PX = 50 * SCALE;
const MINUTE_HAND_PX = 72 * SCALE;
const HAND_PICK_THRESHOLD_PX = (HOUR_HAND_PX + MINUTE_HAND_PX) / 2;

function angleFromPointer(clientX: number, clientY: number, rect: DOMRect): number {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const raw = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (raw + 360) % 360;
}

function distanceFromCenter(clientX: number, clientY: number, rect: DOMRect): number {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return Math.hypot(clientX - cx, clientY - cy);
}

export function PracticeClock({ onExit, readAloudEnabled }: { onExit: () => void; readAloudEnabled: boolean }) {
  const [hour, setHour] = useState(3);
  const [minute, setMinute] = useState(0);
  const [dragging, setDragging] = useState<'hour' | 'minute' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const applyAngle = (angle: number, hand: 'hour' | 'minute') => {
    const index = Math.round(angle / 30) % 12;
    if (hand === 'hour') {
      setHour(index === 0 ? 12 : index);
    } else {
      setMinute((index % 12) * 5);
    }
  };

  const announce = (h: number, m: number) => {
    if (!readAloudEnabled) return;
    speak(`It's ${h}:${String(m).padStart(2, '0')}!`);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const hand: 'hour' | 'minute' = distanceFromCenter(e.clientX, e.clientY, rect) < HAND_PICK_THRESHOLD_PX ? 'hour' : 'minute';
    setDragging(hand);
    applyAngle(angleFromPointer(e.clientX, e.clientY, rect), hand);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    applyAngle(angleFromPointer(e.clientX, e.clientY, rect), dragging);
  };

  const endDrag = () => {
    if (!dragging) return;
    setDragging(null);
    announce(hour, minute);
  };

  const displayDate = new Date();
  displayDate.setHours(hour, minute, 0, 0);

  const bumpHour = (delta: number) => {
    const next = ((hour - 1 + delta + 12) % 12) + 1;
    setHour(next);
    announce(next, minute);
  };
  const bumpMinute = (delta: number) => {
    const next = (minute + delta * 5 + 60) % 60;
    setMinute(next);
    announce(hour, next);
  };

  return (
    <div className="app-shell">
      <div className="top-bar">
        <span style={{ fontSize: '1.6rem' }} aria-hidden="true">🎓</span>
        <button className="icon-btn" onClick={onExit} aria-label="Back to clocks">✕</button>
      </div>

      <div className="hero">
        <div className="hero-title" style={{ fontSize: '1.4rem' }}>Practice Clock</div>
        <div className="hero-sub">Drag the hands to make your own time!</div>

        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ touchAction: 'none', display: 'inline-block', marginTop: 12, cursor: 'grab' }}
          role="group"
          aria-label="Draggable practice clock face"
        >
          <AnalogClock now={displayDate} size={SIZE} reducedMotion showSeconds={false} showArc={false} />
        </div>

        <div className="hero-countdown">It's {hour}:{String(minute).padStart(2, '0')}!</div>

        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700 }}>Hour</span>
            <button className="small-btn" onClick={() => bumpHour(-1)} aria-label="Hour back">−</button>
            <button className="small-btn" onClick={() => bumpHour(1)} aria-label="Hour forward">+</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700 }}>Minute</span>
            <button className="small-btn" onClick={() => bumpMinute(-1)} aria-label="Minute back">−</button>
            <button className="small-btn" onClick={() => bumpMinute(1)} aria-label="Minute forward">+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

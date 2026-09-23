import { useState } from 'react';
import { hashPin } from '../../store/persistence';

export function PinLock({
  expectedHash,
  onUnlock,
  onCancel,
}: {
  expectedHash: string;
  onUnlock: () => void;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const press = (digit: string) => {
    setError(false);
    const next = (pin + digit).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      if (hashPin(next) === expectedHash) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => setPin(''), 350);
      }
    }
  };

  return (
    <div className="adult-screen" style={{ textAlign: 'center' }}>
      <div className="hero-icons" aria-hidden="true">🔒</div>
      <h1 className="hero-title" style={{ fontSize: '1.5rem' }}>Grown-up PIN</h1>
      <p className="hero-sub">{error ? 'Try again' : 'Enter your 4-digit PIN'}</p>
      <div className="pin-dots" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pin-dot${i < pin.length ? ' is-filled' : ''}`} />
        ))}
      </div>
      <div className="pin-pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              className="pin-key"
              onClick={() => (k === '⌫' ? setPin((p) => p.slice(0, -1)) : press(k))}
              aria-label={k === '⌫' ? 'Delete' : `Digit ${k}`}
            >
              {k}
            </button>
          ),
        )}
      </div>
      <button className="chip-btn" onClick={onCancel}>← Back to clocks</button>
    </div>
  );
}

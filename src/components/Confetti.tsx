import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotate: number;
  drift: number;
  size: number;
  shape: 'circle' | 'square';
}

const COLORS = ['#ffb84c', '#ff8a5c', '#4fa8e0', '#2f9c6e', '#ff6fa5', '#a15bd6'];

/** A short-lived burst of falling confetti — re-fires each time `burstKey` changes (0 = idle). */
export function Confetti({ burstKey }: { burstKey: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (burstKey === 0) return;
    const next: Particle[] = Array.from({ length: 26 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.15,
      duration: 0.9 + Math.random() * 0.6,
      color: COLORS[i % COLORS.length],
      rotate: 200 + Math.random() * 400,
      drift: (Math.random() - 0.5) * 120,
      size: 6 + Math.random() * 6,
      shape: Math.random() > 0.5 ? 'circle' : 'square',
    }));
    setParticles(next);
    const t = window.setTimeout(() => setParticles([]), 1700);
    return () => window.clearTimeout(t);
  }, [burstKey]);

  if (particles.length === 0) return null;

  return (
    <div className="confetti-layer" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className={`confetti-piece confetti-${p.shape}`}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ['--rot' as string]: `${p.rotate}deg`,
            ['--drift' as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

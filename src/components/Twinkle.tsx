import { useEffect, useState } from 'react';

interface Star {
  id: number;
  left: number;
  top: number;
  delay: number;
  size: number;
  emoji: string;
}

const EMOJIS = ['✨', '⭐', '🌟'];

/** A gentle fade-in/fade-out scatter of stars — the bedtime counterpart to the wake confetti. */
export function Twinkle({ burstKey }: { burstKey: number }) {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    if (burstKey === 0) return;
    const next: Star[] = Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      left: 8 + Math.random() * 84,
      top: 8 + Math.random() * 60,
      delay: Math.random() * 0.8,
      size: 18 + Math.random() * 20,
      emoji: EMOJIS[i % EMOJIS.length],
    }));
    setStars(next);
    const t = window.setTimeout(() => setStars([]), 2600);
    return () => window.clearTimeout(t);
  }, [burstKey]);

  if (stars.length === 0) return null;

  return (
    <div className="twinkle-layer" aria-hidden="true">
      {stars.map((s) => (
        <span
          key={s.id}
          className="twinkle-star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            fontSize: s.size,
            animationDelay: `${s.delay}s`,
          }}
        >
          {s.emoji}
        </span>
      ))}
    </div>
  );
}

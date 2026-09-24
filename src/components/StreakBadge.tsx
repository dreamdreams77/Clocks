export function StreakBadge({ streak }: { streak: number }) {
  if (streak < 1) return null;
  const stars = '⭐'.repeat(Math.min(streak, 7));
  return (
    <div className="streak-badge" role="status">
      <span aria-hidden="true">🔥</span>
      <span className="streak-stars" aria-hidden="true">{stars}</span>
      <span>{streak} day{streak === 1 ? '' : 's'} in a row!</span>
    </div>
  );
}

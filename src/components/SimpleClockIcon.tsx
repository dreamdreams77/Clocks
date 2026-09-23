/** A minimal clock glyph (just the 12/3/6/9 ticks and two hands) used for the grown-up entry
 * point — crisper and more on-theme than a padlock emoji, and renders identically everywhere. */
export function SimpleClockIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <line x1="12" y1="3" x2="12" y2="4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="21" y1="12" x2="19.2" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="21" x2="12" y2="19.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="3" y1="12" x2="4.8" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="12" x2="12" y2="7.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="12" x2="15.2" y2="9.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" />
    </svg>
  );
}

// Low-level, DST-safe date arithmetic helpers.
// Everything here builds Date objects from local calendar fields (year, month, day, hour, minute)
// rather than adding raw millisecond offsets, so a day's length automatically absorbs DST
// transitions the same way the platform's own Date implementation does.

export interface TimeParts {
  h: number;
  m: number;
}

export function parseTime(time: string): TimeParts {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  return { h: h || 0, m: m || 0 };
}

export function formatTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Returns a new Date on the same calendar day as `date`, at the given wall-clock time. */
export function atTime(date: Date, time: string): Date {
  const { h, m } = parseTime(time);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0);
}

/** Returns a Date shifted by `days` whole calendar days, preserving wall-clock hour/minute (DST-safe). */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface DurationParts {
  hours: number;
  minutes: number;
}

export function msToDurationParts(ms: number): DurationParts {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

export function friendlyDuration(ms: number): string {
  if (ms <= 0) return 'now';
  const { hours, minutes } = msToDurationParts(ms);
  if (hours <= 0 && minutes <= 0) return 'less than a minute';
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes > 0 || hours === 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  return parts.join(' ');
}

export function friendlyClockTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

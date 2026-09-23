import type { RepeatRule } from '../types';
import { addDays, isSameDay, toISODate } from './time';

export function isDayAllowed(date: Date, repeat: RepeatRule): boolean {
  const dow = date.getDay();
  switch (repeat.kind) {
    case 'daily':
      return true;
    case 'weekdays':
      return dow >= 1 && dow <= 5;
    case 'weekends':
      return dow === 0 || dow === 6;
    case 'custom':
      return (repeat.days ?? []).includes(dow);
    case 'once':
      if (!repeat.date) return true; // undated one-off: allowed whenever it's next found
      return toISODate(date) === repeat.date;
    default:
      return false;
  }
}

/**
 * Walk forward from `from` (inclusive) up to `maxDays` calendar days, returning the first
 * date that satisfies the repeat rule. Returns null if none found in range (e.g. a 'once'
 * event whose date has already passed).
 */
export function nextAllowedDay(from: Date, repeat: RepeatRule, maxDays = 366): Date | null {
  for (let i = 0; i < maxDays; i++) {
    const candidate = addDays(from, i);
    if (isDayAllowed(candidate, repeat)) return candidate;
  }
  return null;
}

/**
 * Walk backward from `from` (inclusive) up to `maxDays` calendar days, returning the most
 * recent date that satisfies the repeat rule.
 */
export function previousAllowedDay(from: Date, repeat: RepeatRule, maxDays = 366): Date | null {
  for (let i = 0; i < maxDays; i++) {
    const candidate = addDays(from, -i);
    if (isDayAllowed(candidate, repeat)) return candidate;
  }
  return null;
}

export function isOneOffExhausted(repeat: RepeatRule, completedDates: string[], occurrenceDate: string): boolean {
  if (repeat.kind !== 'once') return false;
  return completedDates.includes(occurrenceDate);
}

export { isSameDay };

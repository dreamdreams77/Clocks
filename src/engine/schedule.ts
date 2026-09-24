// Pure scheduling engine. Every function here takes an explicit `now: Date` and derives state
// from real timestamps — nothing is inferred from elapsed setInterval ticks or stored "state",
// so the app produces correct answers whether it has been running continuously, was just
// reopened after being closed for hours, or the device clock jumped (DST, manual change).
import type { Clock, Profile, RepeatRule, AppSettings } from '../types';
import { atTime, addDays, startOfDay, toISODate, clamp, parseTime } from './time';
import { isDayAllowed, nextAllowedDay } from './repeat';

export interface SleepState {
  mode: 'night' | 'day';
  bedtimeInstant: Date;
  wakeInstant: Date;
  msUntilWake: number;
  msSinceWake: number;
}

function totalMinutes(time: string): number {
  const { h, m } = parseTime(time);
  return h * 60 + m;
}

export function computeSleepState(now: Date, sleepClock: Pick<Clock, 'time' | 'repeat'>, wakeClock: Pick<Clock, 'time'>): SleepState {
  const bedTime = sleepClock.time ?? '21:00';
  const wakeTime = wakeClock.time ?? '07:00';
  const crossesMidnight = totalMinutes(wakeTime) <= totalMinutes(bedTime);

  const wakeInstantFor = (bedInstant: Date): Date =>
    crossesMidnight ? atTime(addDays(bedInstant, 1), wakeTime) : atTime(bedInstant, wakeTime);

  // 1) Are we currently inside a night window that started yesterday or today?
  for (const offset of [-1, 0]) {
    const bedDateBase = addDays(now, offset);
    if (!isDayAllowed(bedDateBase, sleepClock.repeat)) continue;
    const bed = atTime(bedDateBase, bedTime);
    const wake = wakeInstantFor(bed);
    if (now.getTime() >= bed.getTime() && now.getTime() < wake.getTime()) {
      return { mode: 'night', bedtimeInstant: bed, wakeInstant: wake, msUntilWake: wake.getTime() - now.getTime(), msSinceWake: 0 };
    }
  }

  // 2) Daytime: anchor to the most recent night's wake moment (search backward for the closest
  //    allowed bedtime whose paired wake has already passed).
  for (let offset = 0; offset >= -9; offset--) {
    const bedDateBase = addDays(now, offset);
    if (!isDayAllowed(bedDateBase, sleepClock.repeat)) continue;
    const bed = atTime(bedDateBase, bedTime);
    const wake = wakeInstantFor(bed);
    if (wake.getTime() <= now.getTime()) {
      return { mode: 'day', bedtimeInstant: bed, wakeInstant: wake, msUntilWake: 0, msSinceWake: now.getTime() - wake.getTime() };
    }
  }

  // 3) Fallback (e.g. very first launch, no qualifying night yet): treat "now" as just woken.
  const fallbackWake = atTime(now, wakeTime);
  return { mode: 'day', bedtimeInstant: addDays(fallbackWake, -1), wakeInstant: fallbackWake, msUntilWake: 0, msSinceWake: Math.max(0, now.getTime() - fallbackWake.getTime()) };
}

export type ClockStatus = 'inactive' | 'idle' | 'waitingForWake' | 'upcoming' | 'ready' | 'completed';

export interface ClockState {
  status: ClockStatus;
  targetInstant: Date | null;
  startInstant: Date | null;
  msRemaining: number;
  progress: number; // 0..1, undefined-safe (0 when not applicable)
  occurrenceKey: string | null;
}

const INACTIVE: ClockState = { status: 'inactive', targetInstant: null, startInstant: null, msRemaining: 0, progress: 0, occurrenceKey: null };

export function computeClockState(now: Date, clock: Clock, sleepState: SleepState): ClockState {
  if (!clock.enabled) return INACTIVE;

  if (clock.scheduleType === 'timer') {
    if (clock.timerStartedAt == null) return { ...INACTIVE, status: 'idle' };
    const start = new Date(clock.timerStartedAt);
    const target = new Date(clock.timerStartedAt + (clock.durationMinutes ?? 0) * 60000);
    const key = String(clock.timerStartedAt);
    if (clock.completedDates.includes(key)) return { status: 'completed', targetInstant: target, startInstant: start, msRemaining: 0, progress: 1, occurrenceKey: key };
    const msRemaining = Math.max(0, target.getTime() - now.getTime());
    const span = target.getTime() - start.getTime() || 1;
    const progress = clamp((now.getTime() - start.getTime()) / span, 0, 1);
    if (now.getTime() >= target.getTime()) return { status: 'ready', targetInstant: target, startInstant: start, msRemaining: 0, progress: 1, occurrenceKey: key };
    return { status: 'upcoming', targetInstant: target, startInstant: start, msRemaining, progress, occurrenceKey: key };
  }

  if (clock.scheduleType === 'durationFromWake') {
    const anchor = sleepState.wakeInstant;
    if (!isDayAllowed(anchor, clock.repeat)) return INACTIVE;
    const target = new Date(anchor.getTime() + (clock.durationMinutes ?? 0) * 60000);
    const key = toISODate(anchor);
    if (clock.completedDates.includes(key)) return { status: 'completed', targetInstant: target, startInstant: anchor, msRemaining: 0, progress: 1, occurrenceKey: key };
    if (sleepState.mode === 'night') {
      return { status: 'waitingForWake', targetInstant: target, startInstant: anchor, msRemaining: target.getTime() - anchor.getTime(), progress: 0, occurrenceKey: key };
    }
    const msRemaining = Math.max(0, target.getTime() - now.getTime());
    const span = target.getTime() - anchor.getTime() || 1;
    const progress = clamp((now.getTime() - anchor.getTime()) / span, 0, 1);
    if (now.getTime() >= target.getTime()) return { status: 'ready', targetInstant: target, startInstant: anchor, msRemaining: 0, progress: 1, occurrenceKey: key };
    return { status: 'upcoming', targetInstant: target, startInstant: anchor, msRemaining, progress, occurrenceKey: key };
  }

  // fixedTime (also used by 'sleep' and 'wakeup' role clocks)
  const time = clock.time ?? '00:00';
  // Overnight, "today" for a daytime routine clock (Daddy at 7:30, School at 9:00, ...) means the
  // upcoming wake day, not the current calendar date — otherwise a clock whose time-of-day already
  // passed earlier today would wrongly read "ready" again at 11pm instead of counting down to
  // tomorrow morning. During the day the wake day and the calendar day are the same, so this only
  // changes anything while asleep.
  const today = sleepState.mode === 'night' ? startOfDay(sleepState.wakeInstant) : startOfDay(now);
  const todayAllowed = isDayAllowed(today, clock.repeat);
  const todayKey = toISODate(today);
  const todayTarget = todayAllowed ? atTime(today, time) : null;

  // Today's occurrence stays authoritative all day — including after it's marked done, so the
  // child keeps seeing "completed" rather than an instant jump to tomorrow's countdown. Only
  // once a new calendar day actually arrives (a fresh call with a later `now`) do we roll
  // forward, and only then because today's repeat rule may no longer allow today.
  let target: Date;
  let key: string;
  if (todayTarget) {
    target = todayTarget;
    key = todayKey;
  } else {
    const nextDay = nextAllowedDay(addDays(today, 1), clock.repeat);
    if (!nextDay) return INACTIVE;
    target = atTime(nextDay, time);
    key = toISODate(nextDay);
  }
  const startInstant = addDays(target, -1);
  if (clock.completedDates.includes(key)) return { status: 'completed', targetInstant: target, startInstant, msRemaining: 0, progress: 1, occurrenceKey: key };
  const msRemaining = Math.max(0, target.getTime() - now.getTime());
  const span = target.getTime() - startInstant.getTime() || 1;
  const progress = clamp((now.getTime() - startInstant.getTime()) / span, 0, 1);
  if (now.getTime() >= target.getTime()) return { status: 'ready', targetInstant: target, startInstant, msRemaining: 0, progress: 1, occurrenceKey: key };
  return { status: 'upcoming', targetInstant: target, startInstant, msRemaining, progress, occurrenceKey: key };
}

export function pickActiveProfile(now: Date, profiles: Profile[], overrideId: string | null): Profile | null {
  if (overrideId) return profiles.find((p) => p.id === overrideId) ?? null;
  const dow = now.getDay();
  return profiles.find((p) => p.activeDays.includes(dow)) ?? null;
}

function clockAppliesToProfile(clock: Clock, profile: Profile | null): boolean {
  if (!clock.profileIds || clock.profileIds.length === 0) return true;
  if (!profile) return false;
  return clock.profileIds.includes(profile.id);
}

export interface AppState {
  profile: Profile | null;
  sleepClock: Clock | null;
  wakeClock: Clock | null;
  sleepState: SleepState;
  wakeState: ClockState | null;
  clockStates: Array<{ clock: Clock; state: ClockState }>;
}

export function computeAppState(now: Date, clocks: Clock[], profiles: Profile[], settings: Pick<AppSettings, 'activeProfileId'>): AppState {
  const profile = pickActiveProfile(now, profiles, settings.activeProfileId);
  const applicable = clocks.filter((c) => clockAppliesToProfile(c, profile));
  const sleepClock = applicable.find((c) => c.role === 'sleep' && c.enabled) ?? applicable.find((c) => c.role === 'sleep') ?? null;
  const wakeClock = applicable.find((c) => c.role === 'wakeup' && c.enabled) ?? applicable.find((c) => c.role === 'wakeup') ?? null;
  const sleepState = sleepClock && wakeClock
    ? computeSleepState(now, sleepClock, wakeClock)
    : { mode: 'day' as const, bedtimeInstant: addDays(now, -1), wakeInstant: now, msUntilWake: 0, msSinceWake: 0 };
  const wakeState = wakeClock ? computeClockState(now, wakeClock, sleepState) : null;

  const clockStates = applicable
    .filter((c) => c.role !== 'sleep' && c.role !== 'wakeup')
    .sort((a, b) => a.order - b.order)
    .map((clock) => ({ clock, state: computeClockState(now, clock, sleepState) }));

  return { profile, sleepClock, wakeClock, sleepState, wakeState, clockStates };
}

export function markOccurrenceDone(clock: Clock, occurrenceKey: string): Clock {
  if (clock.completedDates.includes(occurrenceKey)) return clock;
  return { ...clock, completedDates: [...clock.completedDates, occurrenceKey].slice(-60) };
}

export function startTimer(clock: Clock, now: Date): Clock {
  return { ...clock, timerStartedAt: now.getTime(), enabled: true };
}

export function stopTimer(clock: Clock): Clock {
  return { ...clock, timerStartedAt: null };
}

export function makeDefaultRepeat(kind: RepeatRule['kind'] = 'daily'): RepeatRule {
  return { kind };
}

/**
 * How many consecutive days (ending today, or ending yesterday if today hasn't happened yet)
 * appear in a clock's completedDates. Used for the "days in a row" streak badge — today not
 * being marked done yet doesn't break a streak that's still in progress.
 */
export function computeStreak(completedDates: string[], now: Date): number {
  const done = new Set(completedDates);
  let cursor = startOfDay(now);
  if (!done.has(toISODate(cursor))) cursor = addDays(cursor, -1);
  let count = 0;
  while (done.has(toISODate(cursor))) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

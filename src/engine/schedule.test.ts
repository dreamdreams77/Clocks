import { describe, it, expect } from 'vitest';
import { computeSleepState, computeClockState, computeAppState, markOccurrenceDone, startTimer, computeStreak } from './schedule';
import type { Clock, Profile } from '../types';

function dt(y: number, mo: number, d: number, h: number, mi: number): Date {
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

function baseClock(overrides: Partial<Clock>): Clock {
  return {
    id: 'c1',
    name: 'Test',
    icon: '⏰',
    role: 'event',
    scheduleType: 'fixedTime',
    repeat: { kind: 'daily' },
    enabled: true,
    visibility: 'child',
    soundEnabled: false,
    ringtoneId: 'gentleChime',
    colorId: 'blue',
    completedDates: [],
    order: 0,
    ...overrides,
  };
}

const sleepClock = (time: string, repeat: Clock['repeat'] = { kind: 'daily' }): Clock =>
  baseClock({ id: 'sleep', name: 'Sleep', icon: '🌙', role: 'sleep', time, repeat });
const wakeClock = (time: string): Clock => baseClock({ id: 'wake', name: 'Wake', icon: '☀️', role: 'wakeup', time });

describe('computeSleepState — overnight sleep', () => {
  it('is night mode right after bedtime', () => {
    const now = dt(2024, 6, 10, 21, 5); // 9:05pm, bedtime 9pm
    const s = computeSleepState(now, sleepClock('21:00'), wakeClock('07:00'));
    expect(s.mode).toBe('night');
    expect(s.wakeInstant).toEqual(dt(2024, 6, 11, 7, 0));
  });

  it('counts down correctly mid-night', () => {
    const now = dt(2024, 6, 10, 23, 50); // 11:50pm
    const s = computeSleepState(now, sleepClock('21:00'), wakeClock('07:00'));
    expect(s.mode).toBe('night');
    expect(Math.round(s.msUntilWake / 60000)).toBe(7 * 60 + 10); // 7h10m to 7am
  });

  it('flips to day mode the instant wake time arrives', () => {
    const now = dt(2024, 6, 11, 7, 0);
    const s = computeSleepState(now, sleepClock('21:00'), wakeClock('07:00'));
    expect(s.mode).toBe('day');
    expect(s.msSinceWake).toBe(0);
    expect(s.wakeInstant).toEqual(dt(2024, 6, 11, 7, 0));
  });

  it('midnight crossing: 11:50pm and 12:10am both resolve to the same night', () => {
    const before = computeSleepState(dt(2024, 6, 10, 23, 50), sleepClock('21:00'), wakeClock('07:00'));
    const after = computeSleepState(dt(2024, 6, 11, 0, 10), sleepClock('21:00'), wakeClock('07:00'));
    expect(before.mode).toBe('night');
    expect(after.mode).toBe('night');
    expect(before.bedtimeInstant).toEqual(after.bedtimeInstant);
    expect(before.wakeInstant).toEqual(after.wakeInstant);
  });

  it('stays in day mode through the day after wake, until next bedtime', () => {
    const now = dt(2024, 6, 11, 15, 30); // afternoon
    const s = computeSleepState(now, sleepClock('21:00'), wakeClock('07:00'));
    expect(s.mode).toBe('day');
    expect(s.wakeInstant).toEqual(dt(2024, 6, 11, 7, 0));
  });
});

describe('post-wake fixed-time clocks', () => {
  const wake = wakeClock('07:00');
  const sleep = sleepClock('21:00');

  it('Daddy 7:30, Mummy 8:00 — computed live from current time at 7:00am', () => {
    const now = dt(2024, 6, 11, 7, 0);
    const sleepState = computeSleepState(now, sleep, wake);
    const daddy = baseClock({ id: 'daddy', name: 'Daddy', icon: '👨', role: 'person', time: '07:30' });
    const mummy = baseClock({ id: 'mummy', name: 'Mummy', icon: '👩', role: 'person', time: '08:00' });
    const daddyState = computeClockState(now, daddy, sleepState);
    const mummyState = computeClockState(now, mummy, sleepState);
    expect(daddyState.status).toBe('upcoming');
    expect(Math.round(daddyState.msRemaining / 60000)).toBe(30);
    expect(Math.round(mummyState.msRemaining / 60000)).toBe(60);
  });

  it('reopening the app at 7:17am shows 13 and 43 minutes remaining', () => {
    const now = dt(2024, 6, 11, 7, 17);
    const sleepState = computeSleepState(now, sleep, wake);
    const daddy = baseClock({ id: 'daddy', name: 'Daddy', icon: '👨', role: 'person', time: '07:30' });
    const mummy = baseClock({ id: 'mummy', name: 'Mummy', icon: '👩', role: 'person', time: '08:00' });
    expect(Math.round(computeClockState(now, daddy, sleepState).msRemaining / 60000)).toBe(13);
    expect(Math.round(computeClockState(now, mummy, sleepState).msRemaining / 60000)).toBe(43);
  });

  it('reaches "ready" status exactly at target time and stays ready until marked done', () => {
    const daddy = baseClock({ id: 'daddy', name: 'Daddy', icon: '👨', role: 'person', time: '07:30' });
    const sleepState = computeSleepState(dt(2024, 6, 11, 7, 30), sleep, wake);
    const atTarget = computeClockState(dt(2024, 6, 11, 7, 30), daddy, sleepState);
    expect(atTarget.status).toBe('ready');
    const later = computeClockState(dt(2024, 6, 11, 7, 45), daddy, sleepState);
    expect(later.status).toBe('ready');
  });

  it('at night, a fixed-time clock counts down to tomorrow instead of showing a stale "ready" from earlier today', () => {
    // Daddy's 7:30am already came and went hours ago; it's now 11:15pm and nobody marked it done.
    const now = dt(2024, 6, 11, 23, 15);
    const sleepState = computeSleepState(now, sleep, wake); // mode: 'night', wakeInstant: tomorrow 7:00am
    const daddy = baseClock({ id: 'daddy', name: 'Daddy', icon: '👨', role: 'person', time: '07:30' });
    const state = computeClockState(now, daddy, sleepState);
    expect(state.status).toBe('upcoming');
    expect(state.targetInstant).toEqual(dt(2024, 6, 12, 7, 30));
    expect(Math.round(state.msRemaining / 60000)).toBe(8 * 60 + 15);
  });

  it('marking done moves the clock to completed for that occurrence, then rolls to next day', () => {
    const daddy = baseClock({ id: 'daddy', name: 'Daddy', icon: '👨', role: 'person', time: '07:30' });
    const now = dt(2024, 6, 11, 7, 35);
    const key = computeClockState(now, daddy, computeSleepState(now, sleep, wake)).occurrenceKey!;
    const doneClock = markOccurrenceDone(daddy, key);
    const doneState = computeClockState(now, doneClock, computeSleepState(now, sleep, wake));
    expect(doneState.status).toBe('completed');
    const tomorrow = dt(2024, 6, 12, 6, 0);
    const nextDayState = computeClockState(tomorrow, doneClock, computeSleepState(tomorrow, sleep, wake));
    expect(nextDayState.status).toBe('upcoming');
    expect(nextDayState.targetInstant).toEqual(dt(2024, 6, 12, 7, 30));
  });
});

describe('temporary timers', () => {
  it('20 minute Daddy timer started at 7:15 finishes at 7:35', () => {
    const clock = baseClock({ id: 'timer1', name: 'Wake Daddy', icon: '👨', role: 'timer', scheduleType: 'timer', durationMinutes: 20 });
    const started = startTimer(clock, dt(2024, 6, 11, 7, 15));
    const sleepState = computeSleepState(dt(2024, 6, 11, 7, 15), sleepClock('21:00'), wakeClock('07:00'));
    const mid = computeClockState(dt(2024, 6, 11, 7, 20), started, sleepState);
    expect(mid.status).toBe('upcoming');
    expect(Math.round(mid.msRemaining / 60000)).toBe(15);
    const done = computeClockState(dt(2024, 6, 11, 7, 35), started, sleepState);
    expect(done.status).toBe('ready');
    expect(done.targetInstant).toEqual(dt(2024, 6, 11, 7, 35));
  });

  it('multiple simultaneous timers count independently', () => {
    const sleepState = computeSleepState(dt(2024, 6, 11, 7, 0), sleepClock('21:00'), wakeClock('07:00'));
    const now = dt(2024, 6, 11, 7, 0);
    const daddy = startTimer(baseClock({ id: 'd', role: 'timer', scheduleType: 'timer', durationMinutes: 10 }), now);
    const mummy = startTimer(baseClock({ id: 'm', role: 'timer', scheduleType: 'timer', durationMinutes: 25 }), now);
    const breakfast = startTimer(baseClock({ id: 'b', role: 'timer', scheduleType: 'timer', durationMinutes: 40 }), now);
    const check = dt(2024, 6, 11, 7, 5);
    expect(Math.round(computeClockState(check, daddy, sleepState).msRemaining / 60000)).toBe(5);
    expect(Math.round(computeClockState(check, mummy, sleepState).msRemaining / 60000)).toBe(20);
    expect(Math.round(computeClockState(check, breakfast, sleepState).msRemaining / 60000)).toBe(35);
  });

  it('reflects real remaining time after the app was closed and reopened', () => {
    const clock = baseClock({ id: 'timer1', role: 'timer', scheduleType: 'timer', durationMinutes: 30 });
    const started = startTimer(clock, dt(2024, 6, 11, 7, 0));
    // "app closed" — nothing happens, we just recompute later from the real clock
    const reopened = dt(2024, 6, 11, 7, 10);
    const sleepState = computeSleepState(reopened, sleepClock('21:00'), wakeClock('07:00'));
    const state = computeClockState(reopened, started, sleepState);
    expect(Math.round(state.msRemaining / 60000)).toBe(20);
  });
});

describe('repeating schedules', () => {
  const sleepState = computeSleepState(dt(2024, 6, 10, 12, 0), sleepClock('21:00'), wakeClock('07:00')); // arbitrary daytime anchor

  it('daily clock is allowed every day', () => {
    const c = baseClock({ time: '08:00', repeat: { kind: 'daily' } });
    // Monday
    const state = computeClockState(dt(2024, 6, 10, 6, 0), c, sleepState);
    expect(state.status).toBe('upcoming');
  });

  it('weekdays clock is inactive on Saturday and resolves to Monday', () => {
    const c = baseClock({ time: '08:00', repeat: { kind: 'weekdays' } });
    const saturday = dt(2024, 6, 15, 6, 0); // Sat
    const state = computeClockState(saturday, c, sleepState);
    expect(state.targetInstant).toEqual(dt(2024, 6, 17, 8, 0)); // Monday
  });

  it('weekends clock only fires Sat/Sun', () => {
    const c = baseClock({ time: '09:00', repeat: { kind: 'weekends' } });
    const friday = dt(2024, 6, 14, 6, 0);
    const state = computeClockState(friday, c, sleepState);
    expect(state.targetInstant).toEqual(dt(2024, 6, 15, 9, 0)); // Saturday
  });

  it('custom days clock only fires on specified days', () => {
    const c = baseClock({ time: '17:00', repeat: { kind: 'custom', days: [2, 4] } }); // Tue, Thu
    const monday = dt(2024, 6, 10, 6, 0);
    const state = computeClockState(monday, c, sleepState);
    expect(state.targetInstant).toEqual(dt(2024, 6, 11, 17, 0)); // Tuesday
  });

  it('disabled events are always inactive', () => {
    const c = baseClock({ time: '08:00', enabled: false });
    expect(computeClockState(dt(2024, 6, 10, 6, 0), c, sleepState).status).toBe('inactive');
  });

  it('a one-off "once" event with a past date never fires again', () => {
    const c = baseClock({ time: '08:00', repeat: { kind: 'once', date: '2024-01-01' } });
    expect(computeClockState(dt(2024, 6, 10, 6, 0), c, sleepState).status).toBe('inactive');
  });

  it('a one-off "once" event with a future date fires on that date only', () => {
    const c = baseClock({ time: '08:00', repeat: { kind: 'once', date: '2024-06-20' } });
    const state = computeClockState(dt(2024, 6, 10, 6, 0), c, sleepState);
    expect(state.targetInstant).toEqual(dt(2024, 6, 20, 8, 0));
  });
});

describe('durationFromWake clocks', () => {
  it('previews target time during the night without counting down yet', () => {
    const now = dt(2024, 6, 10, 23, 0);
    const sleepState = computeSleepState(now, sleepClock('21:00'), wakeClock('07:00'));
    const c = baseClock({ scheduleType: 'durationFromWake', durationMinutes: 30 });
    const state = computeClockState(now, c, sleepState);
    expect(state.status).toBe('waitingForWake');
    expect(state.targetInstant).toEqual(dt(2024, 6, 11, 7, 30));
  });

  it('counts down for real once the wake moment has occurred', () => {
    const now = dt(2024, 6, 11, 7, 10);
    const sleepState = computeSleepState(now, sleepClock('21:00'), wakeClock('07:00'));
    const c = baseClock({ scheduleType: 'durationFromWake', durationMinutes: 30 });
    const state = computeClockState(now, c, sleepState);
    expect(state.status).toBe('upcoming');
    expect(Math.round(state.msRemaining / 60000)).toBe(20);
  });
});

describe('computeAppState with profiles', () => {
  const clocks: Clock[] = [
    sleepClock('21:00'),
    wakeClock('07:00'),
    baseClock({ id: 'school-breakfast', name: 'Breakfast', time: '08:00', profileIds: ['school'] }),
    baseClock({ id: 'weekend-play', name: 'Play', time: '09:00', profileIds: ['weekend'] }),
  ];
  const profiles: Profile[] = [
    { id: 'school', name: 'School Day', icon: '🎒', activeDays: [1, 2, 3, 4, 5] },
    { id: 'weekend', name: 'Weekend', icon: '🌈', activeDays: [0, 6] },
  ];

  it('picks the school profile on a weekday and only includes its clocks', () => {
    const now = dt(2024, 6, 10, 6, 0); // Monday
    const app = computeAppState(now, clocks, profiles, { activeProfileId: null });
    expect(app.profile?.id).toBe('school');
    const names = app.clockStates.map((cs) => cs.clock.id);
    expect(names).toContain('school-breakfast');
    expect(names).not.toContain('weekend-play');
  });

  it('picks the weekend profile on Saturday', () => {
    const now = dt(2024, 6, 15, 6, 0); // Saturday
    const app = computeAppState(now, clocks, profiles, { activeProfileId: null });
    expect(app.profile?.id).toBe('weekend');
    const names = app.clockStates.map((cs) => cs.clock.id);
    expect(names).toContain('weekend-play');
    expect(names).not.toContain('school-breakfast');
  });
});

describe('computeStreak', () => {
  it('counts consecutive days ending today', () => {
    const now = dt(2024, 6, 13, 8, 0); // Thursday
    const dates = ['2024-06-11', '2024-06-12', '2024-06-13'];
    expect(computeStreak(dates, now)).toBe(3);
  });

  it('keeps counting from yesterday if today is not marked done yet (streak still alive)', () => {
    const now = dt(2024, 6, 13, 6, 30);
    const dates = ['2024-06-11', '2024-06-12'];
    expect(computeStreak(dates, now)).toBe(2);
  });

  it('breaks on a gap', () => {
    const now = dt(2024, 6, 13, 8, 0);
    const dates = ['2024-06-10', '2024-06-13'];
    expect(computeStreak(dates, now)).toBe(1);
  });

  it('is zero with no completed dates', () => {
    expect(computeStreak([], dt(2024, 6, 13, 8, 0))).toBe(0);
  });
});

import type { AppData, Clock } from '../types';

function clock(partial: Partial<Clock> & Pick<Clock, 'id' | 'name' | 'icon'>): Clock {
  return {
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
    ...partial,
  };
}

export function createDefaultData(): AppData {
  return {
    profiles: [],
    clocks: [
      clock({ id: 'sleep', name: 'Sleep', icon: '🌙', role: 'sleep', time: '21:00', order: 0, colorId: 'indigo' }),
      clock({ id: 'wakeup', name: 'Wake Up', icon: '☀️', role: 'wakeup', time: '07:00', order: 1, colorId: 'gold', soundEnabled: true, ringtoneId: 'roosterCall' }),
      clock({ id: 'daddy', name: 'Wake Daddy', icon: '👨', role: 'person', time: '07:30', order: 2, colorId: 'blue', soundEnabled: true, ringtoneId: 'classicBell' }),
      clock({ id: 'mummy', name: 'Wake Mummy', icon: '👩', role: 'person', time: '08:00', order: 3, colorId: 'pink', soundEnabled: true, ringtoneId: 'classicBell' }),
      clock({ id: 'breakfast', name: 'Breakfast', icon: '🍳', role: 'event', time: '08:15', order: 4, colorId: 'orange', soundEnabled: true, ringtoneId: 'xylophone' }),
      clock({ id: 'dressed', name: 'Get Dressed', icon: '👕', role: 'event', time: '08:45', order: 5, colorId: 'teal' }),
      clock({ id: 'school', name: 'School', icon: '🎒', role: 'event', time: '09:00', order: 6, colorId: 'green', repeat: { kind: 'weekdays' } }),
    ],
    settings: {
      themeId: 'moon',
      clockFaceStyle: 'analogCountdown',
      childViewMode: 'all',
      showTimeline: true,
      soundEnabled: true,
      reducedMotion: false,
      highContrast: false,
      largeText: false,
      parentPinHash: null,
      activeProfileId: null,
    },
    sleepLog: [],
  };
}

export const CLOCK_PRESETS: Array<{ id: string; name: string; icon: string; role: Clock['role']; scheduleType: Clock['scheduleType']; time?: string; durationMinutes?: number }> = [
  { id: 'sleep', name: 'Sleep', icon: '💤', role: 'sleep', scheduleType: 'fixedTime', time: '21:00' },
  { id: 'wakeup', name: 'Wake-up', icon: '☀️', role: 'wakeup', scheduleType: 'fixedTime', time: '07:00' },
  { id: 'daddy', name: 'Daddy', icon: '👨', role: 'person', scheduleType: 'fixedTime', time: '07:30' },
  { id: 'mummy', name: 'Mummy', icon: '👩', role: 'person', scheduleType: 'fixedTime', time: '08:00' },
  { id: 'breakfast', name: 'Breakfast', icon: '🍳', role: 'event', scheduleType: 'fixedTime', time: '08:15' },
  { id: 'brush', name: 'Brush Teeth', icon: '🪥', role: 'event', scheduleType: 'fixedTime', time: '08:30' },
  { id: 'dressed', name: 'Get Dressed', icon: '👕', role: 'event', scheduleType: 'fixedTime', time: '08:45' },
  { id: 'schoolp', name: 'School', icon: '🎒', role: 'event', scheduleType: 'fixedTime', time: '09:00' },
  { id: 'shower', name: 'Shower', icon: '🚿', role: 'event', scheduleType: 'fixedTime', time: '18:00' },
  { id: 'bath', name: 'Bath', icon: '🛁', role: 'event', scheduleType: 'fixedTime', time: '18:30' },
  { id: 'reading', name: 'Reading', icon: '📖', role: 'event', scheduleType: 'fixedTime', time: '20:15' },
  { id: 'bedtime', name: 'Bedtime', icon: '🛏', role: 'event', scheduleType: 'fixedTime', time: '20:45' },
  { id: 'timer', name: 'Custom Timer', icon: '⏱', role: 'timer', scheduleType: 'timer', durationMinutes: 15 },
  { id: 'custom', name: 'Custom Event', icon: '⭐', role: 'event', scheduleType: 'fixedTime', time: '12:00' },
];

export const COLOR_SWATCHES: Record<string, string> = {
  indigo: '#5b4bd6',
  gold: '#f2b134',
  blue: '#3fa7ff',
  pink: '#ff6fa5',
  orange: '#ff8a5c',
  teal: '#2fbfa0',
  green: '#4fae5c',
  purple: '#a15bd6',
  red: '#ef5d5d',
};

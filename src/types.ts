// Core data model for Wake & Wonder — the analog routine clock system.
// Kept deliberately flat and serializable (localStorage-friendly).

export type RepeatKind = 'once' | 'daily' | 'weekdays' | 'weekends' | 'custom';

export interface RepeatRule {
  kind: RepeatKind;
  /** 0=Sun..6=Sat, only used when kind === 'custom' */
  days?: number[];
  /** ISO date (yyyy-mm-dd) this single occurrence belongs to, only used when kind === 'once' */
  date?: string;
}

export type ScheduleType = 'fixedTime' | 'durationFromWake' | 'timer';

export type ClockRole = 'sleep' | 'wakeup' | 'person' | 'event' | 'timer';

export type ClockVisibility = 'child' | 'adultOnly';

export interface Clock {
  id: string;
  name: string;
  icon: string;
  role: ClockRole;
  scheduleType: ScheduleType;
  /** "HH:MM" 24h wall-clock time, used when scheduleType === 'fixedTime' (also bedtime/wake for sleep/wakeup roles) */
  time?: string;
  /** minutes, used for 'durationFromWake' (offset from the day's wake moment) and 'timer' (length of the countdown) */
  durationMinutes?: number;
  /** epoch ms — set only while a 'timer' clock is actively running */
  timerStartedAt?: number | null;
  repeat: RepeatRule;
  enabled: boolean;
  visibility: ClockVisibility;
  soundEnabled: boolean;
  /** which ringer plays when this clock becomes ready — see engine/sound.ts RINGTONES */
  ringtoneId: string;
  colorId: string;
  /** ISO date strings (yyyy-mm-dd) of occurrences the child has already marked "Done" */
  completedDates: string[];
  order: number;
  /** profile ids this clock belongs to; empty/undefined = all profiles */
  profileIds?: string[];
}

export interface Profile {
  id: string;
  name: string;
  icon: string;
  /** which days of week this routine profile is active on, 0=Sun..6=Sat. Empty = manual-only (never auto-picked). */
  activeDays: number[];
}

export type ClockFaceStyle = 'analog' | 'digital' | 'countdown' | 'analogCountdown';

export interface AppSettings {
  themeId: string;
  clockFaceStyle: ClockFaceStyle;
  childViewMode: 'all' | 'next';
  showTimeline: boolean;
  soundEnabled: boolean;
  readAloudEnabled: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  parentPinHash: string | null;
  activeProfileId: string | null; // null = auto-pick by day of week
}

export interface SleepLogEntry {
  date: string; // ISO date of the bedtime (the night this entry started)
  bedtimeAt: number; // epoch ms
  wakeAt: number | null; // epoch ms, null until child gets up
}

export interface AppData {
  clocks: Clock[];
  profiles: Profile[];
  settings: AppSettings;
  sleepLog: SleepLogEntry[];
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

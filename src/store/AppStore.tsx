import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { AppData, AppSettings, Clock, Profile } from '../types';
import { loadData, saveData } from './persistence';
import { computeAppState, markOccurrenceDone, startTimer, stopTimer, type AppState } from '../engine/schedule';
import { toISODate } from '../engine/time';
import { playRingtone, playGoodnightChime } from '../engine/sound';
import { speak } from '../engine/speech';

type Action =
  | { type: 'ADD_CLOCK'; clock: Clock }
  | { type: 'UPDATE_CLOCK'; id: string; patch: Partial<Clock> }
  | { type: 'DELETE_CLOCK'; id: string }
  | { type: 'REORDER_CLOCKS'; orderedIds: string[] }
  | { type: 'MARK_DONE'; id: string; occurrenceKey: string }
  | { type: 'START_TIMER'; id: string; now: Date }
  | { type: 'STOP_TIMER'; id: string }
  | { type: 'UPDATE_SETTINGS'; patch: Partial<AppSettings> }
  | { type: 'ADD_PROFILE'; profile: Profile }
  | { type: 'UPDATE_PROFILE'; id: string; patch: Partial<Profile> }
  | { type: 'DELETE_PROFILE'; id: string }
  | { type: 'LOG_SLEEP'; entries: AppData['sleepLog'] };

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'ADD_CLOCK':
      return { ...state, clocks: [...state.clocks, action.clock] };
    case 'UPDATE_CLOCK':
      return { ...state, clocks: state.clocks.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)) };
    case 'DELETE_CLOCK':
      return { ...state, clocks: state.clocks.filter((c) => c.id !== action.id) };
    case 'REORDER_CLOCKS': {
      const orderIndex = new Map(action.orderedIds.map((id, i) => [id, i]));
      return { ...state, clocks: state.clocks.map((c) => (orderIndex.has(c.id) ? { ...c, order: orderIndex.get(c.id)! } : c)) };
    }
    case 'MARK_DONE':
      return { ...state, clocks: state.clocks.map((c) => (c.id === action.id ? markOccurrenceDone(c, action.occurrenceKey) : c)) };
    case 'START_TIMER':
      return { ...state, clocks: state.clocks.map((c) => (c.id === action.id ? startTimer(c, action.now) : c)) };
    case 'STOP_TIMER':
      return { ...state, clocks: state.clocks.map((c) => (c.id === action.id ? stopTimer(c) : c)) };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'ADD_PROFILE':
      return { ...state, profiles: [...state.profiles, action.profile] };
    case 'UPDATE_PROFILE':
      return { ...state, profiles: state.profiles.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)) };
    case 'DELETE_PROFILE':
      return { ...state, profiles: state.profiles.filter((p) => p.id !== action.id) };
    case 'LOG_SLEEP':
      return { ...state, sleepLog: action.entries };
    default:
      return state;
  }
}

interface StoreValue {
  data: AppData;
  now: Date;
  appState: AppState;
  adultUnlocked: boolean;
  setAdultUnlocked: (v: boolean) => void;
  addClock: (clock: Clock) => void;
  updateClock: (id: string, patch: Partial<Clock>) => void;
  deleteClock: (id: string) => void;
  reorderClocks: (orderedIds: string[]) => void;
  markDone: (id: string, occurrenceKey: string) => void;
  startTimerFor: (id: string) => void;
  stopTimerFor: (id: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  addProfile: (profile: Profile) => void;
  updateProfile: (id: string, patch: Partial<Profile>) => void;
  deleteProfile: (id: string) => void;
  goodnightBurstKey: number;
}

const StoreContext = createContext<StoreValue | null>(null);

function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(new Date());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, loadData);
  const [adultUnlocked, setAdultUnlocked] = useState(false);
  const now = useNow(15000);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const appState = useMemo(
    () => computeAppState(now, data.clocks, data.profiles, data.settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now, data.clocks, data.profiles, data.settings.activeProfileId],
  );

  // Keep a simple, friendly sleep log — one entry per night, filled in once wake actually happens.
  useEffect(() => {
    const { sleepState } = appState;
    const key = toISODate(sleepState.bedtimeInstant);
    const wakeAt = sleepState.mode === 'day' ? sleepState.wakeInstant.getTime() : null;
    const existing = data.sleepLog.find((e) => e.date === key);
    if (existing && existing.bedtimeAt === sleepState.bedtimeInstant.getTime() && existing.wakeAt === wakeAt) return;
    const next = data.sleepLog.filter((e) => e.date !== key);
    next.push({ date: key, bedtimeAt: sleepState.bedtimeInstant.getTime(), wakeAt });
    next.sort((a, b) => (a.date < b.date ? 1 : -1));
    dispatch({ type: 'LOG_SLEEP', entries: next.slice(0, 14) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState.sleepState.mode, appState.sleepState.bedtimeInstant.getTime(), appState.sleepState.wakeInstant.getTime()]);

  // Play each clock's chosen ringer — and optionally say its name out loud — the moment it
  // *becomes* ready. Never on every re-render, and never on first load (so an already-ready
  // clock doesn't blast a sound/announcement the instant the app opens).
  const prevStatusesRef = useRef<Map<string, string> | null>(null);
  useEffect(() => {
    const nextStatuses = new Map<string, string>();
    const soundable: Array<{ id: string; status: string; clock: Clock | null }> = [];
    if (appState.wakeClock && appState.wakeState) {
      soundable.push({ id: appState.wakeClock.id, status: appState.wakeState.status, clock: appState.wakeClock });
    }
    for (const { clock, state } of appState.clockStates) {
      soundable.push({ id: clock.id, status: state.status, clock });
    }

    for (const { id, status, clock } of soundable) {
      nextStatuses.set(id, status);
      const prevStatus = prevStatusesRef.current?.get(id);
      const justBecameReady = status === 'ready' && prevStatus != null && prevStatus !== 'ready';
      if (!justBecameReady || !clock) continue;
      if (data.settings.soundEnabled && clock.soundEnabled && clock.ringtoneId) {
        playRingtone(clock.ringtoneId);
      }
      if (data.settings.readAloudEnabled) {
        const name = data.settings.childName;
        speak(clock.role === 'wakeup' ? `Good morning${name ? `, ${name}` : ''}! You can get up now!` : `${clock.name} time!`);
      }
    }
    prevStatusesRef.current = nextStatuses;
  }, [appState, data.settings.soundEnabled, data.settings.readAloudEnabled, data.settings.childName]);

  // A gentle "goodnight" moment when bedtime actually arrives — the counterpart to the wake
  // celebration. Only fires on a real day->night transition witnessed live, never on first load.
  const [goodnightBurstKey, setGoodnightBurstKey] = useState(0);
  const prevSleepModeRef = useRef<'day' | 'night' | null>(null);
  useEffect(() => {
    const mode = appState.sleepState.mode;
    if (prevSleepModeRef.current === 'day' && mode === 'night') {
      setGoodnightBurstKey((k) => k + 1);
      if (data.settings.soundEnabled) playGoodnightChime();
    }
    prevSleepModeRef.current = mode;
  }, [appState.sleepState.mode, data.settings.soundEnabled]);

  const value: StoreValue = {
    data,
    now,
    appState,
    adultUnlocked,
    setAdultUnlocked,
    addClock: useCallback((clock) => dispatch({ type: 'ADD_CLOCK', clock }), []),
    updateClock: useCallback((id, patch) => dispatch({ type: 'UPDATE_CLOCK', id, patch }), []),
    deleteClock: useCallback((id) => dispatch({ type: 'DELETE_CLOCK', id }), []),
    reorderClocks: useCallback((orderedIds) => dispatch({ type: 'REORDER_CLOCKS', orderedIds }), []),
    markDone: useCallback((id, occurrenceKey) => dispatch({ type: 'MARK_DONE', id, occurrenceKey }), []),
    startTimerFor: useCallback((id) => dispatch({ type: 'START_TIMER', id, now: new Date() }), []),
    stopTimerFor: useCallback((id) => dispatch({ type: 'STOP_TIMER', id }), []),
    updateSettings: useCallback((patch) => dispatch({ type: 'UPDATE_SETTINGS', patch }), []),
    addProfile: useCallback((profile) => dispatch({ type: 'ADD_PROFILE', profile }), []),
    updateProfile: useCallback((id, patch) => dispatch({ type: 'UPDATE_PROFILE', id, patch }), []),
    deleteProfile: useCallback((id) => dispatch({ type: 'DELETE_PROFILE', id }), []),
    goodnightBurstKey,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within AppStoreProvider');
  return ctx;
}

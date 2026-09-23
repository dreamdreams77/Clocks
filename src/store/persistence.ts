import type { AppData } from '../types';
import { createDefaultData } from './defaultData';

const STORAGE_KEY = 'wake-and-wonder:data:v1';

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    const fallback = createDefaultData();
    const clocks = Array.isArray(parsed.clocks) ? parsed.clocks : fallback.clocks;
    return {
      clocks: clocks.map((c) => ({
        ...c,
        // Backfill fields added after a save was made (e.g. ringtoneId) so old saved data keeps working.
        ringtoneId: c.ringtoneId ?? 'gentleChime',
        // One-time rename: the default "School" clock became "Kinder". Only touches it if it's
        // still exactly the untouched default, so a clock someone deliberately named "School" stays put.
        name: c.id === 'school' && c.name === 'School' ? 'Kinder' : c.name,
      })),
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : fallback.profiles,
      settings: { ...fallback.settings, ...(parsed.settings ?? {}) },
      sleepLog: Array.isArray(parsed.sleepLog) ? parsed.sleepLog : fallback.sleepLog,
    };
  } catch {
    return createDefaultData();
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable (private mode, quota) — app keeps working in-memory for this session
  }
}

/** Not cryptographic — this is a friendly speed-bump against curious little fingers, not a security boundary. */
export function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = (hash * 31 + pin.charCodeAt(i)) | 0;
  }
  return `p${hash}`;
}

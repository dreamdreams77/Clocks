// Synthesized alarm ringers — no audio files to source or bundle, works fully offline,
// and every sound is generated fresh from a short note-list so it's trivial to add more.

export interface Ringtone {
  id: string;
  name: string;
  icon: string;
}

interface Note {
  /** seconds after the ringtone starts */
  at: number;
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

const RINGTONE_NOTES: Record<string, Note[]> = {
  none: [],
  // A soft 3-note ascending chime — the gentlest option, good for a bedtime clock.
  gentleChime: [
    { at: 0, freq: 523.25, duration: 0.5, type: 'sine', gain: 0.22 },
    { at: 0.22, freq: 659.25, duration: 0.5, type: 'sine', gain: 0.22 },
    { at: 0.44, freq: 783.99, duration: 0.7, type: 'sine', gain: 0.24 },
  ],
  // The classic wind-up alarm clock "brrring" — two close bell tones alternating fast.
  classicBell: (() => {
    const notes: Note[] = [];
    const pairs = 6;
    for (let i = 0; i < pairs; i++) {
      const t = i * 0.16;
      notes.push({ at: t, freq: 1000, duration: 0.09, type: 'triangle', gain: 0.28 });
      notes.push({ at: t + 0.08, freq: 1200, duration: 0.09, type: 'triangle', gain: 0.28 });
    }
    return notes;
  })(),
  // A classic digital-watch alarm: three short square-wave beeps, repeated twice.
  digitalBeep: (() => {
    const notes: Note[] = [];
    for (let rep = 0; rep < 2; rep++) {
      for (let i = 0; i < 3; i++) {
        notes.push({ at: rep * 0.75 + i * 0.18, freq: 1568, duration: 0.11, type: 'square', gain: 0.18 });
      }
    }
    return notes;
  })(),
  // A friendly, stylized "cock-a-doodle-doo" — a few sliding sine notes.
  roosterCall: [
    { at: 0, freq: 587, duration: 0.12, type: 'sawtooth', gain: 0.2 },
    { at: 0.12, freq: 880, duration: 0.16, type: 'sawtooth', gain: 0.22 },
    { at: 0.3, freq: 784, duration: 0.1, type: 'sawtooth', gain: 0.18 },
    { at: 0.42, freq: 990, duration: 0.32, type: 'sawtooth', gain: 0.24 },
  ],
  // Twinkly high pentatonic tones, like a little wind chime.
  windChime: [
    { at: 0, freq: 987.77, duration: 0.6, type: 'sine', gain: 0.16 },
    { at: 0.12, freq: 1174.66, duration: 0.6, type: 'sine', gain: 0.14 },
    { at: 0.3, freq: 1479.98, duration: 0.7, type: 'sine', gain: 0.15 },
    { at: 0.5, freq: 1318.51, duration: 0.6, type: 'sine', gain: 0.13 },
  ],
  // A quick ascending marimba-style arpeggio.
  xylophone: [
    { at: 0, freq: 392, duration: 0.3, type: 'triangle', gain: 0.24 },
    { at: 0.12, freq: 523.25, duration: 0.3, type: 'triangle', gain: 0.24 },
    { at: 0.24, freq: 659.25, duration: 0.3, type: 'triangle', gain: 0.24 },
    { at: 0.36, freq: 784, duration: 0.45, type: 'triangle', gain: 0.26 },
  ],
};

export const RINGTONES: Ringtone[] = [
  { id: 'none', name: 'No sound', icon: '🔇' },
  { id: 'gentleChime', name: 'Gentle Chime', icon: '🎐' },
  { id: 'classicBell', name: 'Classic Bell', icon: '🔔' },
  { id: 'digitalBeep', name: 'Digital Beep', icon: '⏰' },
  { id: 'roosterCall', name: 'Rooster Call', icon: '🐓' },
  { id: 'windChime', name: 'Wind Chime', icon: '🌬️' },
  { id: 'xylophone', name: 'Xylophone', icon: '🎶' },
];

let sharedCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) sharedCtx = new Ctor();
  if (sharedCtx.state === 'suspended') void sharedCtx.resume();
  return sharedCtx;
}

/** Call once from a user-gesture handler (e.g. first tap) to unlock audio on iOS/Safari. */
export function unlockAudio(): void {
  getContext();
}

function playNotes(notes: Note[]): void {
  if (notes.length === 0) return;
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = note.type ?? 'sine';
    osc.frequency.value = note.freq;
    const startAt = now + note.at;
    const peak = note.gain ?? 0.2;
    gainNode.gain.setValueAtTime(0, startAt);
    gainNode.gain.linearRampToValueAtTime(peak, startAt + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + note.duration);
    osc.connect(gainNode).connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + note.duration + 0.02);
  }
}

export function playRingtone(id: string): void {
  playNotes(RINGTONE_NOTES[id] ?? []);
}

// A quick, cheerful 4-note ascending "ta-da" — the sound for tapping Done!, distinct from any
// alarm ringtone so a child learns to tell "something is ready" apart from "well done".
const SUCCESS_CHIME: Note[] = [
  { at: 0, freq: 587.33, duration: 0.16, type: 'triangle', gain: 0.22 },
  { at: 0.1, freq: 739.99, duration: 0.16, type: 'triangle', gain: 0.22 },
  { at: 0.2, freq: 880, duration: 0.16, type: 'triangle', gain: 0.24 },
  { at: 0.32, freq: 1174.66, duration: 0.4, type: 'triangle', gain: 0.26 },
];

export function playSuccessChime(): void {
  playNotes(SUCCESS_CHIME);
}

export function getRingtone(id: string): Ringtone {
  return RINGTONES.find((r) => r.id === id) ?? RINGTONES[0];
}

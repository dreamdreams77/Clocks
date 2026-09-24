// Read-aloud for pre-readers, using the browser's built-in speech synthesis — no audio assets,
// works offline once the OS/browser voice is installed (it usually already is).

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string): void {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel(); // don't queue up overlapping announcements
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.15;
    utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    // speech synthesis can throw in some embedded/locked-down webviews — fail silently
  }
}

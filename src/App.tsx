import { useEffect, useState } from 'react';
import { useStore } from './store/AppStore';
import { getTheme, applyThemeVars } from './themes/themes';
import { unlockAudio } from './engine/sound';
import { ChildHome } from './components/ChildHome';
import { PinLock } from './components/adult/PinLock';
import { AdultSettings } from './components/adult/AdultSettings';

type View = 'child' | 'adultLock' | 'adult';

export function App() {
  const { data, appState } = useStore();
  const [view, setView] = useState<View>('child');

  useEffect(() => {
    applyThemeVars(getTheme(data.settings.themeId), appState.sleepState.mode === 'night');
  }, [data.settings.themeId, appState.sleepState.mode]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-reduced-motion', String(data.settings.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches));
    root.setAttribute('data-large-text', String(data.settings.largeText));
    root.setAttribute('data-contrast', data.settings.highContrast ? 'high' : 'normal');
  }, [data.settings.reducedMotion, data.settings.largeText, data.settings.highContrast]);

  useEffect(() => {
    // iOS/Safari only allow starting audio from within a real user gesture — grab the first one.
    const unlock = () => unlockAudio();
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, []);

  if (view === 'adultLock') {
    return (
      <PinLock
        expectedHash={data.settings.parentPinHash!}
        onUnlock={() => setView('adult')}
        onCancel={() => setView('child')}
      />
    );
  }

  if (view === 'adult') {
    return <AdultSettings onExit={() => setView('child')} />;
  }

  return (
    <ChildHome
      onOpenAdult={() => setView(data.settings.parentPinHash ? 'adultLock' : 'adult')}
    />
  );
}

import { useMemo, useState } from 'react';
import { useStore } from '../store/AppStore';
import { getTheme } from '../themes/themes';
import { friendlyClockTime, friendlyDuration } from '../engine/time';
import { AnalogClock } from './AnalogClock';
import { ClockCard } from './ClockCard';
import { NextThing } from './NextThing';
import { TimelineView } from './TimelineView';
import { SleepLogView } from './SleepLogView';
import { InstallBanner } from './InstallBanner';
import { SimpleClockIcon } from './SimpleClockIcon';

export function ChildHome({ onOpenAdult }: { onOpenAdult: () => void }) {
  const { data, now, appState, markDone, startTimerFor } = useStore();
  const [showTimeline, setShowTimeline] = useState(false);
  const theme = getTheme(data.settings.themeId);
  const reducedMotion = data.settings.reducedMotion;
  const faceStyle = data.settings.clockFaceStyle;

  const decor = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => ({
        emoji: theme.decor[i % theme.decor.length],
        top: `${8 + ((i * 37) % 80)}%`,
        left: `${5 + ((i * 53) % 90)}%`,
        delay: `${(i * 1.3) % 6}s`,
      })),
    [theme.decor],
  );

  const wakeState = appState.wakeState;
  const wakeReadyNotDone = wakeState?.status === 'ready';

  const childEntries = appState.clockStates.filter((e) => e.clock.visibility === 'child');
  const activeEntries = childEntries.filter((e) => e.state.status !== 'inactive' && e.state.status !== 'idle' && e.state.status !== 'completed');
  const completedEntries = childEntries.filter((e) => e.state.status === 'completed');
  const idleTimers = childEntries.filter((e) => e.state.status === 'idle' && e.clock.scheduleType === 'timer');

  const nextEntry = useMemo(() => {
    const candidates = activeEntries.filter((e) => e.state.status === 'ready' || e.state.status === 'upcoming');
    if (candidates.length === 0) return null;
    return candidates.reduce((best, cur) => (cur.state.msRemaining < best.state.msRemaining ? cur : best));
  }, [activeEntries]);

  return (
    <div className="app-shell">
      <div className="decor-layer" aria-hidden="true">
        {decor.map((d, i) => (
          <span key={i} className="decor-emoji" style={{ top: d.top, left: d.left, animationDelay: d.delay }}>
            {d.emoji}
          </span>
        ))}
      </div>

      <div className="top-bar">
        <span style={{ fontSize: '1.6rem' }} aria-hidden="true">{theme.icon}</span>
        <button className="icon-btn" onClick={onOpenAdult} aria-label="Grown-up settings">
          <SimpleClockIcon />
        </button>
      </div>

      <InstallBanner />

      {appState.sleepState.mode === 'night' ? (
        <NightHero now={now} sleepClock={appState.sleepClock} wakeInstant={appState.sleepState.wakeInstant} msUntilWake={appState.sleepState.msUntilWake} reducedMotion={reducedMotion} faceStyle={faceStyle} />
      ) : wakeReadyNotDone && wakeState ? (
        <div className="hero">
          <div className="hero-icons" aria-hidden="true">☀️</div>
          <div className="hero-title">Good Morning!</div>
          <div className="hero-clock-wrap">
            <AnalogClock now={now} size={200} reducedMotion={reducedMotion} showSeconds={false} />
          </div>
          <div className="hero-sub">You can get up now! ❤️</div>
          <button className="big-button" onClick={() => appState.wakeClock && markDone(appState.wakeClock.id, wakeState.occurrenceKey!)}>
            I'm up! 🎉
          </button>
        </div>
      ) : (
        <div className="hero" style={{ paddingBottom: 0 }}>
          <div className="hero-icons" aria-hidden="true">☀️</div>
          <div className="hero-title" style={{ fontSize: '1.5rem' }}>Morning</div>
        </div>
      )}

      {/* The rest of the day's/night's clocks — always visible together, not just after wake,
          so the child can see everything that's set (per "multiple clocks on the main page"). */}
      <>
        {data.settings.showTimeline && (
          <div className="mode-toggle">
            <button className={`chip-btn${showTimeline ? ' is-active' : ''}`} onClick={() => setShowTimeline((v) => !v)}>
              🗺 {showTimeline ? 'Hide' : 'Show'} timeline
            </button>
          </div>
        )}

        {showTimeline ? (
          <TimelineView sleepClock={appState.sleepClock} wakeClock={appState.wakeClock} sleepState={appState.sleepState} entries={childEntries} />
        ) : data.settings.childViewMode === 'next' ? (
          <NextThing now={now} entry={nextEntry} reducedMotion={reducedMotion} onDone={() => nextEntry && markDone(nextEntry.clock.id, nextEntry.state.occurrenceKey!)} />
        ) : (
          <>
            {activeEntries.length > 0 && (
              <div className="clock-wall">
                {activeEntries.map(({ clock, state }) => (
                  <ClockCard
                    key={clock.id}
                    clock={clock}
                    state={state}
                    now={now}
                    reducedMotion={reducedMotion}
                    faceStyle={faceStyle}
                    onDone={() => markDone(clock.id, state.occurrenceKey!)}
                  />
                ))}
              </div>
            )}

            {idleTimers.length > 0 && (
              <>
                <div className="section-title">⏱ Ready to start</div>
                <div className="clock-wall">
                  {idleTimers.map(({ clock }) => (
                    <div className="clock-card" key={clock.id}>
                      <div style={{ fontSize: '1.8rem' }} aria-hidden="true">{clock.icon}</div>
                      <div className="clock-card-name">{clock.name}</div>
                      <div className="clock-card-status">Waiting to start</div>
                      <button className="done-btn" onClick={() => startTimerFor(clock.id)}>Start ▶</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {completedEntries.length > 0 && (
              <>
                <div className="section-title">✓ Done</div>
                <div className="clock-wall">
                  {completedEntries.map(({ clock, state }) => (
                    <ClockCard key={clock.id} clock={clock} state={state} now={now} reducedMotion={reducedMotion} faceStyle={faceStyle} />
                  ))}
                </div>
              </>
            )}

            {activeEntries.length === 0 && completedEntries.length === 0 && idleTimers.length === 0 && (
              <div className="empty-state">Nothing scheduled right now. ✨</div>
            )}
          </>
        )}
      </>

      {appState.sleepState.mode === 'day' && !wakeReadyNotDone && <SleepLogView entries={data.sleepLog} />}
    </div>
  );
}

function NightHero({
  now,
  sleepClock,
  wakeInstant,
  msUntilWake,
  reducedMotion,
  faceStyle,
}: {
  now: Date;
  sleepClock: { name: string } | null;
  wakeInstant: Date;
  msUntilWake: number;
  reducedMotion: boolean;
  faceStyle: string;
}) {
  return (
    <div className="hero">
      <div className="hero-icons" aria-hidden="true">🌙 ⭐</div>
      <div className="hero-title">{sleepClock?.name ?? 'Sleep Time'}</div>
      {(faceStyle === 'analog' || faceStyle === 'analogCountdown') && (
        <div className="hero-clock-wrap">
          <AnalogClock now={now} target={wakeInstant} size={240} reducedMotion={reducedMotion} label="Sleep clock" />
        </div>
      )}
      <div className="hero-sub">You can get up at {friendlyClockTime(wakeInstant)}</div>
      {faceStyle !== 'analog' && <div className="hero-countdown">{friendlyDuration(msUntilWake)} to go</div>}
    </div>
  );
}

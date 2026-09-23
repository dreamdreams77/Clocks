# Wake & Wonder — Analog Routine Clocks

A child-friendly wall of analog clocks that helps a child understand what
time it is, what part of the day/night they're in, and when specific things
(getting up, waking Daddy, breakfast, school…) are allowed to happen. Adults
control the schedule; the child sees only simple, analog, icon-first clocks.

Offline-first, no account, everything persisted to `localStorage`.

## Running it

```bash
npm install
npm run dev       # start the dev server
npm run build     # production build (runs the TypeScript project build too)
npm test          # run the scheduling-engine unit tests once
npm run test:watch
```

## Architecture

- **`src/engine/`** — the pure scheduling core. No React, no I/O, no
  `setInterval` reliance for correctness: every function takes an explicit
  `now: Date` and derives state from real timestamps, so answers are correct
  whether the app has been open continuously or was just reopened after
  hours closed.
  - `time.ts` — DST-safe date arithmetic (builds `Date`s from calendar
    fields instead of adding raw millisecond offsets).
  - `repeat.ts` — resolves `RepeatRule` (`once` / `daily` / `weekdays` /
    `weekends` / `custom`) against calendar days.
  - `schedule.ts` — `computeSleepState` (night/day + overnight & midnight
    crossing), `computeClockState` (per-clock status for `fixedTime`,
    `durationFromWake`, and `timer` clocks), and `computeAppState` (ties
    clocks + routine profiles + sleep state together for the UI).
  - `schedule.test.ts` — 23 Vitest cases covering every scenario called out
    in the spec: overnight sleep, post-wake fixed-time clocks computed live
    from the current time, temporary timers (including "app was closed and
    reopened"), multiple simultaneous timers, midnight crossing, daily /
    weekday / weekend / custom repeat rules, disabled clocks, one-off
    past/future events, `durationFromWake` clocks, and routine-profile
    selection by day of week.

- **`src/types.ts`** — the shared `Clock` model (`id, name, icon, role,
  scheduleType, time/duration, repeat, enabled, visibility, soundEnabled,
  completedDates, order, profileIds`), `Profile` (a recurring routine, e.g.
  "School Day" vs "Weekend"), and `AppSettings`.

- **`src/store/`** — `AppStore.tsx` is a small React context + reducer that
  owns `AppData` (clocks, profiles, settings, sleep log), recomputes
  `computeAppState` on a UI-refresh tick (`useNow`, also re-syncs on tab
  visibility change), and persists to `localStorage` (`persistence.ts`).
  `defaultData.ts` seeds a ready-to-use schedule (Sleep 9pm → Wake 7am →
  Daddy 7:30 → Mummy 8:00 → Breakfast 8:15 → Dressed 8:45 → School 9:00,
  matching the spec's example) plus the clock-type preset list.

- **`src/components/`** — `AnalogClock` (SVG face, smooth hand transitions,
  an arc + marker showing the target time, `reducedMotion`-aware),
  `ClockCard`, `NextThing`, `TimelineView`, `SleepLogView`, and `ChildHome`
  (orchestrates the night hero → "You can get up now!" gate → morning clock
  wall / Next-Thing mode / timeline). `components/adult/` holds the parent
  lock (`PinLock`), the clock CRUD + reordering UI (`ClockList` +
  `ClockEditor`, with the preset picker), `ProfileEditor` (recurring
  routines), and `AdultSettings` (theme, display, accessibility, PIN).

- **`src/themes/themes.ts`** — 9 child-friendly themes (Moon & Stars, Sunny
  Morning, Dinosaurs, Magical, Sleepy Bear, Space, Forest, Dragons,
  Rainbow), each a set of CSS custom properties applied to `:root`
  (`applyThemeVars`), with a night/day background swap.

- **`src/styles/global.css`** — layout, cards, the parent-lock keypad, and
  accessibility hooks (`data-reduced-motion`, `data-large-text`,
  `data-contrast`, `:focus-visible` rings, large touch targets throughout).

## Clock types

- **Sleep** / **Wake-up** — the two clocks that gate night vs. day mode.
- **Fixed time** — "Wake Daddy at 7:30" — computed live from the current
  time on every render, so reopening the app mid-morning shows the correct
  remaining minutes rather than restarting a countdown.
- **Duration from wake** — "30 minutes after getting up," anchored to the
  actual wake moment (previewed but not counted down while still asleep).
- **Timer** — an ad-hoc countdown an adult starts from "now" (e.g. "wait 20
  minutes"), independent of the daily schedule.

Repeat rules (`once` with a specific date / `daily` / `weekdays` /
`weekends` / `custom` days) apply to any of the above. Recurring **routine
profiles** (e.g. School Day vs. Weekend vs. Nap) give different days their
own bedtime/wake/clocks; the active profile is auto-picked by day of week,
or the adult can pin one in Settings.

## Tests

`npm test` runs `src/engine/schedule.test.ts` — 23 passing cases (overnight
sleep, post-wake countdowns computed from real elapsed time, temporary
timers surviving an app close/reopen, multiple simultaneous timers,
midnight crossing, every repeat kind, disabled/past/future one-offs,
`durationFromWake`, and routine-profile selection).

## Sound

`src/engine/sound.ts` synthesizes six ringers (Gentle Chime, Classic Bell,
Digital Beep, Rooster Call, Wind Chime, Xylophone) with the Web Audio API —
no audio files to source or bundle. Each clock has its own `ringtoneId`,
editable with a preview button in `ClockEditor`; `AppStore` plays it the
moment a clock genuinely transitions to "ready" (never on re-render or on
first load), gated by both the global Sounds switch and the clock's own
toggle.

## Installing it as an app (PWA)

The app is a installable Progressive Web App — `vite-plugin-pwa` generates
the manifest and service worker at build time (`public/icons/` holds the
192/512/maskable/apple-touch icons). Once it's deployed somewhere over
HTTPS (see below), open that URL on the tablet/phone:

- **iPhone / iPad (Safari):** tap the **Share** button, then **"Add to Home
  Screen."** iOS ignores the web app manifest for this, so `index.html`
  carries the `apple-mobile-web-app-*` meta tags that make it open
  full-screen instead of inside Safari's browser chrome.
- **Android (Chrome):** Chrome offers an **Install** prompt automatically;
  `InstallBanner` surfaces it as an in-app button via the
  `beforeinstallprompt` event.

`InstallBanner` (shown on the child home screen) detects the platform,
skips itself if the app is already installed or was dismissed
(`localStorage`), and only appears on iOS/Android — desktop browsers are
left alone since this is a tablet/phone feature.

### Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds and deploys `dist/` to GitHub Pages
on every push to `main` (tests run first; a failing test blocks the
deploy). One-time setup: in the repo's **Settings → Pages**, set **Source**
to **"GitHub Actions."** After that, pushes to `main` publish automatically
and the Actions tab shows the live URL
(`https://<owner>.github.io/<repo>/`). `vite.config.ts` uses `base: './'`
(relative asset paths) so the build works at any subpath without
hardcoding the repo name.

## Known limitations / follow-ups

- The parent PIN uses a simple non-cryptographic hash — it's a
  speed-bump for little fingers, not a real security boundary.
- Drag-and-drop reordering works with mouse/HTML5 DnD and always has
  accessible ↑/↓ button fallbacks (touch drag-and-drop is inherently
  inconsistent across mobile browsers).

The original "Holding You" song/karaoke page that used to live at the repo
root has been moved to `legacy/` and is unrelated to this app.

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'wake-and-wonder:install-banner-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isAppleTouch = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as "Macintosh" but, unlike a real Mac, has touch support.
  const isIPadDesktopMode = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return isAppleTouch || isIPadDesktopMode;
}

function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
}

export function InstallBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [installed, setInstalled] = useState(() => isStandalone());
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  if (installed || dismissed) return null;
  const ios = isIOS();
  const android = isAndroid();
  if (!ios && !android) return null; // desktop browsers: skip, this is a tablet/phone feature
  if (android && !deferredPrompt) return null; // Chrome hasn't offered install yet

  return (
    <div
      role="region"
      aria-label="Install this app"
      style={{
        position: 'relative',
        zIndex: 5,
        width: '100%',
        maxWidth: 640,
        margin: '10px auto 0',
        padding: '0 16px',
      }}
    >
      <div
        style={{
          background: 'var(--card)',
          border: '2px solid var(--card-border)',
          borderRadius: 16,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          backdropFilter: 'blur(8px)',
          color: 'var(--text)',
        }}
      >
        <span style={{ fontSize: '1.4rem' }} aria-hidden="true">📲</span>
        <div style={{ flex: 1, fontSize: '0.9rem' }}>
          {ios ? (
            showIOSSteps ? (
              <span>
                Tap the <strong>Share</strong> button <span aria-hidden="true">⬆️</span> in Safari's toolbar, then choose <strong>"Add to Home Screen"</strong>.
              </span>
            ) : (
              <span>Add this to your Home Screen so it works like an app.</span>
            )
          ) : (
            <span>Install this app on your device for quick, offline access.</span>
          )}
        </div>
        {ios ? (
          <button className="small-btn" onClick={() => setShowIOSSteps((v) => !v)}>
            {showIOSSteps ? 'Got it' : 'How?'}
          </button>
        ) : (
          <button
            className="small-btn"
            onClick={async () => {
              if (!deferredPrompt) return;
              await deferredPrompt.prompt();
              const choice = await deferredPrompt.userChoice;
              if (choice.outcome === 'accepted') setInstalled(true);
              setDeferredPrompt(null);
            }}
          >
            Install
          </button>
        )}
        <button className="small-btn" onClick={dismiss} aria-label="Dismiss install banner">
          ✕
        </button>
      </div>
    </div>
  );
}

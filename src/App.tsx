import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { genericArt, type AppEntry } from './data/catalog';
import { AppTile, HomeClock, StatusBar, TopShelf, Wallpaper } from './components/Home';
import { ContextMenu, ControlCenter, Toasts, type MenuItem } from './components/Overlays';
import { SettingsSheet } from './components/Settings';
import { ScreenSaver, Welcome } from './components/ScreenSaver';
import { Glyph } from './components/Glyph';
import { reshuffleWallpaper } from './data/wallpapers';
import { newBackdrop, useBackdrop } from './lib/backdrop';
import { applyInk, reset as resetInk } from './lib/ink';
import { focusEl, installNav, type Key } from './nav/spatial';
import * as tv from './platform';
import { getState, setLayout, showToast, useStore, type Layout } from './store/store';

const getPrefs = () => getState().prefs;

// Layout constants (1920×1080 design canvas) — keep in sync with styles/app.css
// Grid layout (dock) vs list layout — see styles/look.css
const GRID = { cols: 7, pitch: 204, peek: 412 };
const LIST = { cols: 1, pitch: 118, peek: 560 };
const CLOSE_MS = 220;
// Coming back to Glass after this long (TV was off / in another app) counts as a fresh start.
const NEW_SESSION_MS = 20 * 60 * 1000;
const ASSISTANT_HINT = 'Press the Google Assistant button (the four coloured dots) on your remote — it works right on top of Glass.';

type Overlay = 'cc' | 'settings' | null;
interface MenuState {
  app: AppEntry;
  anchor: { x: number; y: number; below: boolean };
}

/** Leave Glass the normal webOS way (back to whatever was on before, or the LG home bar). */
function exitApp() {
  const ps = (window as any).PalmSystem;
  if (ps && typeof ps.platformBack === 'function') ps.platformBack();
  else if (tv.isTV) window.close();
}

function orderApps(all: AppEntry[], layout: Layout): AppEntry[] {
  const pos: Record<string, number> = {};
  layout.order.forEach((id, i) => (pos[id] = i));
  const hidden: Record<string, boolean> = {};
  layout.hidden.forEach((id) => (hidden[id] = true));
  const known = all.filter((a) => pos[a.id] !== undefined && !hidden[a.id]).sort((a, b) => pos[a.id] - pos[b.id]);
  const rest = all.filter((a) => pos[a.id] === undefined && !hidden[a.id]);
  return known.concat(rest);
}

function useStageScale() {
  const calc = () => {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    return { s, x: (window.innerWidth - 1920 * s) / 2, y: (window.innerHeight - 1080 * s) / 2 };
  };
  const [v, setV] = useState(calc);
  useEffect(() => {
    const f = () => setV(calc());
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return v;
}

export function App() {
  const state = useStore();
  const { prefs, layout } = state;
  const stage = useStageScale();

  const [loaded, setLoaded] = useState<{ apps: AppEntry[]; source: tv.AppSource } | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [overlayClosing, setOverlayClosing] = useState(false);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [menuClosing, setMenuClosing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  // -1 = resting (big clock, no app selected); >= 0 = browsing the app row
  const [focusIndex, setFocusIndex] = useState(-1);
  const [shelfIndex, setShelfIndex] = useState(0);
  const [launching, setLaunching] = useState<string | null>(null);
  const [sleep, setSleep] = useState<{ mins: number; until: number } | null>(null);
  const [, setTick] = useState(0);
  const [welcome, setWelcome] = useState(prefs.welcome);
  const [saver, setSaver] = useState(false);
  const lastInput = useRef(Date.now());
  const welcomeRef = useRef(welcome);
  welcomeRef.current = welcome;

  useEffect(() => {
    tv.loadApps().then(setLoaded);
  }, []);

  // A "new session" (fresh start, or back after the TV was off / Glass was in the background a while):
  // new random wallpaper + the welcome screen.
  useEffect(() => {
    let hiddenAt = 0;
    const startSession = () => {
      reshuffleWallpaper();
      setTick((n) => n + 1);
      setSaver(false);
      if (getPrefs().welcome) setWelcome(true);
      else newBackdrop().catch(() => {});
    };
    if (!getPrefs().welcome) newBackdrop().catch(() => {}); // first start
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        tv.away.since = hiddenAt; // watching something else
      } else {
        if (hiddenAt && Date.now() - hiddenAt > NEW_SESSION_MS) startSession();
        lastInput.current = Date.now(); // back on Glass: idle time starts now
      }
    };
    const onRelaunch = () => {
      if (Date.now() - lastInput.current > NEW_SESSION_MS) startSession();
      lastInput.current = Date.now();
    };
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('webOSRelaunch', onRelaunch);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('webOSRelaunch', onRelaunch);
    };
  }, []);

  // Screen saver when the TV is left unattended ON GLASS — never while you're watching something.
  // "Watching" = Glass is hidden / not the app in front, or Glass opened another app and you
  // haven't touched Glass since.
  useEffect(() => {
    const touch = () => (lastInput.current = Date.now());
    const evs = ['keydown', 'mousemove', 'mousedown', 'wheel'];
    evs.forEach((e) => window.addEventListener(e, touch, true));
    const t = setInterval(() => {
      const mins = getPrefs().saverMins;
      if (mins <= 0) return;
      const watchingElsewhere =
        document.visibilityState !== 'visible' ||
        (tv.isTV && !document.hasFocus()) ||
        tv.away.since > lastInput.current;
      if (watchingElsewhere) return;
      if (Date.now() - lastInput.current < mins * 60000) return;
      // Left alone on the welcome screen counts too: it gives way to the screen saver.
      if (welcomeRef.current) setWelcome(false);
      setSaver((on) => on || true);
    }, 10000);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, touch, true));
      clearInterval(t);
    };
  }, []);

  const allApps = useMemo<AppEntry[]>(() => {
    if (!loaded) return [];
    const custom = layout.custom.map<AppEntry>((c) => ({
      id: 'custom:' + c.id,
      launchId: c.id,
      title: c.title,
      tagline: 'Added by you',
      art: genericArt(c.id, c.title),
      source: 'custom',
    }));
    return loaded.apps.concat(custom);
  }, [loaded, layout.custom]);

  const visible = useMemo(() => orderApps(allApps, layout), [allApps, layout.order, layout.hidden]);

  // Adaptive ink: re-measure whenever the photo (or the setting) changes.
  const photo = useBackdrop();
  const inkUrl = prefs.background === 'photo' && photo ? photo.url : '';
  useEffect(() => {
    if (!inkUrl) {
      resetInk();
      return;
    }
    applyInk(inkUrl, prefs.adaptiveInk);
  }, [inkUrl, prefs.adaptiveInk]);
  const browsing = focusIndex >= 0;
  const L = prefs.layout === 'list' ? LIST : GRID;
  const COLS = L.cols;
  // While browsing, rows past the visible ones scroll up inside the sheet so focus stays in view.
  const keepRows = prefs.layout === 'list' ? 5 : 1;
  const scrollRows = browsing ? Math.max(0, Math.floor(focusIndex / COLS) - keepRows) : 0;
  const goHome = () => focusEl(document.querySelector('.home-clock'));

  // Start in the resting state (big clock). ↓ goes into the apps.
  useEffect(() => {
    if (!loaded) return;
    setTimeout(goHome, 30);
  }, [loaded]);

  // Top Shelf follows focus, with a short delay so fast scrolling stays smooth.
  useEffect(() => {
    if (focusIndex < 0) return;
    const t = setTimeout(() => setShelfIndex(focusIndex), 140);
    return () => clearTimeout(t);
  }, [focusIndex]);

  // While an app is "picked up" in edit mode, keep focus on it as it moves.
  useEffect(() => {
    if (!picked) return;
    const el = document.querySelector(`[data-app-id="${picked.replace(/"/g, '\\"')}"]`);
    if (el && document.activeElement !== el) focusEl(el);
  }, [layout.order, picked]);

  // Sleep timer
  useEffect(() => {
    if (!sleep) return;
    const t = setInterval(() => {
      if (Date.now() >= sleep.until) {
        setSleep(null);
        tv.screenOff().catch((e) => showToast(`Sleep timer: ${e.message || 'screen off not allowed on this TV'}`));
      } else setTick((n) => n + 1);
    }, 10000);
    return () => clearInterval(t);
  }, [sleep]);
  const sleepLeft = sleep ? Math.max(1, Math.ceil((sleep.until - Date.now()) / 60000)) : null;

  // ------------------------------------------------------------ actions

  const openOverlay = (o: Overlay) => {
    setOverlayClosing(false);
    setOverlay(o);
  };
  const closeOverlay = () => {
    setOverlayClosing(true);
    setTimeout(() => {
      setOverlay(null);
      setOverlayClosing(false);
    }, CLOSE_MS);
  };
  const closeMenu = (then?: () => void) => {
    setMenuClosing(true);
    setTimeout(() => {
      setMenu(null);
      setMenuClosing(false);
      if (then) setTimeout(then, 0);
    }, CLOSE_MS - 60);
  };

  const launchApp = (app: AppEntry) => {
    setLaunching(app.id);
    tv.launch(app.launchId, app.params, app.altIds).then(
      () => setTimeout(() => setLaunching(null), 700),
      (e) => {
        setLaunching(null);
        showToast(`Couldn't open ${app.title}: ${e.message}. Not installed? Hold OK → Hide.`);
      }
    );
  };

  const openAssistant = () => {
    tv.openAssistant().catch(() => showToast(ASSISTANT_HINT));
  };

  const onActivate = (app: AppEntry) => {
    if (editing) setPicked(picked === app.id ? null : app.id);
    else launchApp(app);
  };

  const hideApp = (app: AppEntry) => {
    setLayout({ hidden: layout.hidden.concat([app.id]) });
    showToast(`${app.title} hidden — show it again in Settings`);
  };

  const moveApp = (id: string, k: Key) => {
    const ids = visible.map((a) => a.id);
    const i = ids.indexOf(id);
    const delta = k === 'left' ? -1 : k === 'right' ? 1 : k === 'up' ? -COLS : k === 'down' ? COLS : 0;
    const j = Math.max(0, Math.min(ids.length - 1, i + delta));
    if (i < 0 || j === i) return;
    ids.splice(i, 1);
    ids.splice(j, 0, id);
    setLayout({ order: ids });
    onTileFocus(j);
  };

  const onTileFocus = (i: number) => setFocusIndex(i);

  const openMenu = (el: HTMLElement) => {
    const id = el.getAttribute('data-app-id');
    const app = visible.filter((a) => a.id === id)[0];
    if (!app) return;
    const r = el.getBoundingClientRect();
    const toStage = (v: number, off: number) => (v - off) / stage.s;
    const cx = toStage(r.left + r.width / 2, stage.x);
    const bottom = toStage(r.bottom, stage.y);
    const top = toStage(r.top, stage.y);
    const below = bottom + 380 < 1060;
    setMenuClosing(false);
    setMenu({ app, anchor: { x: Math.max(40, Math.min(1920 - 460, cx - 210)), y: below ? bottom + 28 : top - 28, below } });
  };

  const menuItems = (app: AppEntry): MenuItem[] =>
    editing
      ? [
          { label: picked === app.id ? 'Drop Here' : 'Move', glyph: 'grid', action: () => closeMenu(() => setPicked(picked === app.id ? null : app.id)) },
          { label: 'Hide App', glyph: 'eyeOff', danger: true, action: () => closeMenu(() => hideApp(app)) },
          { label: 'Done Editing', glyph: 'check', action: () => closeMenu(() => (setEditing(false), setPicked(null))) },
        ]
      : [
          { label: 'Open', glyph: 'play', action: () => closeMenu(() => launchApp(app)) },
          // Move = edit mode with this app already picked up: arrows move it, OK drops it.
          { label: 'Move', glyph: 'grid', action: () => closeMenu(() => (setEditing(true), setPicked(app.id))) },
          { label: 'Hide App', glyph: 'eyeOff', danger: true, action: () => closeMenu(() => hideApp(app)) },
        ];

  // ------------------------------------------------------------ remote keys

  const handler = useRef<(k: Key, e?: Event) => boolean>(() => false);
  handler.current = (k: Key, e?: Event) => {
    if (k === 'back') {
      if (menu) closeMenu();
      else if (overlay) closeOverlay();
      else if (picked) setPicked(null);
      else if (editing) setEditing(false);
      else if (browsing) goHome(); // back to the clock
      else exitApp(); // on the main screen, Back leaves Glass like any normal TV app
      return true;
    }
    if (menu || overlay) return false;
    // ↑ (or a wheel roll up) from the top row of apps returns to the clock.
    if (browsing && !picked && k === 'up' && focusIndex < COLS) return goHome(), true;
    // Number keys 1–9 open your first nine apps (0 = Control Center).
    if (k.charAt(0) === 'n' && k.length === 2) {
      const n = Number(k.charAt(1));
      if (n === 0) return openOverlay('cc'), true;
      const app = visible[n - 1];
      if (app && !editing) {
        focusEl(document.querySelector(`[data-app-id="${app.id.replace(/"/g, '\\"')}"]`));
        launchApp(app);
      }
      return true;
    }
    if (k === 'blue') return openOverlay('cc'), true;
    if (k === 'green') return openOverlay('settings'), true;
    if (k === 'yellow') return setEditing(!editing), setPicked(null), true;
    if (picked && (k === 'up' || k === 'down' || k === 'left' || k === 'right')) {
      moveApp(picked, k);
      return true;
    }
    return false;
  };
  const longPress = useRef<(el: HTMLElement) => void>(() => {});
  longPress.current = (el) => {
    if (!menu && !overlay && el.hasAttribute('data-app-id')) openMenu(el);
  };

  useEffect(() => {
    installNav({ onKey: (k, e) => handler.current(k, e), onLongPress: (el) => longPress.current(el) });
    // Coming back to Glass from another app: tidy up.
    document.addEventListener('webOSRelaunch', () => {
      setMenu(null);
      setOverlay(null);
    });
  }, []);

  // ------------------------------------------------------------ render

  const shelfApp = visible[Math.min(shelfIndex, visible.length - 1)] || null;

  return (
    <div
      class={
        'stage' +
        ` bg-${prefs.background} layout-${prefs.layout} labels-${prefs.labels} font-${prefs.font} mat-${prefs.material}` +
        (prefs.reduceMotion ? ' reduce-motion' : '') +
        (prefs.reduceTransparency ? ' reduce-transparency' : '') +
        (saver || welcome ? ' saver-on' : '')
      }
      style={{ transform: `translate(${stage.x}px, ${stage.y}px) scale(${stage.s})` }}
    >
      <Wallpaper prefs={prefs} />

      <div class={'home' + (editing ? ' editing' : '') + (browsing ? ' browsing' : '')} data-layer>
        <div onFocusCapture={() => setFocusIndex(-1)}>
        <StatusBar
          prefs={prefs}
          showClock={browsing}
          editing={editing}
          sleepLeft={sleepLeft}
          onControlCenter={() => openOverlay('cc')}
          onSettings={() => openOverlay('settings')}
          onDone={() => (setEditing(false), setPicked(null))}
        />
        </div>

        {/* Resting: the big clock. Browsing: the selected app's details. They crossfade in place. */}
        <HomeClock prefs={prefs} onFocus={() => setFocusIndex(-1)} />
        <TopShelf app={shelfApp} />

        {/* The app sheet: resting, only row 1 peeks up; ↓ slides it up to reveal every app. */}
        <div class="library">
          <div class="sheet-glass glass-ui" />
          <div class="dock-glass glass-ui" />
          <div class="library-viewport">
            <div
              class="grid"
              data-nav-group="apps"
              data-nav-remember
              style={{ transform: `translate3d(0, ${(browsing ? 0 : L.peek) - scrollRows * L.pitch}px, 0)` }}
            >
              {visible.map((app, i) => (
                <AppTile
                  key={app.id}
                  app={app}
                  index={i}
                  editing={editing}
                  picked={picked === app.id}
                  launching={launching === app.id}
                  onFocus={onTileFocus}
                  onActivate={onActivate}
                />
              ))}
            </div>
          </div>
          {loaded && visible.length === 0 && <div class="empty">All apps are hidden. Open Settings to show them again.</div>}
        </div>
      </div>

      {editing && (
        <div class="edit-hint glass">
          {picked ? (
            <span>
              <Glyph name="grid" size={28} /> Use the arrows to move · <b>OK</b> to drop
            </span>
          ) : (
            <span>
              <b>OK</b> pick up an app · <b>Hold OK</b> for options · <b>Back</b> when done
            </span>
          )}
        </div>
      )}

      {overlay === 'cc' && (
        <ControlCenter
          closing={overlayClosing}
          hour12={prefs.hour12}
          editing={editing}
          sleepMins={sleep ? sleep.mins : 0}
          sleepLeft={sleepLeft}
          onSleep={(m) => {
            setSleep(m ? { mins: m, until: Date.now() + m * 60000 } : null);
            showToast(m ? `Screen turns off in ${m} minutes (while Glass is open)` : 'Sleep timer off');
          }}
          onEdit={() => {
            closeOverlay();
            setEditing(!editing);
            setPicked(null);
          }}
          onSettings={() => openOverlay('settings')}
          onAssistant={() => {
            closeOverlay();
            openAssistant();
          }}
          onScreenSaver={() => {
            closeOverlay();
            setTimeout(() => setSaver(true), CLOSE_MS + 50);
          }}
          onClose={closeOverlay}
        />
      )}
      {overlay === 'settings' && (
        <SettingsSheet state={state} allApps={allApps} appSource={loaded ? loaded.source : ''} closing={overlayClosing}
          onClose={closeOverlay}
          onPreviewSaver={() => {
            closeOverlay();
            setTimeout(() => setSaver(true), CLOSE_MS + 50);
          }}
        />
      )}
      {menu && <ContextMenu app={menu.app} anchor={menu.anchor} items={menuItems(menu.app)} closing={menuClosing} />}
      {saver && !welcome && (
        <ScreenSaver
          source={prefs.saverSource}
          hour12={prefs.hour12}
          onExit={() => {
            lastInput.current = Date.now();
            setSaver(false);
          }}
        />
      )}
      {welcome && (
        <Welcome
          hour12={prefs.hour12}
          onDone={() => {
            lastInput.current = Date.now();
            setSaver(false); // the welcome may have been up longer than the screen saver delay
            setWelcome(false);
          }}
        />
      )}
      <Toasts />
    </div>
  );
}

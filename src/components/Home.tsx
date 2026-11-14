// Home screen pieces: wallpaper, status bar (clock/weather), Top Shelf and app tiles.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { AppEntry } from '../data/catalog';
import { resolveWallpaper } from '../data/wallpapers';
import { getWeather, weatherGlyph, weatherText, type Weather } from '../lib/weather';
import type { Prefs } from '../store/store';
import { useBackdrop } from '../lib/backdrop';
import { Glyph } from './Glyph';

// ---------------------------------------------------------------- wallpaper

export function Wallpaper({ prefs }: { prefs: Prefs }) {
  const photo = useBackdrop();
  if (prefs.wallpaper === 'photo' && photo) return <PhotoWallpaper url={photo.url} />;
  return <GradientWallpaper prefs={prefs} />;
}

/** The same 4K photo as the welcome screen / screen saver, crossfading when it changes. */
function PhotoWallpaper({ url }: { url: string }) {
  const [layers, setLayers] = useState<string[]>([url]);
  useEffect(() => {
    setLayers((prev) => (prev[prev.length - 1] === url ? prev : prev.slice(-1).concat([url])));
    const t = setTimeout(() => setLayers([url]), 1600); // keep only one 4K image in memory
    return () => clearTimeout(t);
  }, [url]);
  return (
    <div class="wallpaper wallpaper-photo">
      {layers.map((u) => (
        <div key={u} class="wp-photo" style={{ backgroundImage: `url("${u}")` }} />
      ))}
      <div class="wp-photo-shade" />
    </div>
  );
}

function GradientWallpaper({ prefs }: { prefs: Prefs }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
  const wp = resolveWallpaper(prefs.wallpaper, now);
  return (
    <div class="wallpaper" style={{ background: wp.base }}>
      <div key={wp.id + 'a'} class="wp-layer wp-a" style={{ backgroundImage: wp.a }} />
      <div key={wp.id + 'b'} class="wp-layer wp-b" style={{ backgroundImage: wp.b }} />
      <div class="wp-vignette" />
    </div>
  );
}

// ---------------------------------------------------------------- clock + weather

export function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    let last = now.getMinutes();
    const t = setInterval(() => {
      const d = new Date();
      if (d.getMinutes() !== last) {
        last = d.getMinutes();
        setNow(d);
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatTime(d: Date, hour12: boolean) {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  if (hour12) {
    h = h % 12 || 12;
    return `${h}:${m}`;
  }
  return `${String(h).padStart(2, '0')}:${m}`;
}

export function formatDate(d: Date) {
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function useWeather(city: string, enabled: boolean) {
  const [w, setW] = useState<Weather | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!enabled || !city.trim()) {
      setW(null);
      return;
    }
    let alive = true;
    const run = () =>
      getWeather(city)
        .then((r) => alive && (setW(r), setErr('')))
        .catch((e) => alive && setErr(e.message || 'Weather unavailable'));
    run();
    const t = setInterval(run, 15 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [city, enabled]);
  return { weather: w, error: err };
}

interface StatusProps {
  prefs: Prefs;
  showClock: boolean;
  editing: boolean;
  sleepLeft: number | null;
  onControlCenter: () => void;
  onSettings: () => void;
  onDone: () => void;
}

export function StatusBar({ prefs, showClock, editing, sleepLeft, onControlCenter, onSettings, onDone }: StatusProps) {
  const now = useClock();
  const { weather } = useWeather(prefs.city, prefs.showWeather);
  return (
    <div class="status">
      <div class="status-actions" data-nav-group="top">
        {sleepLeft !== null && (
          <div class="pill pill-info">
            <Glyph name="sleep" size={24} /> {sleepLeft} min
          </div>
        )}
        {editing ? (
          <button class="pill pill-done" data-nav onClick={onDone}>
            Done
          </button>
        ) : null}
        <div class={'status-clock' + (showClock ? '' : ' hidden')}>
          <div class="status-time">{formatTime(now, prefs.hour12)}</div>
          <div class="status-sub">
            {formatDate(now)}
            {weather && (
              <span class="status-weather">
                <Glyph name={weatherGlyph(weather.code, weather.isDay)} size={22} stroke={2} />
                {weather.temp}°
              </span>
            )}
          </div>
        </div>
        <div class="status-capsule glass-ui">
        <button class="round-btn" data-nav onClick={onControlCenter} aria-label="Control Center">
          <Glyph name="sliders" size={30} />
        </button>
        <button class="round-btn" data-nav onClick={onSettings} aria-label="Settings">
          <Glyph name="gear" size={30} />
        </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- resting clock

/**
 * The resting state of the home screen: a big, calm clock where the app details go.
 * It is focusable (invisible focus) so the remote has a "home position": ↓ goes into the apps.
 */
export function HomeClock({ prefs, onFocus }: { prefs: Prefs; onFocus: () => void }) {
  const now = useClock();
  const { weather } = useWeather(prefs.city, prefs.showWeather);
  return (
    <div class="home-clock" data-nav data-autofocus tabIndex={-1} onFocus={onFocus}>
      <div class="home-time">{formatTime(now, prefs.hour12)}</div>
      <div class="home-date">
        {formatDate(now)}
        {weather && (
          <span class="home-weather">
            <Glyph name={weatherGlyph(weather.code, weather.isDay)} size={34} stroke={1.9} />
            {weather.temp}° <span class="dim-soft">{weatherText(weather.code)}</span>
          </span>
        )}
      </div>
      <div class="home-hint">
        <Glyph name="chevron" size={22} stroke={2.4} className="hint-down" /> Apps
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- tile art

/** The face of an app: its real TV icon, else its official vector logo, else a clean glyph/wordmark. */
export function AppArt({ app, big }: { app: AppEntry; big?: boolean }) {
  const [failed, setFailed] = useState(false);
  const a = app.art;
  if (app.iconUrl && !failed) {
    return (
      <div class={'art art-real' + (big ? ' art-big' : '')} style={{ background: app.iconBg || a.bg }}>
        <img class="art-icon" src={app.iconUrl} alt="" onError={() => setFailed(true)} />
      </div>
    );
  }
  return (
    <div class={'art' + (big ? ' art-big' : '')} style={{ background: a.bg, color: a.fg }}>
      {a.image ? (
        <img class="art-img" src={a.image} alt="" style={{ height: `${Math.round(((a.imageSize || 120) / 154) * 100)}%` }} />
      ) : a.logo ? (
        <svg class="art-logo" viewBox="0 0 24 24" style={{ transform: `scale(${a.logo.scale || 1})` }}>
          <path d={a.logo.path} fill={a.logo.color} />
        </svg>
      ) : (
        <div class={'art-content' + (a.glyph && a.word ? ' art-stack' : '')}>
          {a.glyph && <Glyph name={a.glyph} size={a.word ? 54 : 72} stroke={1.6} />}
          {a.word && <span class={'word ' + (a.wordClass || '')}>{a.word}</span>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- top shelf

function hexA(hex: string, a: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Top Shelf: one calm, full-width scene for the focused app.
 * Left: big title + tagline. Right: the app's icon as a lit card. Behind: a soft light in the
 * app's brand colour (or the app's own artwork, when the TV provides it). Crossfades between apps.
 */
/**
 * Top Shelf: a frosted-glass card over the wallpaper photo, faintly tinted with the focused app's
 * colour — the app's icon, its name and one line about it. The photo stays the star.
 */
export function TopShelf({ app }: { app: AppEntry | null }) {
  if (!app) return <div class="shelf" />;
  const [c1] = app.art.shelf;
  return (
    <div class="shelf">
      <div class="shelf-glass glass-ui">
        <div class="shelf-tint" key={'g' + app.id} style={{ background: `radial-gradient(70% 120% at 0% 100%, ${hexA(c1, 0.32)} 0%, rgba(0,0,0,0) 70%)` }} />
        <div class="shelf-icon" key={'i' + app.id}>
          <AppArt app={app} />
        </div>
        <div class="shelf-text" key={'t' + app.id}>
          <div class="shelf-title">{app.title}</div>
          {app.tagline && <div class="shelf-tagline">{app.tagline}</div>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- app tile

interface TileProps {
  app: AppEntry;
  index: number;
  editing: boolean;
  picked: boolean;
  launching: boolean;
  onFocus: (index: number) => void;
  onActivate: (app: AppEntry) => void;
}

export function AppTile({ app, index, editing, picked, launching, onFocus, onActivate }: TileProps) {
  const ref = useRef<HTMLButtonElement>(null);

  // Magic Remote parallax: tilt the focused tile toward the pointer.
  const onMove = (e: MouseEvent) => {
    const el = ref.current;
    if (!el || document.activeElement !== el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`);
    el.style.setProperty('--sx', `${(x * 60).toFixed(1)}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--sx', '0%');
  };

  return (
    <button
      ref={ref}
      class={'tile' + (picked ? ' picked' : '') + (launching ? ' launching' : '')}
      style={{ animationDelay: `${-(index % 5) * 0.07}s` }}
      data-nav
      data-longpress
      data-app-id={app.id}
      onFocus={() => onFocus(index)}
      onBlur={onLeave}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={() => onActivate(app)}
    >
      <div class="tile-shadow" />
      <div class="tile-body" data-name={app.title}>
        <AppArt app={app} />
        <div class="tile-sheen" />
        {editing && !picked && (
          <div class="tile-badge">
            <Glyph name="minus" size={22} stroke={3} />
          </div>
        )}
      </div>
      <div class="tile-label">{app.title}</div>
    </button>
  );
}

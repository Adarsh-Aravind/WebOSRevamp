// Full-screen screen saver (and the minimal welcome screen) — Apple TV style:
// slow Ken Burns drift over big photos, soft crossfades, a quiet clock in the corner.
import { useEffect, useRef, useState } from 'preact/hooks';
import { WALLPAPERS } from '../data/wallpapers';
import { setBackdrop } from '../lib/backdrop';
import { localMedia, markShown, naturePhotos, preload, type Slide } from '../lib/photos';
import type { SaverSource } from '../store/store';
import { formatDate, formatTime, useClock } from './Home';

const SLIDE_MS = 24000;

/**
 * Calls onExit on remote input and swallows that key so it doesn't act on the home screen.
 * buttonsOnly: only a real button press counts (any remote key, the wheel click, or an OK-click
 * with the pointer) — moving the Magic Remote or rolling the wheel is ignored.
 */
function useExitOnInput(onExit: () => void, armAfterMs = 600, buttonsOnly = false) {
  useEffect(() => {
    const armedAt = Date.now() + armAfterMs;
    let moved = 0;
    const key = (e: Event) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      if (e.type === 'keydown' && Date.now() > armedAt) onExit();
    };
    const pointer = (e: Event) => {
      if (Date.now() < armedAt) return;
      if (buttonsOnly && e.type !== 'mousedown') return;
      if (e.type === 'mousemove') {
        moved += Math.abs((e as MouseEvent).movementX || 0) + Math.abs((e as MouseEvent).movementY || 0);
        if (moved < 40) return; // ignore tiny jitters from the Magic Remote
      }
      onExit();
    };
    window.addEventListener('keydown', key, true);
    window.addEventListener('keyup', key, true);
    window.addEventListener('mousemove', pointer, true);
    window.addEventListener('mousedown', pointer, true);
    window.addEventListener('wheel', pointer, true);
    return () => {
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('keyup', key, true);
      window.removeEventListener('mousemove', pointer, true);
      window.removeEventListener('mousedown', pointer, true);
      window.removeEventListener('wheel', pointer, true);
    };
  }, []);
}

// Each slide drifts in a different direction.
const DRIFTS = ['kb-a', 'kb-b', 'kb-c', 'kb-d'];

function gradientFallback(): Slide[] {
  return WALLPAPERS.map((w) => ({ url: '', kind: 'photo' as const, credit: '', gradient: `${w.a},${w.b}`, base: w.base } as any));
}

async function loadSlides(source: SaverSource): Promise<Slide[]> {
  if (source === 'myvideos') {
    const v = localMedia('video');
    if (v.length) return v;
  }
  if (source === 'myphotos') {
    const p = localMedia('photo');
    if (p.length) return p;
  }
  try {
    const n = await naturePhotos(16);
    if (n.length) return n;
  } catch (_) { /* offline: fall through */ }
  return gradientFallback();
}

interface Shown {
  slide: Slide & { gradient?: string; base?: string };
  key: number;
}

export function ScreenSaver({ source, hour12, onExit }: { source: SaverSource; hour12: boolean; onExit: () => void }) {
  const now = useClock();
  const [shown, setShown] = useState<Shown[]>([]);
  const [leaving, setLeaving] = useState(false);
  const slides = useRef<Slide[]>([]);
  const idx = useRef(0);
  const counter = useRef(0);
  const alive = useRef(true);

  const left = useRef(false);
  const exit = () => {
    if (left.current) return;
    left.current = true;
    setLeaving(true);
    setTimeout(onExit, 450);
  };
  useExitOnInput(exit);

  const show = (s: Slide) => {
    counter.current++;
    const k = counter.current;
    setShown((prev) => prev.slice(-1).concat([{ slide: s, key: k }]));
    markShown(s);
    setBackdrop(s); // home wallpaper follows the screen saver (photos only)
    // Once the crossfade is done, drop the old 4K image so the TV only holds one in memory.
    setTimeout(() => alive.current && setShown((cur) => cur.filter((x) => x.key >= k)), 2600);
  };

  const next = async () => {
    if (!alive.current || !slides.current.length) return;
    const s = slides.current[idx.current % slides.current.length];
    idx.current++;
    if (s.kind === 'photo' && s.url) {
      try {
        await preload(s.url);
      } catch (_) {
        // skip broken photo
        if (alive.current) setTimeout(next, 200);
        return;
      }
    }
    if (alive.current) show(s);
  };

  useEffect(() => {
    alive.current = true;
    loadSlides(source).then((list) => {
      slides.current = list;
      next();
    });
    return () => {
      alive.current = false;
    };
  }, []);

  // Photos advance on a timer; videos advance when they end.
  const current = shown.length ? shown[shown.length - 1] : null;
  useEffect(() => {
    if (!current || current.slide.kind === 'video') return;
    const t = setTimeout(next, SLIDE_MS);
    return () => clearTimeout(t);
  }, [current && current.key]);

  return (
    <div class={'saver' + (leaving ? ' leaving' : '')}>
      {shown.map(({ slide, key }) =>
        slide.kind === 'video' ? (
          <video
            key={key}
            class="saver-video"
            src={slide.url}
            autoPlay
            muted
            playsInline
            loop={slides.current.length === 1}
            onEnded={next}
            onError={next}
          />
        ) : (
          <div key={key} class="saver-slide">
            <div
              class={'saver-img ' + DRIFTS[key % DRIFTS.length]}
              style={
                slide.url
                  ? { backgroundImage: `url("${slide.url}")` }
                  : { backgroundImage: slide.gradient, backgroundColor: slide.base }
              }
            />
          </div>
        )
      )}
      <div class="saver-shade" />
      <div class="saver-clock">
        <div class="saver-time">{formatTime(now, hour12)}</div>
        <div class="saver-date">{formatDate(now)}</div>
      </div>
      {current && current.slide.credit && (
        <div class="saver-credit" key={'c' + current.key}>
          {current.slide.credit}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- welcome screen

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Minimal welcome: a random 4K photo (never one of the last 40 shown), a greeting and the time.
 * The greeting appears instantly over a soft gradient; the photo fades in as soon as it has loaded.
 * Stays until a remote button is pressed.
 */
export function Welcome({ hour12, onDone }: { hour12: boolean; onDone: () => void }) {
  const now = useClock();
  const [backdrop] = useState(() => {
    const g = gradientFallback();
    return g[Math.floor(Math.random() * g.length)] as Slide & { gradient: string; base: string };
  });
  const [photo, setPhoto] = useState<Slide | null>(null);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setPhase('out');
    setTimeout(onDone, 900);
  };
  useExitOnInput(finish, 400, true);

  useEffect(() => {
    let alive = true;
    const attempt = (triesLeft: number): Promise<void> =>
      naturePhotos(1)
        .then((list) => {
          if (!list.length) throw new Error('none');
          return preload(list[0].url, 25000).then(() => list[0]); // 4K files are big: allow time
        })
        .then((s) => {
          if (!alive) return;
          markShown(s);
          setPhoto(s);
          setBackdrop(s); // the home screen wallpaper follows the welcome photo
        })
        .catch(() => {
          if (alive && triesLeft > 0) return attempt(triesLeft - 1);
        });
    attempt(2);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div class={'welcome' + (phase === 'out' ? ' leaving' : '')} data-layer>
      <div class="saver-slide">
        <div class="saver-img" style={{ backgroundImage: backdrop.gradient, backgroundColor: backdrop.base }} />
      </div>
      {photo && (
        <div class="saver-slide welcome-photo">
          <div class="saver-img kb-welcome" style={{ backgroundImage: `url("${photo.url}")` }} />
        </div>
      )}
      <div class="welcome-shade" />
      <div class="welcome-text">
        <div class="welcome-greeting">{greeting(now)}</div>
        <div class="welcome-time">{formatTime(now, hour12)}</div>
        <div class="welcome-date">{formatDate(now)}</div>
      </div>
      <div class="welcome-hint">Press any button</div>
      {photo && photo.credit && <div class="saver-credit">{photo.credit}</div>}
    </div>
  );
}

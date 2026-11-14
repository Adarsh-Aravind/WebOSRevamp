// The one photo the whole of Glass shares: the welcome screen picks it, the home screen uses it as
// wallpaper, and every photo the screen saver shows becomes the new wallpaper too.
import { useEffect, useReducer } from 'preact/hooks';
import { markShown, naturePhotos, preload, type Slide } from './photos';

const KEY = 'glass.backdrop';

function load(): Slide | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    return s && s.url ? s : null;
  } catch (_) {
    return null;
  }
}

let current: Slide | null = load(); // last photo, so the home screen isn't blank while a new one loads
const subs = new Set<() => void>();

export const getBackdrop = () => current;

export function setBackdrop(s: Slide) {
  if (s.kind !== 'photo' || !s.url || (current && current.url === s.url)) return;
  current = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (_) { /* ignore */ }
  subs.forEach((f) => f());
}

/** Fetch a fresh random 4K photo and make it the backdrop (used when the welcome screen is off). */
export async function newBackdrop(): Promise<void> {
  const list = await naturePhotos(1);
  if (!list.length) return;
  await preload(list[0].url, 30000);
  markShown(list[0]);
  setBackdrop(list[0]);
}

export function useBackdrop(): Slide | null {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const f = () => force(undefined as any);
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  }, []);
  return current;
}

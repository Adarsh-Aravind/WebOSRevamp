// Saved settings + home screen layout. Stored in the app's own localStorage on the TV.
import { useEffect, useReducer } from 'preact/hooks';

export type WallpaperId = 'photo' | 'shuffle' | 'dynamic' | 'aurora' | 'bloom' | 'ocean' | 'sunset' | 'graphite';

export interface Prefs {
  wallpaper: WallpaperId;
  hour12: boolean;
  showWeather: boolean;
  city: string;
  reduceMotion: boolean;
  reduceTransparency: boolean; // solid panels instead of frosted glass (lighter for the TV's GPU)
  background: BackgroundId;
  layout: LayoutId;
  labels: LabelsId;
  font: FontId;
  material: MaterialId;
  adaptiveInk: boolean; // pick light/dark text from the photo behind it
  welcome: boolean; // minimal welcome screen each time Glass starts
  saverMins: number; // screen saver after N idle minutes (0 = off)
  saverSource: SaverSource;
}

export type SaverSource = 'nature' | 'myphotos' | 'myvideos';

// "Look" options, modelled on CleanFrame's Settings (background / layout / apps / font / material).
export type BackgroundId = 'photo' | 'dark' | 'light';
export type LayoutId = 'dock' | 'list';
export type LabelsId = 'icons' | 'both' | 'text';
export type FontId = 'inter' | 'geist' | 'newsreader';
export type MaterialId = 'soft' | 'frost' | 'tint';

export interface CustomApp {
  id: string;
  title: string;
}

export interface Layout {
  order: string[]; // app ids in the user's order (unknown apps go to the end)
  hidden: string[];
  custom: CustomApp[]; // apps added by id in Settings
}

export interface State {
  prefs: Prefs;
  layout: Layout;
}

const KEY = 'glass.v1';

const DEFAULTS: State = {
  prefs: { wallpaper: 'photo', hour12: true, showWeather: true, city: '', reduceMotion: false, reduceTransparency: false, background: 'photo', layout: 'dock', labels: 'icons', font: 'inter', material: 'soft', adaptiveInk: true, welcome: true, saverMins: 5, saverSource: 'nature' },
  layout: { order: [], hidden: [], custom: [] },
};

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const s = JSON.parse(raw);
    return {
      prefs: { ...DEFAULTS.prefs, ...(s.prefs || {}) },
      layout: { ...DEFAULTS.layout, ...(s.layout || {}) },
    };
  } catch (_) {
    return DEFAULTS;
  }
}

let state: State = load();
const subs = new Set<() => void>();

function commit(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (_) {
    /* storage full or blocked: keep working in memory */
  }
  subs.forEach((f) => f());
}

export const getState = () => state;
export const setPrefs = (p: Partial<Prefs>) => commit({ ...state, prefs: { ...state.prefs, ...p } });
export const setLayout = (l: Partial<Layout>) => commit({ ...state, layout: { ...state.layout, ...l } });
export const resetLayout = () => commit({ ...state, layout: DEFAULTS.layout });

export function useStore(): State {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const f = () => force(undefined as any);
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  }, []);
  return state;
}

// ---------------------------------------------------------------- toasts

type ToastListener = (msg: string) => void;
const toastSubs = new Set<ToastListener>();
export const showToast = (msg: string) => toastSubs.forEach((f) => f(msg));
export const onToast = (f: ToastListener) => {
  toastSubs.add(f);
  return () => {
    toastSubs.delete(f);
  };
};

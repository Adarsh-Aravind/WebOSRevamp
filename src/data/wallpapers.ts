// Live wallpapers: soft "mesh gradient" blobs that drift slowly. No image files needed,
// and the TV only has to move two pre-painted layers (cheap for the GPU).
import type { WallpaperId } from '../store/store';

export interface WallpaperDef {
  id: WallpaperId;
  name: string;
  base: string;
  a: string; // CSS backgrounds for the two drifting layers
  b: string;
  swatch: string;
}

const blob = (x: number, y: number, color: string, size = 38) =>
  `radial-gradient(circle at ${x}% ${y}%, ${color} 0%, rgba(0,0,0,0) ${size}%)`;

export const WALLPAPERS: WallpaperDef[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    base: '#05070d',
    a: [blob(22, 30, 'rgba(48,209,160,0.55)', 36), blob(70, 18, 'rgba(94,92,230,0.55)', 34)].join(','),
    b: [blob(80, 75, 'rgba(10,132,255,0.45)', 40), blob(30, 82, 'rgba(191,90,242,0.35)', 34)].join(','),
    swatch: 'linear-gradient(135deg,#30d1a0,#5e5ce6 55%,#0a84ff)',
  },
  {
    id: 'bloom',
    name: 'Bloom',
    base: '#0d0610',
    a: [blob(25, 25, 'rgba(255,55,95,0.55)', 36), blob(75, 30, 'rgba(191,90,242,0.55)', 36)].join(','),
    b: [blob(65, 80, 'rgba(255,159,10,0.40)', 34), blob(20, 78, 'rgba(94,92,230,0.45)', 36)].join(','),
    swatch: 'linear-gradient(135deg,#ff375f,#bf5af2 55%,#ff9f0a)',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    base: '#020812',
    a: [blob(20, 30, 'rgba(10,132,255,0.55)', 38), blob(78, 22, 'rgba(100,210,255,0.45)', 32)].join(','),
    b: [blob(70, 80, 'rgba(48,209,160,0.35)', 36), blob(25, 85, 'rgba(10,60,160,0.6)', 40)].join(','),
    swatch: 'linear-gradient(135deg,#0a84ff,#64d2ff 55%,#30d1a0)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    base: '#0f0607',
    a: [blob(25, 28, 'rgba(255,159,10,0.55)', 36), blob(75, 22, 'rgba(255,69,58,0.55)', 34)].join(','),
    b: [blob(68, 82, 'rgba(255,55,95,0.45)', 36), blob(22, 80, 'rgba(120,40,160,0.45)', 38)].join(','),
    swatch: 'linear-gradient(135deg,#ff9f0a,#ff453a 55%,#ff375f)',
  },
  {
    id: 'graphite',
    name: 'Graphite',
    base: '#050506',
    a: [blob(25, 25, 'rgba(142,142,147,0.30)', 38), blob(78, 30, 'rgba(99,99,102,0.35)', 34)].join(','),
    b: [blob(70, 80, 'rgba(72,72,74,0.40)', 36), blob(22, 78, 'rgba(10,132,255,0.16)', 36)].join(','),
    swatch: 'linear-gradient(135deg,#8e8e93,#48484a 55%,#1c1c1e)',
  },
];

// "Shuffle" picks a new wallpaper every time Glass starts (never the same one twice in a row).
const LAST_KEY = 'glass.lastWallpaper';
let shuffled: WallpaperDef | null = null;

export function reshuffleWallpaper(): WallpaperDef {
  let last = '';
  try {
    last = localStorage.getItem(LAST_KEY) || '';
  } catch (_) { /* ignore */ }
  const pool = WALLPAPERS.filter((w) => w.id !== last);
  shuffled = pool[Math.floor(Math.random() * pool.length)];
  try {
    localStorage.setItem(LAST_KEY, shuffled.id);
  } catch (_) { /* ignore */ }
  return shuffled;
}

/** "Dynamic" follows the time of day; "Shuffle" is random per start. */
export function resolveWallpaper(id: WallpaperId, now = new Date()): WallpaperDef {
  if (id === 'shuffle') return shuffled || reshuffleWallpaper();
  if (id !== 'dynamic') return WALLPAPERS.filter((w) => w.id === id)[0] || WALLPAPERS[0];
  const h = now.getHours();
  const pick: WallpaperId = h >= 6 && h < 11 ? 'bloom' : h >= 11 && h < 17 ? 'ocean' : h >= 17 && h < 20 ? 'sunset' : 'aurora';
  return WALLPAPERS.filter((w) => w.id === pick)[0];
}

// Known webOS apps with hand-made, tvOS-style tile art.
// Used when the TV doesn't let us list installed apps, and to dress up apps it does list.

import type { GlyphName } from '../components/Glyph';
import { siAppletv, siNetflix, siSpotify, siYoutube } from 'simple-icons';
import jiohotstarIcon from '../assets/logos/jiohotstar.png';
import primeVideoIcon from '../assets/logos/prime-video.svg';

/** An official brand logo (vector, from Simple Icons — CC0) drawn on the tile. */
export interface Logo {
  path: string; // 24×24 SVG path
  color: string;
  scale?: number; // relative size on the tile (1 = default)
}

export interface Art {
  bg: string; // CSS background for the tile
  fg?: string; // text / glyph color
  glyph?: GlyphName;
  logo?: Logo;
  image?: string; // an icon image bundled with Glass (for brands not in Simple Icons)
  imageSize?: number; // its height on a tile, in px
  word?: string; // wordmark text
  wordClass?: string; // extra class for the wordmark style
  shelf: [string, string, string]; // three colors used for the Top Shelf artwork
}

export interface AppEntry {
  id: string; // unique key (launch point id)
  launchId: string; // app id passed to applicationManager/launch
  params?: object;
  title: string;
  tagline: string;
  art: Art;
  iconUrl?: string; // the app's real icon, read from the TV
  iconBg?: string; // the background colour LG uses behind that icon
  bgImage?: string; // full-screen artwork some apps provide (used by the Top Shelf)
  altIds?: string[]; // other app ids to try if launchId isn't installed
  titleMatch?: RegExp; // recognise the TV's own entry by its name when the id isn't known
  source: 'catalog' | 'tv' | 'custom' | 'mock';
}

type CatalogItem = Omit<AppEntry, 'source' | 'launchId'> & { launchId?: string };

export const CATALOG: CatalogItem[] = [
  {
    id: 'netflix',
    title: 'Netflix',
    tagline: 'Series, films and more',
    art: { bg: '#000', fg: '#E50914', logo: { path: siNetflix.path, color: '#E50914', scale: 1.05 }, shelf: ['#E50914', '#7a0b10', '#120203'] },
  },
  {
    id: 'youtube.leanback.v4',
    title: 'YouTube',
    tagline: 'Videos, music and live streams',
    art: { bg: '#fff', fg: '#0f0f0f', logo: { path: siYoutube.path, color: '#FF0000', scale: 1.15 }, shelf: ['#FF0033', '#6d0016', '#140005'] },
  },
  {
    id: 'amazon',
    title: 'Prime Video',
    tagline: 'Movies, shows and live sport',
    art: { bg: '#0779ff', fg: '#fff', image: primeVideoIcon, imageSize: 154, shelf: ['#1A98FF', '#0f2a4a', '#040a14'] },
  },
  {
    // India: Disney+ Hotstar became JioHotstar. Its exact webOS app id isn't published, so on the TV
    // Glass also recognises it by name (titleMatch); here we try the likely ids in order.
    id: 'jiohotstar',
    launchId: 'hotstar',
    altIds: ['com.jiohotstar.app', 'in.startv.hotstar', 'com.disney.disneyplus-prod'],
    titleMatch: /hotstar/i,
    title: 'JioHotstar',
    tagline: 'Movies, shows and live cricket',
    art: { bg: 'radial-gradient(130% 120% at 50% 0%,#232a6b 0%,#0d0f2e 55%,#05050f 100%)', fg: '#fff', image: jiohotstarIcon, imageSize: 118, shelf: ['#6d5cff', '#2b2a8f', '#05061a'] },
  },
  {
    id: 'com.apple.appletv',
    title: 'Apple TV',
    tagline: 'Originals, movies and more',
    art: { bg: 'linear-gradient(160deg,#1c1c1e,#000)', fg: '#fff', logo: { path: siAppletv.path, color: '#ffffff', scale: 1.25 }, shelf: ['#a1a1aa', '#2c2c2e', '#000000'] },
  },
  {
    id: 'spotify-beehive',
    title: 'Spotify',
    tagline: 'Music and podcasts',
    art: { bg: '#121212', fg: '#1ED760', logo: { path: siSpotify.path, color: '#1ED760' }, shelf: ['#1ED760', '#0b5a28', '#030d07'] },
  },
  {
    id: 'com.webos.app.livetv',
    title: 'Live TV',
    tagline: 'Channels and programme guide',
    art: { bg: 'linear-gradient(140deg,#ff375f,#bf5af2)', fg: '#fff', glyph: 'tv', shelf: ['#ff375f', '#7a2a9c', '#14051c'] },
  },
  {
    id: 'com.webos.app.lgchannels',
    title: 'LG Channels',
    tagline: 'Free streaming channels built into your TV',
    art: { bg: 'linear-gradient(150deg,#ff6482,#a50034)', fg: '#fff', glyph: 'tv', shelf: ['#ff6482', '#7a0025', '#14000a'] },
  },
  {
    id: 'com.webos.app.miracast',
    title: 'Screen Share',
    tagline: 'Mirror your phone or laptop',
    art: { bg: 'linear-gradient(150deg,#5e5ce6,#2a2a8c)', fg: '#fff', glyph: 'globe', shelf: ['#5e5ce6', '#2a2a8c', '#07071c'] },
  },
  {
    id: 'com.webos.app.browser',
    title: 'Web Browser',
    tagline: 'Browse the web on the big screen',
    art: { bg: 'linear-gradient(150deg,#64d2ff,#0a84ff)', fg: '#fff', glyph: 'globe', shelf: ['#64d2ff', '#0a5bd6', '#020b1c'] },
  },
  {
    id: 'com.webos.app.discovery',
    title: 'Apps',
    tagline: 'Find new apps in the LG Content Store',
    art: { bg: 'linear-gradient(150deg,#ffb340,#ff375f)', fg: '#fff', glyph: 'bag', shelf: ['#ff9f0a', '#a3243d', '#1a0507'] },
  },
  {
    id: 'com.palm.app.settings',
    title: 'Settings',
    tagline: 'Picture, sound, network and more',
    art: { bg: 'linear-gradient(160deg,#aeaeb2,#636366)', fg: '#fff', glyph: 'gear', shelf: ['#aeaeb2', '#3a3a3c', '#050505'] },
  },
];

// Extra fake apps for the PC preview only (they never appear on the TV).
export const MOCK_EXTRAS: CatalogItem[] = [
  { id: 'mock.music', title: 'Music', tagline: 'Your library', art: { bg: 'linear-gradient(150deg,#ff6482,#ff2d55)', fg: '#fff', glyph: 'music', shelf: ['#ff2d55', '#7a1229', '#14040a'] } },
  { id: 'mock.photos', title: 'Photos', tagline: 'Memories on the big screen', art: { bg: 'linear-gradient(150deg,#fff,#e5e5ea)', fg: '#ff9f0a', glyph: 'photo', shelf: ['#ff9f0a', '#a35a00', '#140b00'] } },
];

const PALETTES: Array<[string, string, string]> = [
  ['#0a84ff', '#123a6e', '#03070f'],
  ['#ff9f0a', '#7a4500', '#140b00'],
  ['#30d158', '#0a5a22', '#021005'],
  ['#bf5af2', '#4a2a8c', '#0a0518'],
  ['#ff375f', '#7a1229', '#14040a'],
  ['#64d2ff', '#0a5b7a', '#020c12'],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Find our entry for an app the TV reported — by id, by a known alternative id, or by its name. */
export function findCatalog(id: string, title = ''): CatalogItem | undefined {
  for (const c of CATALOG) {
    if (c.id === id || c.launchId === id || (c.altIds && c.altIds.indexOf(id) >= 0)) return c;
  }
  for (const c of CATALOG) if (c.titleMatch && c.titleMatch.test(title)) return c;
  return undefined;
}

/** Art for an app we know nothing about: a colored tile with its own icon (or initial). */
export function genericArt(id: string, title: string, color?: string): Art {
  const pal = PALETTES[hash(id) % PALETTES.length];
  const base = color && /^#([0-9a-f]{6})$/i.test(color) ? color : pal[0];
  return {
    bg: `linear-gradient(150deg, ${base}, ${shade(base, -0.45)})`,
    fg: '#fff',
    word: (title.replace(/[^A-Za-z0-9]/g, '').charAt(0) || '•').toUpperCase(), // monogram icon, not a written name
    wordClass: 'w-mono',
    shelf: [base, shade(base, -0.55), shade(base, -0.9)],
  };
}

export function fromCatalog(c: CatalogItem, source: AppEntry['source']): AppEntry {
  return { ...c, launchId: c.launchId || c.id, source };
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

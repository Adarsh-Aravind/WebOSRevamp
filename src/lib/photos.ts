// Photos for the screen saver and welcome screen.
//  - "nature": Wikimedia Commons *Featured pictures* — hand-picked, full-resolution, freely licensed
//    photos (landscapes, mountains, lakes, waterfalls, forests, coasts, sunsets). No account needed.
//  - "myphotos" / "myvideos": files you drop into media/photos and media/videos before deploying.
//
// Quality: only originals at least 3840px wide are used, fetched as true 4K (3840px) images.
// Note: LG documents that apps draw graphics at 1920×1080 on 4K TVs (video plays at 3840×2160),
// so the TV may scale these down — a 4K source still gives the cleanest picture it can show.

export interface Slide {
  url: string;
  id?: string;
  credit: string;
  kind: 'photo' | 'video';
}

const API = 'https://commons.wikimedia.org/w/api.php';
const CATEGORIES = [
  'Featured_pictures_of_landscapes',
  'Featured_pictures_of_mountains',
  'Featured_pictures_of_lakes',
  'Featured_pictures_of_waterfalls',
  'Featured_pictures_of_forests',
  'Featured_pictures_of_coasts',
  'Featured_pictures_of_sunsets',
];
const TITLES_KEY = 'glass.photoTitles';
const TITLES_MAX_AGE = 7 * 24 * 3600 * 1000;
export const PHOTO_WIDTH = 3840; // 4K UHD width
const RECENT_KEY = 'glass.recentPhotos';
const RECENT_MAX = 40; // never repeat any of the last 40 photos

async function getJSON(params: Record<string, string>): Promise<any> {
  const q = Object.keys(params)
    .map((k) => `${k}=${encodeURIComponent(params[k])}`)
    .join('&');
  const r = await fetch(`${API}?${q}&format=json&origin=*`);
  if (!r.ok) throw new Error(`Wikimedia ${r.status}`);
  return r.json();
}

async function allTitles(): Promise<string[]> {
  try {
    const c = JSON.parse(localStorage.getItem(TITLES_KEY) || 'null');
    if (c && Date.now() - c.at < TITLES_MAX_AGE && c.titles.length) return c.titles;
  } catch (_) { /* ignore */ }
  const lists = await Promise.all(
    CATEGORIES.map((cat) =>
      getJSON({ action: 'query', list: 'categorymembers', cmtitle: `Category:${cat}`, cmtype: 'file', cmlimit: '500' })
        .then((j) => (j.query ? j.query.categorymembers : []).map((m: any) => m.title as string))
        .catch(() => [] as string[])
    )
  );
  const seen: Record<string, boolean> = {};
  const titles: string[] = [];
  lists.forEach((l) =>
    l.forEach((t: string) => {
      if (!seen[t] && /\.jpe?g$/i.test(t)) {
        seen[t] = true;
        titles.push(t);
      }
    })
  );
  if (!titles.length) throw new Error('No photos available (offline?)');
  try {
    localStorage.setItem(TITLES_KEY, JSON.stringify({ at: Date.now(), titles }));
  } catch (_) { /* ignore */ }
  return titles;
}

function shuffle<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = b[i];
    b[i] = b[j];
    b[j] = t;
  }
  return b;
}

const stripTags = (s: string) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/** n random, landscape-shaped, high-resolution nature photos. */
export async function naturePhotos(n: number): Promise<Slide[]> {
  const recent = getRecent();
  const fresh = (await allTitles()).filter((t) => recent.indexOf(t) < 0);
  const titles = shuffle(fresh).slice(0, Math.min(50, Math.max(12, n * 4)));
  const j = await getJSON({
    action: 'query',
    titles: titles.join('|'),
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiextmetadatafilter: 'Artist|LicenseShortName',
    iiurlwidth: String(PHOTO_WIDTH),
  });
  const pages: any[] = j.query && j.query.pages ? Object.keys(j.query.pages).map((k) => j.query.pages[k]) : [];
  const out: Slide[] = [];
  for (const p of shuffle(pages)) {
    const i = p.imageinfo && p.imageinfo[0];
    if (!i || !i.thumburl) continue;
    const ratio = i.width / i.height;
    if (ratio < 1.3 || ratio > 2.1 || i.width < 3840) continue; // only true-4K-or-bigger, landscape-shaped originals
    const meta = i.extmetadata || {};
    const artist = meta.Artist ? stripTags(meta.Artist.value).slice(0, 60) : 'Unknown';
    const license = meta.LicenseShortName ? meta.LicenseShortName.value : '';
    out.push({ url: i.thumburl, id: p.title, kind: 'photo', credit: `${artist}${license ? ' · ' + license : ''} · Wikimedia Commons` });
    if (out.length >= n) break;
  }
  return out;
}

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

/** Remember a photo as shown, so the next welcome screen / slides pick a different one. */
export function markShown(slide: Slide) {
  if (!slide.id) return;
  const r = getRecent().filter((t) => t !== slide.id);
  r.unshift(slide.id);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(r.slice(0, RECENT_MAX)));
  } catch (_) { /* ignore */ }
}

/** Files bundled from media/photos and media/videos (listed by the build in media.js). */
export function localMedia(kind: 'photo' | 'video'): Slide[] {
  const m = (window as any).__GLASS_MEDIA__ || { photos: [], videos: [] };
  const list: string[] = kind === 'photo' ? m.photos : m.videos;
  return shuffle(list).map((url) => ({ url, kind, credit: '' }));
}

/** Resolves once the image is downloaded and decoded (so it can appear without stutter). */
export function preload(url: string, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const t = setTimeout(() => reject(new Error('Image timed out')), timeoutMs);
    img.onload = () => {
      clearTimeout(t);
      const d = (img as any).decode ? (img as any).decode() : Promise.resolve();
      d.then(resolve, resolve);
    };
    img.onerror = () => {
      clearTimeout(t);
      reject(new Error('Image failed'));
    };
    img.src = url;
  });
}

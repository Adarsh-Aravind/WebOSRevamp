// Everything the UI needs from the TV, in one place. On a PC (no webOS) it returns fake data
// so the whole interface can be designed and tested in a normal browser.

import { CATALOG, MOCK_EXTRAS, findCatalog, fromCatalog, genericArt, type AppEntry } from '../data/catalog';
import { isTV, luna } from './luna';

export { isTV };

export interface InputSource {
  id: string;
  label: string;
  appId: string;
  connected: boolean;
}

export interface VolumeState {
  volume: number;
  muted: boolean;
}

export type AppSource = 'tv' | 'catalog' | 'mock';

/** When Glass last opened another app (so we know you're watching something, not idle on Glass). */
export const away = { since: 0 };

const AM = 'luna://com.webos.applicationManager';

// Every app id the TV reported (including system ones we hide from the grid).
let allLaunchIds: string[] = [];

// Launch points that are part of the TV's plumbing, not things you'd open from a home screen.
// HDMI inputs are hidden too: the remote's Input button already does that.
const HIDDEN_SYSTEM = /^(com\.glass\.home|com\.webos\.app\.(hdmi\d*|home|homeconnect|notificationcenter|voice|remotesetting|inputcommon|installation|factorywin|self-diagnosis|accessibility|tips|care365)|com\.webos\.exampleapp)/;

/**
 * Is this app installed? true / false, or null when the TV won't say.
 * LG blocks listLaunchPoints for normal apps but allows getAppLoadStatus, so this is how Glass
 * finds out which apps you actually have without root.
 */
export async function appExists(id: string): Promise<boolean | null> {
  if (!isTV) return true;
  try {
    const r = await luna<any>(`${AM}/getAppLoadStatus`, { appId: id }, 5000);
    if (r.exist === true) return true;
    if (r.exist === false) return false;
    return null;
  } catch (e: any) {
    // "not exist" means a definite no; a permission error means we simply can't tell.
    if (e && /not exist/i.test(String(e.message))) return false;
    return null;
  }
}

/** Load the apps to show. Tries the TV's real app list first, falls back to our catalog. */
export async function loadApps(): Promise<{ apps: AppEntry[]; source: AppSource }> {
  if (!isTV) {
    return { apps: CATALOG.concat(MOCK_EXTRAS).map((c) => fromCatalog(c, 'mock')), source: 'mock' };
  }
  try {
    const res = await luna<any>(`${AM}/listLaunchPoints`, {});
    const points: any[] = res.launchPoints || [];
    if (!points.length) throw new Error('empty');
    allLaunchIds = points.map((p) => p.id);
    const apps: AppEntry[] = [];
    for (const p of points) {
      const id: string = p.launchPointId || p.id;
      if (!id || HIDDEN_SYSTEM.test(p.id)) continue;
      const known = findCatalog(p.id, p.title || '');
      if (known) {
        apps.push({
          ...fromCatalog(known, 'tv'),
          id,
          launchId: p.id,
          altIds: undefined, // the TV told us the real id
          params: p.params,
          title: p.title || known.title,
          // the real icon + colours from the TV ("use current app icons")
          iconUrl: p.largeIcon || p.icon,
          iconBg: p.iconColor || p.bgColor,
          bgImage: p.bgImage,
        });
      } else {
        apps.push({
          id,
          launchId: p.id,
          params: p.params,
          title: p.title || p.id,
          tagline: '',
          art: genericArt(p.id, p.title || p.id, p.iconColor || p.bgColor),
          iconUrl: p.largeIcon || p.icon,
          iconBg: p.iconColor || p.bgColor,
          bgImage: p.bgImage,
          source: 'tv',
        });
      }
    }
    return { apps, source: 'tv' };
  } catch (_) {
    // The TV won't list apps (normal without root). Ask about each app in our catalog instead.
    const apps: AppEntry[] = [];
    let everAnswered = false;
    for (const c of CATALOG) {
      const candidates = [c.launchId || c.id].concat(c.altIds || []);
      let launchId = '';
      let unknown = false;
      for (const id of candidates) {
        const exists = await appExists(id);
        if (exists === true) {
          launchId = id;
          everAnswered = true;
          break;
        }
        if (exists === null) unknown = true;
        else everAnswered = true;
      }
      if (launchId) apps.push({ ...fromCatalog(c, 'catalog'), launchId, altIds: undefined });
      else if (unknown) apps.push(fromCatalog(c, 'catalog')); // couldn't check: show it anyway
    }
    // If the TV answered nothing at all, show the whole catalog rather than an empty screen.
    return { apps: everAnswered ? apps : CATALOG.map((c) => fromCatalog(c, 'catalog')), source: 'catalog' };
  }
}

/** Can Glass control the screen/power? (LG denies the whole /power category to normal apps.) */
let powerAllowed: boolean | null = null;
export async function canControlPower(): Promise<boolean> {
  if (!isTV) return true;
  if (powerAllowed !== null) return powerAllowed;
  try {
    await luna('luna://com.webos.service.tvpower/power/getPowerState', {}, 5000);
    powerAllowed = true;
  } catch (_) {
    powerAllowed = false;
  }
  return powerAllowed;
}

/** Opens an app. If it isn't installed under appId, tries altIds (e.g. regional versions) in order. */
export async function launch(appId: string, params?: object, altIds: string[] = []): Promise<void> {
  if (!isTV) {
    await delay(250);
    away.since = Date.now();
    return;
  }
  let lastErr: any;
  for (const id of [appId].concat(altIds)) {
    const body: any = { id };
    if (params && Object.keys(params).length) body.params = params;
    try {
      await luna(`${AM}/launch`, body);
      away.since = Date.now();
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

export async function listInputs(): Promise<InputSource[]> {
  const fallback = [1, 2, 3, 4].map((n) => ({ id: `HDMI_${n}`, label: `HDMI ${n}`, appId: `com.webos.app.hdmi${n}`, connected: n <= 2 }));
  if (!isTV) return fallback;
  try {
    const res = await luna<any>('luna://com.webos.service.eim/getAllInputStatus', {});
    const devices: any[] = res.devices || [];
    if (!devices.length) return fallback;
    return devices.map((d) => ({
      id: d.id,
      label: d.label || d.id.replace('_', ' '),
      appId: d.appId || 'com.webos.app.' + String(d.id).toLowerCase().replace('_', ''),
      connected: !!d.connected,
    }));
  } catch (_) {
    return fallback;
  }
}

let mockVolume: VolumeState = { volume: 14, muted: false };

export async function getVolume(): Promise<VolumeState | null> {
  if (!isTV) return { ...mockVolume };
  try {
    const r = await luna<any>('luna://com.webos.audio/getVolume', {});
    const s = r.volumeStatus || r;
    if (typeof s.volume !== 'number') return null;
    return { volume: s.volume, muted: !!(s.muteStatus !== undefined ? s.muteStatus : s.muted) };
  } catch (_) {
    return null;
  }
}

export async function changeVolume(dir: 1 | -1): Promise<void> {
  if (!isTV) {
    mockVolume = { volume: clamp(mockVolume.volume + dir, 0, 100), muted: false };
    return;
  }
  await luna(`luna://com.webos.audio/${dir > 0 ? 'volumeUp' : 'volumeDown'}`, {});
}

export async function setMuted(muted: boolean): Promise<void> {
  if (!isTV) {
    mockVolume = { ...mockVolume, muted };
    return;
  }
  await luna('luna://com.webos.audio/setMuted', { muted });
}

export async function screenOff(): Promise<void> {
  if (!isTV) {
    await delay(200);
    return;
  }
  await luna('luna://com.webos.service.tvpower/power/turnOffScreen', {});
}

/**
 * Google Assistant. On LG it lives behind the remote's Assistant button (handled by the TV itself,
 * so it works on top of Glass too). We also try to open it from Glass; if the TV doesn't allow
 * that, the caller shows a hint about the remote button.
 */
export async function openAssistant(): Promise<void> {
  if (!isTV) throw new Error('PC preview');
  const found = allLaunchIds.filter((id) => /assistant/i.test(id));
  const candidates = found.concat(['com.webos.app.googleassistant', 'com.google.assistant.webos']);
  for (const id of candidates) {
    try {
      await luna(`${AM}/launch`, { id });
      away.since = Date.now();
      return;
    } catch (_) { /* try the next one */ }
  }
  throw new Error('Assistant can only be opened from the remote');
}

// ---------------------------------------------------------------- diagnostics

export interface ProbeResult {
  name: string;
  what: string;
  ok: boolean;
  detail: string;
}

/** Read-only checks: asks the TV for information, changes nothing. */
export async function runDiagnostics(): Promise<{ results: ProbeResult[]; appIds: string[] }> {
  const chrome = /Chrome\/(\d+)/.exec(navigator.userAgent);
  const results: ProbeResult[] = [
    { name: 'Web engine', what: 'Browser engine the TV uses for apps', ok: true, detail: chrome ? `Chromium ${chrome[1]}` : navigator.userAgent },
    { name: 'App canvas', what: 'Resolution apps draw at (LG: 1080p on 4K TVs; video is 4K)', ok: true, detail: `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio || 1}x` },
  ];
  let appIds: string[] = [];
  if (!isTV) {
    results.push({ name: 'webOS', what: 'Running on a TV?', ok: false, detail: 'No — this is the PC preview with fake data' });
    return { results, appIds };
  }

  const checks: Array<[string, string, string, object, (r: any) => string]> = [
    ['TV info', 'Model and firmware', 'luna://com.webos.service.tv.systemproperty/getSystemInfo', { keys: ['modelName', 'firmwareVersion', 'sdkVersion'] }, (r) => `${r.modelName || '?'} · fw ${r.firmwareVersion || '?'} · webOS ${r.sdkVersion || '?'}`],
    ['App list', 'Can Glass see your installed apps?', `${AM}/listLaunchPoints`, {}, (r) => {
      const pts: any[] = r.launchPoints || [];
      appIds = pts.map((p) => `${p.title}  →  ${p.id}`);
      return `${pts.length} apps found`;
    }],
    ['App list (full)', 'Alternative app list', `${AM}/listApps`, {}, (r) => `${(r.apps || []).length} apps`],
    ['Current app', 'Which app is in front', `${AM}/getForegroundAppInfo`, {}, (r) => r.appId || 'ok'],
    ['Inputs', 'HDMI / input list for Control Center', 'luna://com.webos.service.eim/getAllInputStatus', {}, (r) => `${(r.devices || []).length} inputs`],
    ['Volume', 'Volume controls in Control Center', 'luna://com.webos.audio/getVolume', {}, (r) => {
      const s = r.volumeStatus || r;
      return `volume ${s.volume}`;
    }],
    ['Picture mode', 'Read picture settings', 'luna://com.webos.settingsservice/getSystemSettings', { category: 'picture', keys: ['pictureMode'] }, (r) => (r.settings && r.settings.pictureMode) || 'ok'],
    ['Power state', 'Needed for Screen Off / Sleep', 'luna://com.webos.service.tvpower/power/getPowerState', {}, (r) => r.state || 'ok'],
  ];

  for (const [name, what, uri, params, fmt] of checks) {
    try {
      const r = await luna(uri, params, 5000);
      results.push({ name, what, ok: true, detail: fmt(r) });
    } catch (e: any) {
      results.push({ name, what, ok: false, detail: (e && e.message) || 'Not allowed' });
    }
  }
  return { results, appIds };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

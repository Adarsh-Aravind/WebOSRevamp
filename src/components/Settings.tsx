// Glass settings sheet: wallpaper, clock, weather, motion, app management and TV diagnostics.
import { useState } from 'preact/hooks';
import type { AppEntry } from '../data/catalog';
import { WALLPAPERS } from '../data/wallpapers';
import * as tv from '../platform';
import { resetLayout, setLayout, setPrefs, showToast, type Prefs, type SaverSource, type State, type WallpaperId } from '../store/store';

// One row of mutually-exclusive choices, like CleanFrame's Look settings.
const LOOK: Array<{ key: keyof Prefs; label: string; hint: string; options: Array<[string, string]> }> = [
  {
    key: 'background',
    label: 'Background',
    hint: 'Photo uses the same picture as the welcome screen',
    options: [['photo', 'Photo'], ['dark', 'Dark'], ['light', 'Light']],
  },
  {
    key: 'layout',
    label: 'Layout',
    hint: 'A dock of tiles, or a vertical list with names',
    options: [['dock', 'Dock'], ['list', 'List']],
  },
  {
    key: 'labels',
    label: 'App Names',
    hint: 'Under the selected app only, under all of them, or instead of the artwork',
    options: [['icons', 'On Focus'], ['both', 'Always'], ['text', 'Text Only']],
  },
  {
    key: 'material',
    label: 'Material',
    hint: 'How the frosted glass is tuned',
    options: [['soft', 'Soft'], ['frost', 'Frost'], ['tint', 'Tint']],
  },
  {
    key: 'font',
    label: 'Font',
    hint: 'Inter and Geist are sans-serif, Newsreader is a serif',
    options: [['inter', 'Inter'], ['geist', 'Geist'], ['newsreader', 'Newsreader']],
  },
];

const SAVER_STEPS = [0, 2, 5, 10, 15, 30];
const SAVER_SOURCES: Array<{ id: SaverSource; label: string; hint: string }> = [
  { id: 'nature', label: 'Nature Photos', hint: 'Award-winning landscapes from Wikimedia Commons (needs internet)' },
  { id: 'myphotos', label: 'My Photos', hint: 'Files you put in the media/photos folder on your PC' },
  { id: 'myvideos', label: 'My 4K Videos', hint: 'Files in media/videos — videos play in true 4K on your TV' },
];
import { localMedia } from '../lib/photos';
import { Glyph } from './Glyph';
import { Layer, TextField, Toggle } from './Overlays';


interface Props {
  state: State;
  allApps: AppEntry[];
  appSource: string;
  closing?: boolean;
  onClose: () => void;
  onPreviewSaver: () => void;
}

export function SettingsSheet({ state, allApps, appSource, closing, onClose, onPreviewSaver }: Props) {
  const { prefs, layout } = state;
  const [diag, setDiag] = useState<{ results: tv.ProbeResult[]; appIds: string[] } | null>(null);
  const [running, setRunning] = useState(false);
  const hiddenApps = allApps.filter((a) => layout.hidden.indexOf(a.id) >= 0);

  const runDiag = () => {
    setRunning(true);
    tv.runDiagnostics()
      .then(setDiag)
      .finally(() => setRunning(false));
  };

  const addApp = (raw: string) => {
    const id = raw.trim();
    if (!id) return;
    if (layout.custom.some((c) => c.id === id) || allApps.some((a) => a.launchId === id)) {
      showToast('That app is already on your home screen');
      return;
    }
    setLayout({ custom: layout.custom.concat([{ id, title: id }]) });
    showToast(`Added ${id}`);
  };

  const wallpapers: Array<{ id: WallpaperId; name: string; swatch: string }> = [
    { id: 'shuffle' as WallpaperId, name: 'Shuffle', swatch: 'linear-gradient(135deg,#30d1a0 0%,#5e5ce6 25%,#ff375f 50%,#ff9f0a 75%,#0a84ff 100%)' },
    { id: 'dynamic' as WallpaperId, name: 'Dynamic', swatch: 'conic-gradient(from 200deg,#ff9f0a,#ff375f,#5e5ce6,#0a84ff,#30d1a0,#ff9f0a)' },
  ].concat(WALLPAPERS.map((w) => ({ id: w.id as WallpaperId, name: w.name, swatch: w.swatch })));

  return (
    <Layer class="sheet-layer" closing={closing}>
      <div class="sheet-scrim" onClick={onClose} />
      <div class="sheet glass" data-scroll>
        <div class="sheet-head">
          <div class="sheet-title">Settings</div>
          <button class="round-btn small" data-nav onClick={onClose} aria-label="Close">
            <Glyph name="x" size={28} />
          </button>
        </div>

        <div class="group-title">{prefs.background === 'photo' ? 'Colour Wallpaper (used when offline)' : 'Colour Wallpaper'}</div>
        <div class="swatches">
          {wallpapers.map((w, i) => (
            <button key={w.id} class={'swatch' + (prefs.wallpaper === w.id ? ' on' : '')} data-nav data-autofocus={i === 0 ? true : undefined} onClick={() => setPrefs({ wallpaper: w.id })}>
              <div class="swatch-dot" style={{ background: w.swatch }}>
                {prefs.wallpaper === w.id && <Glyph name="check" size={36} stroke={3} />}
              </div>
              <span>{w.name}</span>
            </button>
          ))}
        </div>

        <div class="group-title">Look</div>
        <div class="group glass-inner">
          {LOOK.map((row) => (
            <div key={row.key} class="row static">
              <div class="row-text">
                <div>{row.label}</div>
                <div class="row-hint">{row.hint}</div>
              </div>
              <div class="seg">
                {row.options.map(([value, name]) => (
                  <button
                    key={value}
                    class={'seg-btn' + (prefs[row.key] === value ? ' on' : '')}
                    data-nav
                    onClick={() => setPrefs({ [row.key]: value } as Partial<Prefs>)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Toggle
            label="Adaptive Text"
            hint="Switch the clock to dark lettering over bright photos"
            value={prefs.adaptiveInk}
            onChange={(v) => setPrefs({ adaptiveInk: v })}
          />
        </div>

        <div class="group-title">Welcome & Screen Saver</div>
        <div class="group glass-inner">
          <Toggle label="Welcome Screen" hint="A calm greeting with a random photo each time Glass starts" value={prefs.welcome} onChange={(v) => setPrefs({ welcome: v })} />
          <button
            class="row"
            data-nav
            onClick={() => setPrefs({ saverMins: SAVER_STEPS[(SAVER_STEPS.indexOf(prefs.saverMins) + 1) % SAVER_STEPS.length] })}
          >
            <div class="row-text">
              <div>Start Screen Saver</div>
              <div class="row-hint">After this long without touching the remote — press OK to change</div>
            </div>
            <div class="row-value">{prefs.saverMins ? `After ${prefs.saverMins} min` : 'Never'}</div>
          </button>
          {SAVER_SOURCES.map((src) => {
            const count = src.id === 'myphotos' ? localMedia('photo').length : src.id === 'myvideos' ? localMedia('video').length : -1;
            return (
              <button key={src.id} class="row" data-nav onClick={() => setPrefs({ saverSource: src.id })}>
                <div class="row-text">
                  <div>{src.label}</div>
                  <div class="row-hint">
                    {src.hint}
                    {count >= 0 ? ` · ${count} file${count === 1 ? '' : 's'} found` : ''}
                  </div>
                </div>
                {prefs.saverSource === src.id && <Glyph name="check" size={32} stroke={2.6} />}
              </button>
            );
          })}
          <button class="row" data-nav onClick={onPreviewSaver}>
            <div class="row-text">Preview Screen Saver</div>
            <Glyph name="play" size={30} />
          </button>
        </div>

        <div class="group-title">Clock & Weather</div>
        <div class="group glass-inner">
          <Toggle label="24-Hour Time" value={!prefs.hour12} onChange={(v) => setPrefs({ hour12: !v })} />
          <Toggle label="Show Weather" value={prefs.showWeather} onChange={(v) => setPrefs({ showWeather: v })} />
          <TextField label="City" value={prefs.city} placeholder="e.g. Kochi" onCommit={(v) => setPrefs({ city: v.trim() })} />
        </div>

        <div class="group-title">Motion</div>
        <div class="group glass-inner">
          <Toggle label="Reduce Motion" hint="Calmer animations, easier on older TVs" value={prefs.reduceMotion} onChange={(v) => setPrefs({ reduceMotion: v })} />
          <Toggle label="Reduce Transparency" hint="Solid panels instead of frosted glass — use this if scrolling feels slow on the TV" value={prefs.reduceTransparency} onChange={(v) => setPrefs({ reduceTransparency: v })} />
        </div>

        <div class="group-title">Apps</div>
        <div class="group glass-inner">
          <div class="row static">
            <div class="row-text">
              <div>App list</div>
              <div class="row-hint">
                {appSource === 'tv'
                  ? 'Read from your TV — all installed apps are shown.'
                  : appSource === 'mock'
                  ? 'PC preview — fake apps.'
                  : 'Your TV keeps the app list private, so Glass shows popular apps. Hide the ones you don’t have, add others by ID below.'}
              </div>
            </div>
          </div>
          <TextField label="Add App by ID" value="" placeholder="e.g. com.hotstar.app" onCommit={addApp} />
          {hiddenApps.map((a) => (
            <button key={a.id} class="row" data-nav onClick={() => setLayout({ hidden: layout.hidden.filter((h) => h !== a.id) })}>
              <div class="row-text">
                <div>{a.title}</div>
                <div class="row-hint">Hidden — press OK to show again</div>
              </div>
              <Glyph name="eye" size={30} />
            </button>
          ))}
          {layout.custom.map((c) => (
            <button key={c.id} class="row" data-nav onClick={() => setLayout({ custom: layout.custom.filter((x) => x.id !== c.id) })}>
              <div class="row-text">
                <div>{c.title}</div>
                <div class="row-hint">Added by you — press OK to remove</div>
              </div>
              <Glyph name="x" size={28} />
            </button>
          ))}
          <button
            class="row"
            data-nav
            onClick={() => {
              resetLayout();
              showToast('Home screen layout reset');
            }}
          >
            <div class="row-text">Reset Home Screen Layout</div>
            <Glyph name="reset" size={30} />
          </button>
        </div>

        <div class="group-title">TV Check</div>
        <div class="group glass-inner">
          <button class="row" data-nav onClick={runDiag} disabled={running}>
            <div class="row-text">
              <div>{running ? 'Checking…' : 'Run TV Check'}</div>
              <div class="row-hint">Asks your TV what Glass is allowed to do. Read-only — changes nothing.</div>
            </div>
            <Glyph name="pulse" size={30} />
          </button>
          {diag &&
            diag.results.map((r) => (
              <div key={r.name} class="row static diag" data-nav>
                <div class={'diag-dot ' + (r.ok ? 'ok' : 'no')}>
                  <Glyph name={r.ok ? 'check' : 'x'} size={22} stroke={3} />
                </div>
                <div class="row-text">
                  <div>{r.name}</div>
                  <div class="row-hint">{r.what}</div>
                </div>
                <div class="row-value small">{r.detail}</div>
              </div>
            ))}
          {diag && diag.appIds.length > 0 && (
            <div class="row static diag-apps" data-nav>
              <div class="row-text">
                <div>Installed app IDs</div>
                <div class="mono">{diag.appIds.join('\n')}</div>
              </div>
            </div>
          )}
        </div>

        <div class="about">Glass {__VERSION__} · {tv.isTV ? 'running on your TV' : 'PC preview'} · no root needed</div>
      </div>
    </Layer>
  );
}

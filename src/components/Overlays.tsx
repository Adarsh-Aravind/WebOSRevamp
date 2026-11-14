// Panels that open on top of the home screen: Layer (focus trap), toasts, long-press menu,
// Control Center, and small form controls.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { AppEntry } from '../data/catalog';
import { focusEl, focusFirst } from '../nav/spatial';
import * as tv from '../platform';
import { onToast, showToast } from '../store/store';
import { Glyph, type GlyphName } from './Glyph';
import { formatDate, formatTime, useClock } from './Home';

// ---------------------------------------------------------------- layer

/** A navigable layer. While mounted, remote focus stays inside it; on close, focus goes back. */
export function Layer({ class: cls, children, closing }: { class?: string; children: ComponentChildren; closing?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    focusFirst(ref.current);
    return () => {
      if (prev && document.body.contains(prev)) focusEl(prev);
    };
  }, []);
  return (
    <div ref={ref} data-layer class={(cls || '') + (closing ? ' closing' : '')}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- toasts

export function Toasts() {
  const [msg, setMsg] = useState<{ text: string; n: number } | null>(null);
  useEffect(() => {
    let t: any;
    const off = onToast((text) => {
      setMsg((m) => ({ text, n: (m ? m.n : 0) + 1 }));
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 3200);
    });
    return () => {
      off();
      clearTimeout(t);
    };
  }, []);
  if (!msg) return null;
  return (
    <div class="toast glass" key={msg.n}>
      {msg.text}
    </div>
  );
}

// ---------------------------------------------------------------- long-press menu

export interface MenuItem {
  label: string;
  glyph: GlyphName;
  danger?: boolean;
  action: () => void;
}

export function ContextMenu({ app, anchor, items, closing }: { app: AppEntry; anchor: { x: number; y: number; below: boolean }; items: MenuItem[]; closing?: boolean }) {
  return (
    <Layer class="menu-layer" closing={closing}>
      <div class="menu-scrim" />
      <div class={'menu glass' + (anchor.below ? '' : ' menu-above')} style={{ left: anchor.x, top: anchor.y }}>
        <div class="menu-title">{app.title}</div>
        {items.map((it, i) => (
          <button key={it.label} class={'menu-item' + (it.danger ? ' danger' : '')} data-nav data-autofocus={i === 0 ? true : undefined} onClick={it.action}>
            <span>{it.label}</span>
            <Glyph name={it.glyph} size={30} />
          </button>
        ))}
      </div>
    </Layer>
  );
}

// ---------------------------------------------------------------- control center

interface CCProps {
  closing?: boolean;
  hour12: boolean;
  editing: boolean;
  sleepMins: number;
  sleepLeft: number | null;
  onSleep: (mins: number) => void;
  onEdit: () => void;
  onSettings: () => void;
  onAssistant: () => void;
  onScreenSaver: () => void;
  onClose: () => void;
}

const SLEEP_STEPS = [0, 15, 30, 60, 90, 120];

export function ControlCenter(p: CCProps) {
  const now = useClock();
  const [vol, setVol] = useState<tv.VolumeState | null>(null);
  const [volChecked, setVolChecked] = useState(false);
  const [powerOk, setPowerOk] = useState(true);

  useEffect(() => {
    tv.getVolume().then((v) => {
      setVol(v);
      setVolChecked(true);
    });
    tv.canControlPower().then(setPowerOk);
  }, []);

  const fail = (what: string) => (e: any) => showToast(`${what}: ${(e && e.message) || 'not allowed on this TV'}`);
  const refreshVol = () => tv.getVolume().then(setVol);

  const nextSleep = () => {
    const idx = SLEEP_STEPS.indexOf(p.sleepMins);
    p.onSleep(SLEEP_STEPS[(idx + 1) % SLEEP_STEPS.length]);
  };

  return (
    <Layer class="cc-layer" closing={p.closing}>
      <div class="cc-scrim" onClick={p.onClose} />
      <div class="cc glass" data-scroll>
        <div class="cc-head">
          <div class="cc-time">{formatTime(now, p.hour12)}</div>
          <div class="cc-date">{formatDate(now)}</div>
        </div>

        <div class="cc-section-title">Display</div>
        <div class="cc-grid">
          <button class="cc-tile" data-nav data-autofocus onClick={p.onScreenSaver}>
            <Glyph name="photo" size={40} />
            <span>Screen Saver</span>
          </button>
          {powerOk && (
            <button class="cc-tile" data-nav onClick={() => tv.screenOff().then(p.onClose, fail('Screen Off'))}>
              <Glyph name="power" size={40} />
              <span>Screen Off</span>
            </button>
          )}
          {powerOk && (
            <button class={'cc-tile' + (p.sleepMins ? ' on' : '')} data-nav onClick={nextSleep}>
              <Glyph name="sleep" size={40} />
              <span>{p.sleepMins ? `Sleep ${p.sleepLeft !== null ? p.sleepLeft : p.sleepMins}m` : 'Sleep Off'}</span>
            </button>
          )}
          <button class="cc-tile" data-nav onClick={() => tv.launch('com.palm.app.settings').then(p.onClose, fail('Settings'))}>
            <Glyph name="tv" size={40} />
            <span>TV Settings</span>
          </button>
        </div>

        <div class="cc-section-title">Sound</div>
        {volChecked && !vol ? (
          <div class="cc-note">This TV doesn't let apps change volume — use the remote's volume keys.</div>
        ) : (
          <div class="cc-volume">
            <button class="cc-round" data-nav onClick={() => tv.setMuted(!(vol && vol.muted)).then(refreshVol, fail('Mute'))}>
              <Glyph name={vol && vol.muted ? 'mute' : 'speaker'} size={36} />
            </button>
            <button class="cc-round" data-nav onClick={() => tv.changeVolume(-1).then(refreshVol, fail('Volume'))}>
              <Glyph name="minus" size={36} />
            </button>
            <div class="cc-bar">
              <div class="cc-bar-fill" style={{ transform: `scaleX(${vol ? Math.min(1, vol.volume / 100) : 0})` }} />
              <span class="cc-bar-num">{vol ? vol.volume : '–'}</span>
            </div>
            <button class="cc-round" data-nav onClick={() => tv.changeVolume(1).then(refreshVol, fail('Volume'))}>
              <Glyph name="plus" size={36} />
            </button>
          </div>
        )}

        <div class="cc-section-title">Home Screen</div>
        <div class="cc-grid">
          <button class="cc-tile" data-nav onClick={p.onAssistant}>
            <Glyph name="mic" size={40} />
            <span>Assistant</span>
          </button>
          <button class="cc-tile" data-nav onClick={p.onEdit}>
            <Glyph name="grid" size={40} />
            <span>{p.editing ? 'Stop Editing' : 'Edit Apps'}</span>
          </button>
          <button class="cc-tile" data-nav onClick={p.onSettings}>
            <Glyph name="gear" size={40} />
            <span>Glass Settings</span>
          </button>
        </div>
      </div>
    </Layer>
  );
}

// ---------------------------------------------------------------- form controls

export function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button class="row" data-nav onClick={() => onChange(!value)}>
      <div class="row-text">
        <div>{label}</div>
        {hint && <div class="row-hint">{hint}</div>}
      </div>
      <div class={'switch' + (value ? ' on' : '')}>
        <div class="switch-knob" />
      </div>
    </button>
  );
}

/** Shows as a row; press OK to type (opens the TV keyboard). OK/Enter saves, Back cancels. */
export function TextField({ label, value, placeholder, onCommit }: { label: string; value: string; placeholder?: string; onCommit: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.value = value;
      inputRef.current.focus();
    }
  }, [editing]);

  const finish = (save: boolean) => {
    if (!editing) return;
    const v = inputRef.current ? inputRef.current.value : value;
    setEditing(false);
    if (save && v !== value) onCommit(v);
    setTimeout(() => focusEl(rowRef.current), 0);
  };

  if (editing) {
    return (
      <div class="row row-input">
        <div class="row-text">{label}</div>
        <input
          ref={inputRef}
          class="text-input"
          placeholder={placeholder}
          onKeyDown={(e) => {
            const k = e.keyCode;
            if (k === 13) {
              e.preventDefault();
              finish(true);
            } else if (k === 461 || k === 27) {
              e.preventDefault();
              e.stopPropagation();
              finish(false);
            }
          }}
          onBlur={() => finish(true)}
        />
      </div>
    );
  }
  return (
    <button ref={rowRef} class="row" data-nav onClick={() => setEditing(true)}>
      <div class="row-text">{label}</div>
      <div class="row-value">
        {value || <span class="dim">{placeholder}</span>}
        <Glyph name="pencil" size={26} />
      </div>
    </button>
  );
}

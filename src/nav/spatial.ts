// Remote-control navigation.
//  - Anything with `data-nav` is focusable; arrows move to the nearest one in that direction.
//  - Only the top-most `data-layer` (last in the page) is navigable, so open panels trap focus.
//  - `data-nav-group` + `data-nav-remember`: re-entering the group returns to the last item.
//  - `data-longpress`: holding OK (or the Magic Remote wheel) fires onLongPress instead of a click.
//  - Magic Remote pointer: hovering focuses, clicking activates; the scroll wheel steps through items.

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Key = Dir | 'enter' | 'back' | 'red' | 'green' | 'yellow' | 'blue' | `n${number}`;

export function keyOf(e: KeyboardEvent): Key | null {
  if (e.keyCode >= 48 && e.keyCode <= 57) return `n${e.keyCode - 48}` as Key; // number keys 0–9
  switch (e.keyCode) {
    case 37: return 'left';
    case 38: return 'up';
    case 39: return 'right';
    case 40: return 'down';
    case 13: return 'enter';
    case 461: // webOS Back
    case 27: // Esc (PC)
    case 8: // Backspace (PC)
      return 'back';
    case 403: return 'red';
    case 404: return 'green';
    case 405: return 'yellow';
    case 406: return 'blue';
  }
  return null;
}

let lastInput: 'key' | 'pointer' = 'key';
export const usingPointer = () => lastInput === 'pointer';

export function activeLayer(): HTMLElement | null {
  const ls = document.querySelectorAll<HTMLElement>('[data-layer]');
  return ls.length ? ls[ls.length - 1] : null;
}

function focusables(layer = activeLayer()): HTMLElement[] {
  if (!layer) return [];
  const all = layer.querySelectorAll<HTMLElement>('[data-nav]');
  const out: HTMLElement[] = [];
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (!el.hasAttribute('disabled') && el.getClientRects().length > 0) out.push(el);
  }
  return out;
}

export function focusEl(el: Element | null | undefined) {
  if (!el) return;
  const h = el as HTMLElement;
  h.focus({ preventScroll: true });
  // Mark it ourselves too: focus events don't fire while the window itself isn't active,
  // and the highlight must never go missing.
  const old = document.querySelectorAll('.f');
  for (let i = 0; i < old.length; i++) if (old[i] !== h) old[i].classList.remove('f');
  h.classList.add('f');
  // If the window isn't active the browser skips focus events, so the UI (Top Shelf, scrolling)
  // wouldn't follow. Send them ourselves in that case.
  if (!document.hasFocus()) {
    h.dispatchEvent(new FocusEvent('focus'));
    h.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  }
  const scroller = h.closest('[data-scroll]') as HTMLElement | null;
  if (scroller) ensureVisible(scroller, h);
}

function ensureVisible(sc: HTMLElement, el: HTMLElement) {
  const s = sc.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const pad = 48;
  if (r.top < s.top + pad) sc.scrollTop -= s.top + pad - r.top;
  else if (r.bottom > s.bottom - pad) sc.scrollTop += r.bottom - (s.bottom - pad);
}

/** Focus the best starting element inside a layer. */
export function focusFirst(layer: Element | null = activeLayer()) {
  if (!layer) return;
  focusEl(layer.querySelector('[data-autofocus]') || layer.querySelector('[data-nav]'));
}

const memory = new WeakMap<Element, HTMLElement>();
const groupOf = (el: Element) => el.closest('[data-nav-group]');

function score(a: DOMRect, b: DOMRect, dir: Dir): number {
  const acx = a.left + a.width / 2, acy = a.top + a.height / 2;
  const bcx = b.left + b.width / 2, bcy = b.top + b.height / 2;
  let gap: number, orth: number, centerOrth: number;
  if (dir === 'left' || dir === 'right') {
    if (dir === 'right' ? bcx <= acx + 1 : bcx >= acx - 1) return Infinity;
    gap = dir === 'right' ? b.left - a.right : a.left - b.right;
    orth = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom));
    centerOrth = Math.abs(bcy - acy);
    if (orth > a.height * 0.5) return Infinity; // stay on the same row
  } else {
    if (dir === 'down' ? bcy <= acy + 1 : bcy >= acy - 1) return Infinity;
    gap = dir === 'down' ? b.top - a.bottom : a.top - b.bottom;
    orth = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right));
    centerOrth = Math.abs(bcx - acx);
  }
  return Math.max(0, gap) + orth * 3 + centerOrth * 0.15;
}

export function move(dir: Dir): boolean {
  const items = focusables();
  if (!items.length) return false;
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || items.indexOf(cur) < 0) {
    focusFirst();
    return true;
  }
  const a = cur.getBoundingClientRect();
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of items) {
    if (el === cur) continue;
    const s = score(a, el.getBoundingClientRect(), dir);
    if (s < bestScore) {
      bestScore = s;
      best = el;
    }
  }
  if (!best) {
    bump(cur, dir);
    return false;
  }
  const g = groupOf(best);
  if (g && g !== groupOf(cur) && g.hasAttribute('data-nav-remember')) {
    const m = memory.get(g);
    if (m && items.indexOf(m) >= 0) best = m;
  }
  document.body.setAttribute('data-dir', dir);
  focusEl(best);
  return true;
}

/** Little "can't go further" nudge, like tvOS. */
function bump(el: HTMLElement, dir: Dir) {
  const cls = 'bump-' + dir;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 320);
}

export interface NavOptions {
  /** Called first for every remote key. Return true if handled. */
  onKey: (key: Key, e: KeyboardEvent) => boolean;
  onLongPress: (el: HTMLElement) => void;
}

const LONG_MS = 550;

export function installNav(opts: NavOptions) {
  let timer: any = 0;
  let longFired = false;
  let pressEl: HTMLElement | null = null;
  let enterDown = false;
  let suppressClick = false;

  document.addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement;
    const g = t && t.nodeType === 1 ? groupOf(t) : null;
    if (g) memory.set(g, t);
    if (t && t.classList) t.classList.add('f');
  });
  document.addEventListener('focusout', (e) => {
    const t = e.target as HTMLElement;
    if (t && t.classList) t.classList.remove('f');
  });

  window.addEventListener('keydown', (e) => {
    if (lastInput !== 'key') {
      lastInput = 'key';
      document.body.classList.remove('pointer');
    }
    const ae = document.activeElement as HTMLElement | null;
    const typing = !!ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA');
    if (typing) return; // text fields handle their own keys
    const k = keyOf(e);
    if (!k) return;
    e.preventDefault();

    if (k === 'enter') {
      if (e.repeat || enterDown) return;
      enterDown = true;
      const target = ae && ae.hasAttribute('data-nav') ? ae : null;
      if (!target) return;
      if (!target.hasAttribute('data-longpress')) {
        target.click();
        return;
      }
      pressEl = target;
      longFired = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        longFired = true;
        if (pressEl) opts.onLongPress(pressEl);
      }, LONG_MS);
      return;
    }

    if (opts.onKey(k, e)) return;
    if (k === 'up' || k === 'down' || k === 'left' || k === 'right') move(k);
  });

  window.addEventListener('keyup', (e) => {
    if (keyOf(e) !== 'enter') return;
    enterDown = false;
    if (pressEl && !longFired) {
      clearTimeout(timer);
      const el = pressEl;
      pressEl = null;
      el.click();
    }
    pressEl = null;
  });

  // ---- Magic Remote / mouse
  document.addEventListener(
    'mousemove',
    () => {
      if (lastInput !== 'pointer') {
        lastInput = 'pointer';
        document.body.classList.add('pointer');
      }
    },
    { passive: true }
  );

  document.addEventListener('mouseover', (e) => {
    const el = (e.target as Element).closest('[data-nav]') as HTMLElement | null;
    const layer = activeLayer();
    if (el && layer && layer.contains(el) && document.activeElement !== el && lastInput === 'pointer') {
      el.focus({ preventScroll: true });
    }
  });

  document.addEventListener('mousedown', (e) => {
    const el = (e.target as Element).closest('[data-longpress]') as HTMLElement | null;
    if (!el) return;
    longFired = false;
    clearTimeout(timer);
    timer = setTimeout(() => {
      longFired = true;
      suppressClick = true;
      opts.onLongPress(el);
    }, LONG_MS);
  });
  document.addEventListener('mouseup', () => clearTimeout(timer));
  document.addEventListener(
    'click',
    (e) => {
      if (suppressClick) {
        suppressClick = false;
        e.stopPropagation();
        e.preventDefault();
      }
    },
    true
  );

  // Magic Remote scroll wheel: one notch = one step. Small deltas (touchpads, smooth wheels) are
  // added up so a gentle roll still moves exactly one row; fast spins are rate-limited so focus
  // never races off the screen. Shift+wheel / sideways scroll moves left-right.
  let acc = 0;
  let accX = 0;
  let lastStep = 0;
  let idleTimer: any = 0;
  const STEP = 40; // px of wheel delta per step (a webOS wheel notch is ~100)
  const MIN_GAP = 110; // ms between steps
  document.addEventListener(
    'wheel',
    (e) => {
      const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1; // lines / pages → px
      const dy = e.shiftKey ? 0 : e.deltaY * unit;
      const dx = (e.shiftKey ? e.deltaY : e.deltaX) * unit;
      acc += dy;
      accX += dx;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => (acc = accX = 0), 260);
      const now = Date.now();
      if (now - lastStep < MIN_GAP) return;
      let k: Dir | null = null;
      if (Math.abs(acc) >= STEP) k = acc > 0 ? 'down' : 'up';
      else if (Math.abs(accX) >= STEP) k = accX > 0 ? 'right' : 'left';
      if (!k) return;
      acc = accX = 0;
      lastStep = now;
      // Wheel steers focus like the arrow keys (hiding the pointer, as tvOS does with its touch surface).
      lastInput = 'key';
      document.body.classList.remove('pointer');
      if (!opts.onKey(k, e as any)) move(k);
    },
    { passive: true }
  );
}

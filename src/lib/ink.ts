// Adaptive ink: look at the photo behind the text and choose light or dark lettering for it.
//
// CleanFrame precomputes a palette per bundled wallpaper. Glass shows a different photo every time,
// so it measures at runtime: the photo is drawn tiny (64x36) on a canvas, and the brightness of the
// two regions that carry text — the big clock (top left) and the status capsule (top right) — decides
// the ink. Wikimedia serves these images with CORS, so the pixels are readable; if any step fails we
// simply keep the default light-on-dark scheme.

export interface InkRegion {
  light: boolean; // true = light text on a dark photo (the default)
  luminance: number;
}

const W = 64;
const H = 36;

let canvas: HTMLCanvasElement | null = null;

function ctx2d(): CanvasRenderingContext2D | null {
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
  }
  return canvas.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;
}

/** Perceived brightness (0–1) of a rectangle, in the sRGB "relative luminance" sense. */
function regionLuminance(data: Uint8ClampedArray, x0: number, y0: number, x1: number, y1: number): number {
  let sum = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4;
      // quick approximation of luma; good enough to pick a text colour
      sum += (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
      n++;
    }
  }
  return n ? sum / n : 0;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const t = setTimeout(() => reject(new Error('ink: image timeout')), 20000);
    img.onload = () => {
      clearTimeout(t);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(t);
      reject(new Error('ink: image failed'));
    };
    img.src = url;
  });
}

/**
 * Measure a photo and set the ink CSS variables for it.
 * Safe to call with anything: on any failure it restores the default light-on-dark ink.
 */
export async function applyInk(url: string, enabled: boolean): Promise<void> {
  const root = document.documentElement;
  if (!enabled || !url) {
    reset();
    return;
  }
  try {
    const img = await loadImage(url);
    const c = ctx2d();
    if (!c) {
      reset();
      return;
    }
    c.drawImage(img, 0, 0, W, H);
    const data = c.getImageData(0, 0, W, H).data; // throws if the image is not CORS-readable

    // regions of the 1920x1080 layout that carry text, in canvas coordinates
    const clock = regionLuminance(data, 2, 4, 40, 20); // big clock, top left
    const status = regionLuminance(data, 44, 0, 64, 6); // status capsule, top right

    set(root, '--ink-clock', clock);
    set(root, '--ink-status', status);
  } catch (_) {
    reset();
  }
}

/** Bright photo → dark ink with a light halo; dark photo → the normal light ink. */
function set(root: HTMLElement, prefix: string, luminance: number) {
  const bright = luminance > 0.62;
  if (prefix === '--ink-clock') {
    root.style.setProperty('--clock-ink', bright ? '#15151a' : '#ffffff');
    root.style.setProperty('--clock-ink-2', bright ? 'rgba(20,20,26,0.78)' : 'rgba(255,255,255,0.92)');
    root.style.setProperty(
      '--clock-halo',
      bright ? '0 1px 2px rgba(255,255,255,0.55), 0 2px 26px rgba(255,255,255,0.4)' : '0 4px 30px rgba(0,0,0,0.35)'
    );
  } else {
    root.style.setProperty('--status-ink', bright ? '#15151a' : '#ffffff');
    root.style.setProperty('--status-ink-2', bright ? 'rgba(20,20,26,0.7)' : 'rgba(255,255,255,0.7)');
    root.style.setProperty(
      '--status-halo',
      bright ? '0 1px 2px rgba(255,255,255,0.55)' : '0 2px 16px rgba(0,0,0,0.35)'
    );
  }
}

export function reset() {
  const root = document.documentElement;
  for (const v of ['--clock-ink', '--clock-ink-2', '--clock-halo', '--status-ink', '--status-ink-2', '--status-halo']) {
    root.style.removeProperty(v);
  }
}

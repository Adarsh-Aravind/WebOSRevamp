// Draws Glass's app icons (webos/icon.png 80×80, webos/largeIcon.png 130×130) with no image
// libraries: a blue→violet squircle holding a 2×2 grid of frosted "app" tiles.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SS = 4; // supersampling for smooth edges

function roundRectCoverage(px, py, x, y, w, h, r) {
  const cx = Math.max(x + r, Math.min(px, x + w - r));
  const cy = Math.max(y + r, Math.min(py, y + h - r));
  const dx = px - cx, dy = py - cy;
  return dx * dx + dy * dy <= r * r ? 1 : 0;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function draw(size) {
  const px = new Float64Array(size * size * 4);
  const c1 = [94, 92, 230], c2 = [10, 132, 255], c3 = [100, 210, 255];
  const pad = size * 0.06, R = size * 0.24;
  const tileGap = size * 0.07, inner = size - 2 * pad, ts = (inner - tileGap * 3) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let a = 0, rr = 0, gg = 0, bb = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = x + (sx + 0.5) / SS, fy = y + (sy + 0.5) / SS;
          if (!roundRectCoverage(fx, fy, pad, pad, inner, inner, R)) continue;
          const t = (fx + fy) / (2 * size);
          let col = t < 0.5 ? c1.map((v, i) => lerp(v, c2[i], t * 2)) : c2.map((v, i) => lerp(v, c3[i], (t - 0.5) * 2));
          // frosted tiles
          for (let ty = 0; ty < 2; ty++) {
            for (let tx = 0; tx < 2; tx++) {
              const ox = pad + tileGap + tx * (ts + tileGap), oy = pad + tileGap + ty * (ts + tileGap);
              if (roundRectCoverage(fx, fy, ox, oy, ts, ts, ts * 0.28)) {
                const k = tx === 0 && ty === 0 ? 0.95 : 0.55;
                col = col.map((v) => lerp(v, 255, k));
              }
            }
          }
          a += 1; rr += col[0]; gg += col[1]; bb += col[2];
        }
      }
      const i = (y * size + x) * 4;
      const n = SS * SS;
      if (a) {
        px[i] = rr / a; px[i + 1] = gg / a; px[i + 2] = bb / a;
      }
      px[i + 3] = (a / n) * 255;
    }
  }
  return png(size, px);
}

function png(size, px) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size * 4; x++) raw[y * (size * 4 + 1) + 1 + x] = Math.round(px[y * size * 4 + x]);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return c ^ -1;
}

writeFileSync('webos/icon.png', draw(80));
writeFileSync('webos/largeIcon.png', draw(130));
console.log('Wrote webos/icon.png and webos/largeIcon.png');

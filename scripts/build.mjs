// Builds Glass into ./dist (a folder the TV can install), or runs a live dev server.
//   node scripts/build.mjs         -> production build
//   node scripts/build.mjs --dev   -> http://localhost:5173 with auto-reload (uses fake TV data)
import * as esbuild from 'esbuild';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const dev = process.argv.includes('--dev');
const outdir = 'dist';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });
cpSync('webos', outdir, { recursive: true });

// appinfo.json version always follows package.json
const appinfo = JSON.parse(readFileSync('webos/appinfo.json', 'utf8'));
appinfo.version = pkg.version;
writeFileSync(`${outdir}/appinfo.json`, JSON.stringify(appinfo, null, 2));

// Your own screen saver media: media/photos/*.jpg|png|webp and media/videos/*.mp4|webm|mov
// get copied into the app, and listed in media.js (a plain script, so it loads from file:// on the TV).
const media = { photos: [], videos: [] };
for (const [kind, exts] of [
  ['photos', /\.(jpe?g|png|webp)$/i],
  ['videos', /\.(mp4|webm|mov|m4v)$/i],
]) {
  const dir = `media/${kind}`;
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (!exts.test(f)) continue;
    mkdirSync(`${outdir}/${dir}`, { recursive: true });
    copyFileSync(`${dir}/${f}`, `${outdir}/${dir}/${f}`);
    media[kind].push(`${dir}/${encodeURIComponent(f)}`);
  }
}
writeFileSync(`${outdir}/media.js`, `window.__GLASS_MEDIA__=${JSON.stringify(media)};`);
if (media.photos.length || media.videos.length) {
  console.log(`  Media: ${media.photos.length} photo(s), ${media.videos.length} video(s)`);
}

let html = readFileSync('src/index.html', 'utf8');
if (dev) {
  html = html.replace(
    '</body>',
    `<script>new EventSource('/esbuild').addEventListener('change',function(){location.reload()})</script></body>`
  );
}
writeFileSync(`${outdir}/index.html`, html);

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: { app: 'src/main.tsx' },
  bundle: true,
  outdir,
  // webOS 6 runs a Chromium 79 engine and loads apps from file:// — so: classic script, old syntax.
  format: 'iife',
  target: ['chrome79'],
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: { '.woff2': 'file', '.svg': 'file', '.png': 'file' },
  assetNames: 'assets/[name]-[hash]',
  define: {
    __DEV__: String(dev),
    __VERSION__: JSON.stringify(pkg.version),
  },
  legalComments: 'none',
  logLevel: 'info',
};

if (dev) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: outdir, port: 5173 });
  console.log(`\n  Glass dev server running at http://localhost:${port}\n  (arrow keys = remote, Enter = OK, Esc = Back, hold Enter = long-press)\n`);
} else {
  await esbuild.build(options);
  console.log(`\n  Built Glass ${pkg.version} into ./${outdir}\n`);
}

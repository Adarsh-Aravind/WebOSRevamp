// One-word commands for talking to the TV (wraps LG's official `ares` tools).
//   npm run tv:setup      connect this PC to the TV (once)
//   npm run tv:deploy     build + install + open Glass on the TV
//   npm run tv:launch     open Glass on the TV
//   npm run tv:inspect    open Chrome DevTools for Glass running on the TV
//   npm run tv:extend     reset the Developer Mode timer (it expires every ~50 hours)
//   npm run tv:info       show TV model / firmware
//   npm run tv:uninstall  remove Glass from the TV (everything goes back to normal)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';

const DEVICE = 'tv';
const APP_ID = 'com.glass.home';
const BIN = 'node_modules/@webos-tools/cli/bin';

function ares(tool, args, { quiet = false } = {}) {
  const file = join(BIN, `${tool}.js`);
  if (!existsSync(file)) {
    console.error('LG webOS tools are missing — run "npm install" first.');
    process.exit(1);
  }
  const r = spawnSync(process.execPath, [file, ...args], { stdio: quiet ? 'pipe' : 'inherit', encoding: 'utf8' });
  return r;
}

function must(r, what) {
  if (r.status !== 0) {
    console.error(`\n✗ ${what} failed.`);
    hint();
    process.exit(r.status || 1);
  }
}

function hint() {
  console.error(
    [
      '',
      'Checklist:',
      '  • TV is on, and the Developer Mode app shows "Dev Mode Status: ON"',
      '  • "Key Server" is ON in the Developer Mode app (needed for tv:setup)',
      '  • PC and TV are on the same Wi-Fi / network',
      '  • The IP address in the Developer Mode app matches what you typed (re-run "npm run tv:setup" if it changed)',
      '',
    ].join('\n')
  );
}

const cmd = process.argv[2];

if (cmd === 'setup') {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log('\nOpen the "Developer Mode" app on your TV. You will need the IP address and passphrase it shows.\n');
  const ip = (await rl.question('TV IP address (e.g. 192.168.1.23): ')).trim();
  rl.close();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    console.error('That does not look like an IP address.');
    process.exit(1);
  }
  ares('ares-setup-device', ['-r', DEVICE], { quiet: true }); // forget any old entry
  must(ares('ares-setup-device', ['-a', DEVICE, '-i', `host=${ip}`, '-i', 'port=9922', '-i', 'username=prisoner', '-i', 'default=true']), 'Adding the TV');
  console.log('\nNow make sure "Key Server" is ON in the Developer Mode app, then type the passphrase it shows (6 characters, capitals matter).\n');
  must(ares('ares-novacom', ['--device', DEVICE, '--getkey']), 'Getting the key from the TV');
  console.log('\nTesting the connection…');
  must(ares('ares-device', ['-i', '-d', DEVICE]), 'Talking to the TV');
  console.log('\n✓ Connected! Next: npm run tv:deploy\n');
} else if (cmd === 'deploy') {
  must(spawnSync(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit' }), 'Build');
  mkdirSync('build', { recursive: true });
  must(ares('ares-package', ['dist', '-o', 'build']), 'Packaging');
  const ipk = readdirSync('build')
    .filter((f) => f.startsWith(APP_ID) && f.endsWith('.ipk'))
    .map((f) => join('build', f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
  if (!ipk) {
    console.error('No .ipk was produced.');
    process.exit(1);
  }
  console.log(`\nInstalling ${ipk} …`);
  must(ares('ares-install', ['-d', DEVICE, ipk]), 'Installing on the TV');
  must(ares('ares-launch', ['-d', DEVICE, APP_ID]), 'Opening Glass');
  console.log('\n✓ Glass is installed and open on your TV.\n');
} else if (cmd === 'launch') {
  must(ares('ares-launch', ['-d', DEVICE, APP_ID]), 'Opening Glass');
} else if (cmd === 'inspect') {
  must(ares('ares-inspect', ['-d', DEVICE, '-a', APP_ID, '-o']), 'Opening the inspector');
} else if (cmd === 'info') {
  must(ares('ares-device', ['-i', '-d', DEVICE]), 'Reading TV info');
} else if (cmd === 'uninstall') {
  must(ares('ares-install', ['-d', DEVICE, '-r', APP_ID]), 'Removing Glass');
  console.log('\n✓ Glass removed. Your TV is exactly as before.\n');
} else if (cmd === 'extend') {
  await extendDevMode();
} else {
  console.log('Commands: setup | deploy | launch | inspect | info | extend | uninstall');
}

// Developer Mode expires after ~50 hours, and LG then removes side-loaded apps.
// Pressing "Extend" in the Developer Mode app resets it; this does the same from the PC:
// it reads the TV's own Dev Mode session token and sends it to LG's reset page.
async function extendDevMode() {
  const require = createRequire(import.meta.url);
  const novacom = require('@webos-tools/cli/lib/base/novacom');
  const { Writable } = require('node:stream');

  const token = await new Promise((resolve, reject) => {
    let out = '';
    const sink = new Writable({
      write(chunk, _enc, cb) {
        out += chunk.toString();
        cb();
      },
    });
    const s = new novacom.Session(DEVICE, false, (err, sess) => {
      if (err) return reject(err);
      const session = sess && sess.run ? sess : s;
      session.run('cat /var/luna/preferences/devmode_enabled', null, sink, process.stderr, (e) => {
        try { session.end(); } catch (_) { /* ignore */ }
        if (e) reject(e);
        else resolve(out.trim());
      });
    });
  }).catch((e) => {
    console.error('Could not read the Dev Mode token from the TV:', e && e.message ? e.message : e);
    hint();
    console.error('You can always press "Extend" in the Developer Mode app on the TV instead.');
    process.exit(1);
  });

  if (!token || !/^[A-Za-z0-9]+$/.test(token)) {
    console.error('The TV returned an unexpected token. Press "Extend" in the Developer Mode app instead.');
    process.exit(1);
  }
  const res = await fetch(`https://developer.lge.com/secure/ResetDevModeSession.dev?sessionToken=${token}`);
  const body = (await res.text()).trim();
  if (res.ok) {
    console.log('\n✓ LG answered:', body.slice(0, 200));
    console.log('Check the timer in the Developer Mode app — it should be back near 50 hours.\n');
  } else {
    console.error(`LG's server answered ${res.status}. Press "Extend" in the Developer Mode app instead.`);
    process.exit(1);
  }
}

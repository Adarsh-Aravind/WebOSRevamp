# Glass — an Apple-style home screen for your LG TV

Glass is a full-screen app that replaces the boring webOS ribbon with a **tvOS-style home screen**:

- **Resting home screen**: a big clock, date and weather over the same 4K photo as the welcome screen, with your first seven apps in a compact frosted-glass dock at the very bottom of the screen. Press **↓** and the sheet slides up to show **all** your apps; the clock glides away and the selected app's name and details appear on a glass card at the top. **↓** again goes to the next row (rows scroll inside the sheet). **↑** from the top row, or **Back**, brings the clock back.
- **Photo wallpaper**: the home screen uses the welcome screen's photo and changes whenever the screen saver shows a new one. Frosted glass (glassmorphism) is used throughout.
- **App grid**: your apps with their **real icons** (read from the TV), as large rounded tiles that lift and shine when focused. If the TV keeps its app list private, Glass uses icons it ships with: official logos for Netflix, YouTube, Prime Video, JioHotstar, Apple TV and Spotify, and a one-letter icon for anything else. No tile shows a written name.
- **Live wallpaper**: slowly drifting colour gradients (5 styles + "Dynamic", which changes with the time of day)
- **Clock, date and weather**: like an iPhone lock screen
- **Control Center**: screen saver, volume, TV settings and home-screen shortcuts. Screen Off and the sleep timer appear only if your TV allows apps to control power (this 65NANO83 does not, so they are hidden). HDMI is left out because the remote's Input button already does that
- **Reorder apps**: hold OK on an app → **Move**. The app lifts up; move it with the arrows and press OK to drop it. The 🟡 yellow button opens edit mode for rearranging several apps.
- **Welcome screen**: a minimal greeting ("Good evening" and the time) over a random 4K nature photo, never one of the last 40 shown. It stays until you press any button on the remote. The home wallpaper also shuffles each time.
- **Screen saver**: after a few idle minutes, slow-drifting 4K nature photos (Wikimedia Commons Featured Pictures), or your own photos or 4K videos.
- **Google Assistant**: the 🎤 button in the top bar and in Control Center.
- **Magic Remote wheel**: one notch moves one row. Number keys **1–9** open your first nine apps.

Made for: **LG 65NANO83 (2021), webOS 6**. It should work on any webOS 5/6+ TV.

---

## Is this safe for my TV?

**Yes.** Glass is a normal app installed through LG's own Developer Mode. It runs inside LG's app sandbox like Netflix or YouTube do, and can't change system files or firmware.

- Remove it any time with `npm run tv:uninstall` (or just turn Developer Mode off). Your TV is then exactly as before.
- No root and no hacks. Everything in this guide uses LG's official tools.

**What Glass can't do (without root):** LG's **Home button** always opens LG's own ribbon. The workaround: put Glass **first** in the ribbon (step 5 below). Then *Home → OK* takes you to Glass.

---

## One-time setup

### 1. On the PC
You already have Node.js. In this folder, run:

```bash
npm install
```

### 2. On the TV: Developer Mode app
Open the **Developer Mode** app (you already have it on). Check:
- **Dev Mode Status: ON**
- **Key Server: ON**
- Note the **IP address** and the **Passphrase** shown on screen.

The PC and TV must be on the same Wi-Fi or network.

### 3. Connect the PC to the TV

```bash
npm run tv:setup
```

It asks for the TV's IP address, then for the passphrase (capital letters matter). When you see **✓ Connected!**, you're done.

### 4. Install Glass

```bash
npm run tv:deploy
```

This builds Glass, installs it, and opens it on the TV. Run the same command again after any change.

### 5. Open it like any other app
Glass is a normal app: press **Home** on the remote and pick **Glass** from the app bar, the same way you open Netflix or YouTube. **Back** on its main screen closes it, and **Home** always goes to LG's own home bar. (Optional: if you want it handy, move Glass to the front of the app bar with Hold OK → Edit.)

---

## Using Glass with the remote

| Remote | What it does |
|---|---|
| ↓ from the clock | Open the app sheet with all your apps (lands on the app you were on last) |
| Arrows in the sheet | Move between apps and rows |
| ↑ from the top row, or **Back** | Back to the clock (Back again exits Glass) |
| **OK** | Open an app / press a button |
| **Hold OK** on an app | Options: Open · **Move** (reorder) · Hide App |
| **Back** | Close a panel; in edit mode, stop editing; in the app sheet, back to the clock; on the clock screen, **exit Glass** (like any normal app) |
| Magic Remote pointer | Hover to focus (icons tilt toward the pointer) |
| Scroll wheel | Roll: one notch = one row (up from the top row = back to the clock). Press: OK |
| Number keys **1–9** | Open your 1st…9th app · **0** opens Control Center |
| Colour keys | 🔵 Control Center · 🟢 Settings · 🟡 Edit mode |
| **Google Assistant button** (the four coloured dots) | Google Assistant. The TV handles this button itself, so it works on top of Glass |
| Top-right buttons | ⚌ Control Center · ⚙ Glass Settings (Google Assistant: use the remote's Assistant button, or Control Center) |
| Any key during the screen saver | Back to the home screen (the key does nothing else) |

### Welcome screen and screen saver
Settings → **Welcome & Screen Saver**:
- **Welcome Screen** on/off. It appears when Glass starts, and again when you come back after 20+ minutes away (for example, the TV was off). It stays until you **press a button**: any remote key, or a wheel or pointer click. Moving the remote or rolling the wheel doesn't dismiss it. The photo is random every time and never repeats one of your last 40.
- **Start Screen Saver**: Never / 2 / 5 / 10 / 15 / 30 minutes without remote input. It only starts when the TV is left alone **on Glass**. While you're watching Netflix, Live TV or any other app it never starts, and when you come back to Glass the countdown starts fresh. A welcome screen left alone turns into the screen saver too.
- Pictures:
  - **Nature Photos** (online): about 600 hand-picked landscape, mountain, lake, waterfall, forest, coast and sunset photos.
  - **My Photos**: copy pictures into `media/photos`.
  - **My 4K Videos**: copy `.mp4` files into `media/videos`.
  - After adding files, run `npm run tv:deploy` again.

**About 4K:** Glass uses original photos at least 3840px wide and downloads them at **3840px (4K UHD)**. Measured on this TV, the app canvas reports 1920×1080 CSS pixels at a device pixel ratio of **2**, so the real framebuffer is 3840×2160 and these photos do render at full 4K detail. (LG's [spec page](https://webostv.developer.lge.com/develop/specifications/app-resolution) describes app graphics as 1080p, which is the CSS coordinate system, not the output resolution.) Settings → **Run TV Check** shows this for your own TV.

**About "every boot":** without root, an app can't start itself when the TV turns on. So the welcome screen shows when *Glass* starts (Home → OK after switching the TV on). With root, Glass can be set to open automatically at power-on.

**Your JioHotstar / other apps:** if a tile like *JioHotstar* doesn't open, run Settings → **Run TV Check**. It lists the exact IDs of the apps on your TV. Add the right one with *Add App by ID* and hide the wrong tile.

**Weather:** open Settings → *City* → type your city. The data comes from Open-Meteo, which is free and needs no account.

**Missing apps?** Some TVs don't let apps read the list of installed apps. In that case Glass shows popular apps (Netflix, YouTube, Prime Video…).
- Hide the ones you don't have: hold OK → *Hide App*.
- Add others in Settings → *Add App by ID*.
- Settings → **Run TV Check** shows what your TV allows and, if it can, lists the IDs of every installed app.

---

## ⚠️ Developer Mode expires every ~50 hours

LG's Developer Mode has a countdown timer. **If it reaches zero, LG removes Glass** (no harm done, you can reinstall it with `npm run tv:deploy`). To reset the timer, either:
- open the Developer Mode app on the TV and press **Extend**, or
- run this on the PC:

```bash
npm run tv:extend
```

---

## Other commands

| Command | What it does |
|---|---|
| `npm run dev` | Live preview on the PC at http://localhost:5173 with fake apps (arrows = remote, Enter = OK, Esc = Back, hold Enter = long-press) |
| `npm run tv:launch` | Open Glass on the TV |
| `npm run tv:inspect` | Chrome DevTools connected to Glass on the TV (for debugging) |
| `npm run tv:info` | Show the TV's model and firmware |
| `npm run tv:uninstall` | Remove Glass from the TV |

### Prefer buttons? webOS Studio
LG's **webOS Studio** extension for VS Code does the same job with a GUI: Device Manager → add TV → Package / Install / Launch / Inspect. To use it, run `npm run build` first, then point webOS Studio at the **`dist`** folder. Both approaches use the same LG tools underneath. Use whichever you like.

---

## Look settings

Settings → **Look** (five choices, modelled on [CleanFrame](https://github.com/nthnclrk/CleanFrame), a Tizen launcher for Samsung The Frame):

| Setting | Options |
|---|---|
| Background | **Photo** (the welcome screen's picture) · Dark · Light |
| Layout | **Dock** of tiles · List with names |
| App Names | **On Focus** · Always · Text Only (names instead of artwork) |
| Material | **Soft** · Frost (heavier blur) · Tint (more colour through the glass) |
| Font | **Inter** · Geist · Newsreader (serif) |

**Adaptive Text** switches the clock to dark lettering when the photo behind it is bright. Glass measures each photo as it loads, so it works with the random pictures too.

## How it's built (for the curious)

- Preact + TypeScript, bundled with esbuild for **Chromium 79**, the web engine inside webOS 6.
- `src/platform/`: talks to the TV through LG's Luna service bus. On a PC it switches to fake data automatically.
- `src/nav/spatial.ts`: remote-control focus engine.
- `src/components/`: home screen, Control Center, Settings.
- `src/styles/app.css`: all visuals. Only `transform` and `opacity` are animated, to keep the TV smooth.
- `webos/appinfo.json`: the TV app manifest. `npm run icons` redraws the icons.

### About root
Root isn't needed for anything above. With root (Homebrew Channel), Glass could also **start automatically when the TV turns on**. Whether root is possible at all depends on your exact firmware version. Rooting is a separate step with its own risks, so look into it only after Glass is running.

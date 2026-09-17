# RUSH HOUR

**Endless runner** 

outrun the cop, collect coins, survive the daylight city.


| Platform | How |
|----------|-----|
| Browser / PWA | Open `www/index.html` or run `npm start` |
| Android (Play Store) | Capacitor → Android Studio → AAB/APK |
| iOS (App Store) | Capacitor → Xcode (macOS) → Archive |

---

## Play locally (browser)

```bash
cd "Endless game.java"
npm start
```

Then open **http://localhost:4173**

Or double-click / serve the `www` folder with any static server.

### Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Jump | `Space` / `↑` / `W` | Tap right half of screen |
| Slide | `↓` / `S` | Tap left half of screen |
| Pause | `P` / `Esc` | Pause button |
| Mute | `M` | Mute button |

---

## Game design

- **Auto-run** endless side-scroller through a daylight city
- **Cop chase** — gap meter for pressure; the cop only catches you if you **bump an obstacle**
- **Coins** — combos increase payout; coins also open a little gap
- **Obstacles** — crates, barriers, cones (jump) and low signs (slide) — hit one and you're caught
- **Oncoming cars** — sedans, hatches, taxis, SUVs, pickups and sports cars drive at you in the opposite direction; dodge lanes (jump only clears low cars)
- **Near-miss** — skimming past hazards pushes the cop back
- **No account** — play immediately; no sign-in
- **Progression** — speed and pressure ramp with distance
- **Saves** — wallet, best distance, unlocks on this device (`localStorage`)
- **Audio** — procedural Web Audio (no large music files)
- **Offline** — service worker PWA cache

---

## Project layout

```
www/                 ← web game root (also Capacitor webDir)
  index.html
  css/style.css
  js/                ← ES modules (game, render, audio, input…)
  icons/
  manifest.webmanifest
  sw.js
capacitor.config.json
package.json
scripts/
  build.js
  generate-icons.js
src/Main.java        ← pointer for the original Java IDEA project
```

---

## Ship to app stores

### 1. Install dependencies

```bash
npm install
npm run build
node scripts/generate-icons.js
```

### 2. Initialize Capacitor (once)

```bash
npx cap init "Getaway Rush" com.getawayrush.game --web-dir www
```

If `capacitor.config.json` already exists, skip init and only add platforms:

```bash
npx cap add android
npx cap add ios    # requires macOS + Xcode
npx cap sync
```

### 3. Android → Google Play

1. `npx cap open android`
2. In Android Studio: set **applicationId** `com.getawayrush.game`, version code/name
3. Create a **release keystore** and signing config
4. Build **Android App Bundle** (AAB)
5. Create a Play Console listing (screenshots, privacy policy, content rating)
6. Upload AAB to internal testing → production

**Requirements:** Google Play Developer account (~ one-time fee), privacy policy URL, store graphics (feature graphic 1024×500, icons 512×512).

### 4. iOS → App Store

1. On a Mac: `npx cap open ios`
2. Set Bundle ID `com.getawayrush.game`, signing team, version
3. Archive → Upload to App Store Connect
4. Fill metadata, screenshots (6.7" / 6.5" / iPad if needed), privacy nutrition labels
5. Submit for review

**Requirements:** Apple Developer Program (annual), macOS + Xcode.

### 5. Browser / itch.io / PWA

- Host the `www/` folder on any static host (Netlify, Vercel, GitHub Pages, Firebase Hosting)
- HTTPS required for service worker / installable PWA
- Optional: submit as a **Trusted Web Activity** (TWA) on Play if you prefer pure web

---

## Store checklist (official listing)

- [ ] Unique package / bundle ID (`com.getawayrush.game` or your domain reverse)
- [ ] App name, short & full description
- [ ] Privacy policy (even if you only use localStorage)
- [ ] Age rating questionnaire
- [ ] Screenshots on real devices (landscape recommended)
- [ ] App icon 512×512 (Play) / 1024×1024 (iOS)
- [ ] Sound on/off and pause (included)
- [ ] Test on low-end phones (60fps target, DPR capped at 2)

---

## Privacy (suggested policy points)

Getaway Rush stores **high scores and mute preference only on the device** (`localStorage`). No accounts, no ads, no analytics in this base build. If you add ads/analytics later, update the policy and store declarations.

---

## Tech stack

- Vanilla **HTML5 Canvas** + **ES modules** (no heavy engine lock-in)
- **Web Audio API** for SFX / ambient bed
- **Capacitor 6** for native shells
- **PWA** manifest + service worker

This keeps binary size small, review risk low, and iteration fast — suitable for an indie launch on all three surfaces.

---

## License

MIT — customize branding, art, and package IDs before shipping under your publisher name.

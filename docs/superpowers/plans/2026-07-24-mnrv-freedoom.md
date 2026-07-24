# MNRV Freedoom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a locally hosted Freedoom 0.13.0 Phase 1 game with Episode 1-4 launch choices, exact MNRV-supplied DOOM branding, persistent saves, desktop controls, and an optional mobile touch overlay inside the retro desktop.

**Architecture:** Build a pinned `cloudflare/doom-wasm` Chocolate Doom WebAssembly runtime in Docker, host its generated JavaScript/WASM plus official `freedoom1.wad` locally, and run it in a lazy same-origin iframe. A DOM bootstrap owns episode selection, progress, persistence, errors, and lifecycle; separate input modules map touch controls to the engine canvas. The retro parent reuses the media plan's `sendWindowLifecycle(win, action)` bridge.

**Tech Stack:** Chocolate Doom C source, Emscripten WebAssembly, Docker, Freedoom 0.13.0 IWAD, static HTML/CSS/ES modules, IndexedDB/IDBFS, Node.js built-in test runner, agent-browser.

## Global Constraints

- Use official Freedoom 0.13.0 from `https://github.com/freedoom/freedoom/releases/download/v0.13.0/freedoom-0.13.0.zip`.
- Verify release ZIP SHA256 `3F9B264F3E3CE503B4FB7F6BDCB1F419D93C7B546F4DF3E874DD878DB9688F59`.
- Verify `freedoom1.wad` SHA256 `7323BCC168C5A45FF10749B339960E98314740A734C30D4B9F3337001F9E703D`.
- Pin engine source to `cloudflare/doom-wasm` commit `65e0d3ae2ffa604155eebd96ed40da6567bd08f4`.
- Use the existing `DOOM/DOOM.png` directly everywhere; its SHA256 is `0BC32BDC63BD0F9307E2515E14CC3693FF8A073AD960B2C01BCEEC26603B3C9B`.
- Present Episode 1, 2, 3, and 4 as equal primary launcher choices.
- Do not publish `DOOM/DOOM.zip`, `Doom19SW_Win_x64_v09902.exe`, original Doom WAD/audio, or legacy `doom1.data`/`doom2.data` artifacts as game payloads.
- Host runtime, WAD, licenses, credits, and corresponding engine source locally.
- Lazy-load game assets only after the user opens the game window and starts an episode.
- Desktop uses keyboard/mouse; touch controls appear only on touch/coarse-pointer devices and are user-hideable.
- Do not add a second Three.js/WebGL renderer over the game.
- Preserve FreeCell, Minesweeper, modern-route, portfolio, and media-player behavior.
- Preserve unrelated worktree changes.

---

### Task 1: Create a reproducible, licensed Freedoom runtime artifact set

**Files:**
- Add: `DOOM/DOOM.png`
- Create: `scripts/doom-wasm/Dockerfile`
- Create: `scripts/build-freedoom.ps1`
- Create: `doom/data/freedoom1.wad`
- Create: `doom/data/default.cfg`
- Create: `doom/engine/websockets-doom.js`
- Create: `doom/engine/websockets-doom.wasm`
- Create: `doom/source/cloudflare-doom-wasm-65e0d3a.zip`
- Create: `doom/licenses/freedoom/COPYING.txt`
- Create: `doom/licenses/freedoom/CREDITS.txt`
- Create: `doom/licenses/freedoom/CREDITS-MUSIC.txt`
- Create: `doom/licenses/engine/COPYING.md`
- Create: `doom/BUILD-METADATA.json`
- Create: `tests/freedoom-assets.test.mjs`

**Interfaces:**
- Produces: verified local assets under `doom/data/` and `doom/engine/`, plus exact provenance metadata.
- Consumed by: the game bootstrap in Task 2.

- [ ] **Step 1: Write the failing asset/provenance test**

Create `tests/freedoom-assets.test.mjs`:

```js
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const expected = {
  logo: '0bc32bdc63bd0f9307e2515e14cc3693ff8a073ad960b2c01bceec26603b3c9b',
  wad: '7323bcc168c5a45ff10749b339960e98314740a734c30d4b9f3337001f9e703d',
};

async function sha256(path) {
  const bytes = await readFile(new URL(path, root));
  return createHash('sha256').update(bytes).digest('hex');
}

test('uses the exact supplied logo and official Freedoom Phase 1 WAD', async () => {
  assert.equal(await sha256('DOOM/DOOM.png'), expected.logo);
  assert.equal(await sha256('doom/data/freedoom1.wad'), expected.wad);
  assert.equal((await stat(new URL('doom/data/freedoom1.wad', root))).size, 28795076);
});

test('ships pinned engine artifacts, corresponding source, and licenses', async () => {
  const metadata = JSON.parse(await readFile(new URL('doom/BUILD-METADATA.json', root), 'utf8'));
  assert.equal(metadata.freedoom.version, '0.13.0');
  assert.equal(metadata.freedoom.archiveSha256.toUpperCase(), '3F9B264F3E3CE503B4FB7F6BDCB1F419D93C7B546F4DF3E874DD878DB9688F59');
  assert.equal(metadata.engine.commit, '65e0d3ae2ffa604155eebd96ed40da6567bd08f4');
  for (const path of [
    'doom/engine/websockets-doom.js', 'doom/engine/websockets-doom.wasm',
    'doom/source/cloudflare-doom-wasm-65e0d3a.zip',
    'doom/licenses/freedoom/COPYING.txt', 'doom/licenses/freedoom/CREDITS.txt',
    'doom/licenses/freedoom/CREDITS-MUSIC.txt', 'doom/licenses/engine/COPYING.md',
  ]) assert.ok((await stat(new URL(path, root))).size > 0, `${path} must be non-empty`);
});

test('does not track prohibited legacy or commercial payloads', () => {
  const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' });
  assert.doesNotMatch(tracked, /DOOM\/DOOM\.zip/i);
  assert.doesNotMatch(tracked, /Doom19SW.*\.exe/i);
  assert.doesNotMatch(tracked, /doom[12]\.data/i);
  assert.doesNotMatch(tracked, /doom2\.(wad|wasm|js)/i);
});
```

- [ ] **Step 2: Confirm the required runtime assets are absent**

```powershell
node --test tests/freedoom-assets.test.mjs
```

Expected: failure because `doom/data/freedoom1.wad` and generated runtime/provenance files do not exist. The exact `DOOM/DOOM.png` assertion must already pass after copying the user-supplied untracked file into the isolated worktree unchanged.

- [ ] **Step 3: Add the pinned Docker build environment**

Create `scripts/doom-wasm/Dockerfile`:

```dockerfile
FROM emscripten/emsdk:2.0.20

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      autoconf automake libtool make pkg-config zip ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /src
ENTRYPOINT ["/bin/bash", "scripts/build.sh"]
```

This older pinned Emscripten image matches the upstream May 2021 flags such as `TOTAL_MEMORY`, `EXTRA_EXPORTED_RUNTIME_METHODS`, and `INVOKE_RUN`.

- [ ] **Step 4: Create the reproducible PowerShell build script**

Create `scripts/build-freedoom.ps1` with strict error handling and these exact constants:

```powershell
[CmdletBinding()]
param([switch]$SkipEngineBuild)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$cacheRoot = Join-Path $repoRoot '.cache\freedoom-build'
$archivePath = Join-Path $cacheRoot 'freedoom-0.13.0.zip'
$extractRoot = Join-Path $cacheRoot 'freedoom-0.13.0'
$engineRoot = Join-Path $cacheRoot 'doom-wasm'
$releaseUrl = 'https://github.com/freedoom/freedoom/releases/download/v0.13.0/freedoom-0.13.0.zip'
$releaseSha = '3F9B264F3E3CE503B4FB7F6BDCB1F419D93C7B546F4DF3E874DD878DB9688F59'
$wadSha = '7323BCC168C5A45FF10749B339960E98314740A734C30D4B9F3337001F9E703D'
$engineCommit = '65e0d3ae2ffa604155eebd96ed40da6567bd08f4'

New-Item -ItemType Directory -Force -Path $cacheRoot | Out-Null
if (-not (Test-Path -LiteralPath $archivePath)) {
  Invoke-WebRequest -UseBasicParsing -Uri $releaseUrl -OutFile $archivePath
}
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath).Hash -ne $releaseSha) {
  throw 'Freedoom release archive SHA256 mismatch.'
}
if (-not (Test-Path -LiteralPath (Join-Path $extractRoot 'freedoom1.wad'))) {
  Expand-Archive -LiteralPath $archivePath -DestinationPath $cacheRoot -Force
}
$wadPath = Join-Path $extractRoot 'freedoom1.wad'
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $wadPath).Hash -ne $wadSha) {
  throw 'freedoom1.wad SHA256 mismatch.'
}
if (-not (Test-Path -LiteralPath (Join-Path $engineRoot '.git'))) {
  git clone https://github.com/cloudflare/doom-wasm.git $engineRoot
}
git -C $engineRoot fetch --quiet origin main
git -C $engineRoot checkout --quiet --detach $engineCommit

$dataDir = Join-Path $repoRoot 'doom\data'
$engineDir = Join-Path $repoRoot 'doom\engine'
$sourceDir = Join-Path $repoRoot 'doom\source'
$freedoomLicenseDir = Join-Path $repoRoot 'doom\licenses\freedoom'
$engineLicenseDir = Join-Path $repoRoot 'doom\licenses\engine'
New-Item -ItemType Directory -Force -Path $dataDir,$engineDir,$sourceDir,$freedoomLicenseDir,$engineLicenseDir | Out-Null
Copy-Item -LiteralPath $wadPath -Destination (Join-Path $dataDir 'freedoom1.wad') -Force
Copy-Item -LiteralPath (Join-Path $extractRoot 'COPYING.txt') -Destination $freedoomLicenseDir -Force
Copy-Item -LiteralPath (Join-Path $extractRoot 'CREDITS.txt') -Destination $freedoomLicenseDir -Force
Copy-Item -LiteralPath (Join-Path $extractRoot 'CREDITS-MUSIC.txt') -Destination $freedoomLicenseDir -Force
Copy-Item -LiteralPath (Join-Path $engineRoot 'COPYING.md') -Destination $engineLicenseDir -Force
Copy-Item -LiteralPath (Join-Path $engineRoot 'src\default.cfg') -Destination (Join-Path $dataDir 'default.cfg') -Force
Copy-Item -LiteralPath $wadPath -Destination (Join-Path $engineRoot 'src\doom1.wad') -Force

git -C $engineRoot archive --format=zip --output (Join-Path $sourceDir 'cloudflare-doom-wasm-65e0d3a.zip') $engineCommit

if (-not $SkipEngineBuild) {
  docker version | Out-Null
  docker build --tag mnrv-doom-wasm-builder:2.0.20 (Join-Path $repoRoot 'scripts\doom-wasm')
  $mount = ($engineRoot -replace '\\','/')
  docker run --rm --volume "${mount}:/src" mnrv-doom-wasm-builder:2.0.20
  Copy-Item -LiteralPath (Join-Path $engineRoot 'src\websockets-doom.js') -Destination $engineDir -Force
  Copy-Item -LiteralPath (Join-Path $engineRoot 'src\websockets-doom.wasm') -Destination $engineDir -Force
}

$metadata = [ordered]@{
  freedoom = [ordered]@{ version='0.13.0'; archiveUrl=$releaseUrl; archiveSha256=$releaseSha; wadSha256=$wadSha }
  engine = [ordered]@{ repository='https://github.com/cloudflare/doom-wasm.git'; commit=$engineCommit; emscripten='2.0.20' }
}
$metadataPath = Join-Path $repoRoot 'doom\BUILD-METADATA.json'
$metadataJson = $metadata | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText($metadataPath, $metadataJson, (New-Object Text.UTF8Encoding($false)))
```

Add `.cache/freedoom-build/` to `.gitignore`; do not track build caches or cloned working trees.

- [ ] **Step 5: Build and verify the runtime**

Ensure Docker Desktop is running, then run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-freedoom.ps1
node --test tests/freedoom-assets.test.mjs
```

Expected: generated JavaScript and WASM are non-empty, official hashes match, and all asset tests pass. If the pinned upstream build fails, fix only the container/toolchain compatibility required to reproduce commit `65e0d3a`; do not switch engines or remove audio without a design escalation.

- [ ] **Step 6: Verify generated payload safety**

```powershell
Get-ChildItem doom -Recurse -File | Sort-Object Length -Descending | Select-Object -First 20 FullName,Length
rg -n "doom2|original doom|Doom19SW|DOOM\.zip" doom scripts/build-freedoom.ps1
git diff --check
```

Expected: no individual tracked file exceeds GitHub's 100 MB limit; no prohibited payload is copied; only provenance text may mention excluded names.

Delete the tracked `DOOM/Doom19SW_Win_x64_v09902.exe` before staging. The native Windows executable is not part of the browser game and must not be published.

- [ ] **Step 7: Commit the reproducible artifact set**

```powershell
git add -- .gitignore DOOM/DOOM.png scripts/doom-wasm/Dockerfile scripts/build-freedoom.ps1 doom tests/freedoom-assets.test.mjs
git commit -m "build: add reproducible Freedoom runtime assets"
```

---

### Task 2: Build the episode launcher, persistence, and engine lifecycle

**Files:**
- Create: `doom/index.html`
- Create: `doom/css/game-shell.css`
- Create: `doom/js/bootstrap.js`
- Create: `doom/js/save-store.js`
- Create: `tests/freedoom-shell.test.mjs`

**Interfaces:**
- Produces: `window.mnrvDoom`, `window.Module`, `startEpisode(episode)`, `flushSaves()`, and child lifecycle handling.
- Consumed by: touch controls in Task 3 and retro parent integration in Task 4.

- [ ] **Step 1: Write the failing game-shell contract**

Create `tests/freedoom-shell.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [html, css, bootstrap, saves] = await Promise.all([
  readFile(new URL('../doom/index.html', import.meta.url), 'utf8').catch(() => ''),
  readFile(new URL('../doom/css/game-shell.css', import.meta.url), 'utf8').catch(() => ''),
  readFile(new URL('../doom/js/bootstrap.js', import.meta.url), 'utf8').catch(() => ''),
  readFile(new URL('../doom/js/save-store.js', import.meta.url), 'utf8').catch(() => ''),
]);

test('launcher exposes all four episodes and the exact logo', () => {
  assert.match(html, /\.\.\/DOOM\/DOOM\.png/);
  for (const episode of [1, 2, 3, 4]) assert.match(html, new RegExp(`data-episode="${episode}"`));
});

test('shell contains recoverable loading, game, help, pause, and error states', () => {
  for (const id of ['launcher', 'loading', 'loading-progress', 'canvas', 'pause-panel', 'help-panel', 'error-panel', 'retry']) {
    assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
  }
});

test('bootstrap loads only local verified runtime/data and all episodes', () => {
  assert.match(bootstrap, /engine\/websockets-doom\.js/);
  assert.match(bootstrap, /data\/freedoom1\.wad/);
  assert.doesNotMatch(bootstrap, /https?:\/\//);
  assert.match(bootstrap, /-episode/);
  assert.match(bootstrap, /-warp/);
  assert.match(bootstrap, /-savedir/);
  assert.doesNotMatch(bootstrap, /-nomusic/);
});

test('save adapter mounts and flushes IDBFS', () => {
  assert.match(saves, /IDBFS/);
  assert.match(saves, /syncfs\(true/);
  assert.match(saves, /syncfs\(false/);
});

test('mobile CSS accounts for safe areas and preserves the playfield', () => {
  assert.match(css, /env\(safe-area-inset-left\)/);
  assert.match(css, /@media\s*\(pointer:\s*coarse\)/);
  assert.match(css, /prefers-reduced-motion/);
});
```

- [ ] **Step 2: Run and confirm all shell contracts fail**

```powershell
node --test tests/freedoom-shell.test.mjs
```

Expected: failures because the game shell modules do not exist.

- [ ] **Step 3: Create the semantic launcher and runtime surfaces**

Create `doom/index.html` with:

- `<img src="../DOOM/DOOM.png" alt="DOOM">` in the launcher.
- Four `<button type="button" class="episode-button" data-episode="1|2|3|4">` controls labeled Episode 1-4.
- `#loading` with `<progress id="loading-progress" max="100" value="0">` and textual status.
- `<canvas id="canvas" tabindex="0" aria-label="Freedoom speelveld">` with context-menu suppression.
- Hidden `#pause-panel`, `#help-panel`, and `#error-panel`; `#retry` reloads the selected episode.
- `#touch-controls` reserved for Task 3.
- Local scripts only: `js/save-store.js`, `js/bootstrap.js`; the engine script is injected by bootstrap after selection.
- Links to `licenses/freedoom/COPYING.txt`, credits, and engine GPL source/notice from the help panel.

Create `doom/css/game-shell.css` with a black, low-chrome 4:3 canvas stage, Windows 98-inspired launcher buttons, transparent loading progress, visible focus, safe-area padding, orientation hint for portrait coarse pointers, and no fixed widths. The canvas must have no CSS border or padding because SDL mouse coordinates depend on its content box.

- [ ] **Step 4: Implement the IDBFS adapter**

Create `doom/js/save-store.js` as a classic script exposing:

```js
window.mnrvSaveStore = {
  mount(FS, IDBFS, addRunDependency, removeRunDependency) {
    const dependency = 'mnrv-idbfs';
    addRunDependency(dependency);
    if (!FS.analyzePath('/persist').exists) FS.mkdir('/persist');
    FS.mount(IDBFS, {}, '/persist');
    FS.syncfs(true, (error) => {
      if (error) window.dispatchEvent(new CustomEvent('mnrv-save-warning', { detail: error }));
      removeRunDependency(dependency);
    });
  },
  flush(FS) {
    return new Promise((resolve, reject) => FS.syncfs(false, (error) => error ? reject(error) : resolve()));
  },
};
```

- [ ] **Step 5: Implement bootstrap state and the Emscripten boundary**

Create `doom/js/bootstrap.js` as a classic script. It must:

- Keep explicit states `launcher`, `loading`, `running`, `paused`, and `error`.
- Validate episode as one of `[1, 2, 3, 4]`.
- Build arguments exactly as:

```js
['-iwad', 'freedoom1.wad', '-window', '-nogui', '-config', '/persist/default.cfg', '-savedir', '/persist', '-episode', String(episode), '-warp', String(episode), '1']
```

- Define `window.Module` before injecting `engine/websockets-doom.js`.
- In `preRun`, mount IDBFS through `mnrvSaveStore.mount`, preload `data/freedoom1.wad` as `/freedoom1.wad`, and ensure `/persist/default.cfg` exists by fetching local `data/default.cfg` and writing its bytes while holding a run dependency.
- Set `noInitialRun: true`; call `callMain(args)` from `onRuntimeInitialized`.
- Update real dependency progress through `monitorRunDependencies`.
- Handle `webglcontextlost` by preventing default, pausing, and showing the recoverable error surface.
- Post `{ type: 'mnrv-game:ready', episode }` to `window.parent` on running state and `{ type: 'mnrv-game:error', message }` on fatal load failure.
- Accept parent messages only from `window.parent` and `window.location.origin`:
  - `mnrv-game:pause`: synthesize the engine pause key if running, release pointer lock, suspend available audio contexts, and show pause state.
  - `mnrv-game:resume`: require the user-facing resume button; the message alone must not seize input.
  - `mnrv-game:close`: flush IDBFS, release pointer lock, and pause audio.
- Flush saves on `pagehide` and `visibilitychange` when hidden.
- Expose `window.mnrvDoom = { startEpisode, flushSaves, getState }`.

- [ ] **Step 6: Run the shell and asset gates**

```powershell
node --test tests/freedoom-assets.test.mjs tests/freedoom-shell.test.mjs
git diff --check
```

Expected: all tests pass.

- [ ] **Step 7: Smoke-test each launcher button before touch work**

Serve the repo and use `agent-browser` to open `doom/index.html`. Click each Episode button in a fresh session and confirm loading reaches the canvas with no page error. Record any upstream engine audio/config warning in the task report; fix in scope before commit.

- [ ] **Step 8: Commit the isolated game shell**

```powershell
git add -- doom/index.html doom/css/game-shell.css doom/js/bootstrap.js doom/js/save-store.js tests/freedoom-shell.test.mjs
git commit -m "feat: add persistent Freedoom episode launcher"
```

---

### Task 3: Add explicit desktop/touch action mapping and mobile overlay

**Files:**
- Create: `doom/js/input-actions.mjs`
- Create: `doom/js/touch-overlay.mjs`
- Modify: `doom/index.html`
- Modify: `doom/css/game-shell.css`
- Modify: `doom/js/bootstrap.js`
- Create: `tests/freedoom-input.test.mjs`

**Interfaces:**
- Produces: `InputActions`, `TouchOverlay`, and the DOM contract `#move-stick`, `#aim-zone`, `#fire`, `#use`, `#weapon-prev`, `#weapon-next`, `#touch-toggle`, `#game-pause`.
- Consumes: `window.Module.canvas` and `window.mnrvDoom`.

- [ ] **Step 1: Write failing pure input tests**

Create `tests/freedoom-input.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { InputActions, keyForVector, weaponNumber } from '../doom/js/input-actions.mjs';

test('joystick vectors map to explicit movement keys with a dead zone', () => {
  assert.deepEqual(keyForVector(0.1, 0.1), []);
  assert.deepEqual(keyForVector(0, -1), ['KeyW']);
  assert.deepEqual(keyForVector(-1, 0), ['KeyA']);
  assert.deepEqual(keyForVector(0.8, 0.8).sort(), ['KeyD', 'KeyS']);
});

test('weapon cycling stays within Doom weapon numbers', () => {
  assert.equal(weaponNumber(1, -1), 7);
  assert.equal(weaponNumber(7, 1), 1);
  assert.equal(weaponNumber(3, 1), 4);
});

test('action adapter releases held keys on reset', () => {
  const events = [];
  const target = { dispatchEvent: (event) => events.push([event.type, event.code]) };
  const actions = new InputActions(target, (type, init) => ({ type, ...init }));
  actions.setMovement(['KeyW', 'KeyA']);
  actions.reset();
  assert.deepEqual(events.slice(-2), [['keyup', 'KeyW'], ['keyup', 'KeyA']]);
});
```

- [ ] **Step 2: Confirm the input module is absent**

```powershell
node --test tests/freedoom-input.test.mjs
```

Expected: `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement `InputActions` as the only physical-to-action adapter**

Create `doom/js/input-actions.mjs` exporting:

```js
export function keyForVector(x, y, deadZone = 0.24)
export function weaponNumber(current, direction)
export class InputActions {
  constructor(target, eventFactory = (type, init) => new KeyboardEvent(type, init))
  setMovement(codes)
  aim(deltaX)
  setFire(pressed)
  use()
  switchWeapon(direction)
  pause()
  reset()
}
```

Implementation rules:

- Movement uses `KeyW`, `KeyA`, `KeyS`, and `KeyD`; diagonals press two keys; dead-zone vectors release all movement.
- Track held keys in a `Set`; emit only actual transitions.
- Keyboard events use `{ code, key, bubbles: true, cancelable: true }` with the matching key value.
- `aim(deltaX)` dispatches a bubbling `mousemove` with finite clamped `movementX` between -80 and 80.
- Fire dispatches left-button `mousedown`/`mouseup` transitions exactly once.
- Use dispatches Space down then up.
- Weapon cycling tracks 1-7 and dispatches the selected `DigitN` key down/up.
- Pause dispatches `KeyP` down/up.
- Reset releases movement and fire.

- [ ] **Step 4: Implement the touch overlay DOM and controller**

Add controls to `doom/index.html` using real `<button>` elements for fire/use/weapons/toggle/pause and labeled touch surfaces for move/aim. Import `touch-overlay.mjs` from bootstrap after the canvas exists.

Create `doom/js/touch-overlay.mjs` exporting `class TouchOverlay` that:

- accepts `{ root, actions }`;
- uses Pointer Events and `setPointerCapture`;
- calculates joystick vectors relative to the initial touch origin;
- sends aim deltas only from the aim pointer;
- binds fire as press/release, use and weapon changes as click actions;
- calls `actions.reset()` on `pointercancel`, `lostpointercapture`, `blur`, `visibilitychange`, pause, and hide;
- toggles `.touch-controls-hidden` and updates `aria-pressed`/button copy;
- activates only when `matchMedia('(pointer: coarse)').matches` or `navigator.maxTouchPoints > 0`.

CSS requirements:

- Left joystick occupies only the lower-left edge.
- Aim surface occupies the right half but sits behind explicit buttons.
- Fire is at least 72px; use and weapon buttons at least 48px.
- Controls use safe-area insets, 0.58-0.76 opacity, high-contrast focus, and `touch-action: none` only inside control surfaces.
- Center and lower-middle playfield remain unobstructed.
- Landscape is normal; portrait shows a dismissible compact orientation hint without blocking the launcher.

- [ ] **Step 5: Run pure and shell tests**

```powershell
node --test tests/freedoom-input.test.mjs tests/freedoom-shell.test.mjs tests/freedoom-assets.test.mjs
git diff --check
```

Expected: all tests pass.

- [ ] **Step 6: Browser-test touch and desktop controls**

Use `agent-browser` plus browser evaluation to verify pointer events at 320x568, 375x812, 768x1024, and a desktop viewport. Confirm no stuck key after cancel/hide/pause, no page scroll during joystick/aim, and no touch UI on fine-pointer desktop.

- [ ] **Step 7: Commit the input layer**

```powershell
git add -- doom/index.html doom/css/game-shell.css doom/js/bootstrap.js doom/js/input-actions.mjs doom/js/touch-overlay.mjs tests/freedoom-input.test.mjs
git commit -m "feat: add mobile Freedoom controls"
```

---

### Task 4: Integrate Freedoom into the retro desktop

**Files:**
- Modify: `index.html`
- Modify: `js/main.js`
- Modify: `css/style.css`
- Create: `tests/freedoom-retro-integration.test.mjs`

**Interfaces:**
- Consumes: `sendWindowLifecycle(win, action)` from the media-player plan.
- Produces: `#freedoom-window`, `#start-freedoom`, lazy `data-src="doom/index.html"`, and `loadWindowFrame`/`resetWindowFrame` behavior.

- [ ] **Step 1: Write the failing integration test**

Create `tests/freedoom-retro-integration.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [html, js, css] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../js/main.js', import.meta.url), 'utf8'),
  readFile(new URL('../css/style.css', import.meta.url), 'utf8'),
]);

test('desktop, Start menu, and window all use the exact supplied logo', () => {
  const refs = html.match(/src="DOOM\/DOOM\.png"/g) ?? [];
  assert.ok(refs.length >= 3, `expected at least three exact logo references, got ${refs.length}`);
});

test('Freedoom opens in a lazy same-origin app window', () => {
  assert.match(html, /data-window="freedoom-window"/);
  assert.match(html, /id="start-freedoom"/);
  assert.match(html, /id="freedoom-window"[^>]*data-app-kind="game"/);
  assert.match(html, /data-src="doom\/index\.html"/);
  assert.doesNotMatch(html, /class="freedoom-frame"[^>]*\ssrc=/);
});

test('window lifecycle loads lazily and resets game iframe on close', () => {
  assert.match(js, /function loadWindowFrame\(win\)/);
  assert.match(js, /function resetWindowFrame\(win\)/);
  assert.match(js, /mnrv-game:pause/);
  assert.match(js, /mnrv-game:close/);
});

test('game window has desktop and mobile-safe dimensions', () => {
  assert.match(css, /\.freedoom-window\s*\{/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)[\s\S]*?\.freedoom-window\s*\{/);
});
```

- [ ] **Step 2: Confirm integration test failure**

```powershell
node --test tests/freedoom-retro-integration.test.mjs
```

Expected: failures because no Freedoom desktop integration exists.

- [ ] **Step 3: Add exact icon, Start-menu item, and game window markup**

In `index.html`:

- Add a desktop icon with `data-window="freedoom-window"`, exact `<img src="DOOM/DOOM.png">`, and label `Freedoom`.
- Add a Start-menu item `id="start-freedoom"` with the exact same image and label.
- Add `#freedoom-window.win-window.hidden.freedoom-window[data-app-kind="game"]` with the exact logo in its title bar, standard minimize/maximize/close buttons, and:

```html
<iframe class="freedoom-frame" data-src="doom/index.html" title="Freedoom" allow="autoplay; fullscreen; gamepad" allowfullscreen></iframe>
```

- [ ] **Step 4: Add lazy iframe and lifecycle behavior**

In `js/main.js`, implement:

```js
function loadWindowFrame(win) {
  const frame = win.querySelector('iframe[data-src]');
  if (frame && !frame.getAttribute('src')) frame.setAttribute('src', frame.dataset.src);
}

function resetWindowFrame(win) {
  const frame = win.querySelector('iframe[data-src]');
  if (frame) frame.removeAttribute('src');
}
```

- Call `loadWindowFrame(win)` in `showWindow` before focus.
- Add the Start-menu click handler that closes the menu and calls `showWindow('freedoom-window')`.
- Extend `sendWindowLifecycle` so `data-app-kind="game"` emits `mnrv-game:pause` or `mnrv-game:close` through the existing template.
- In `hideWindow`, call `resetWindowFrame(win)` after the close message for game windows. Preserve media iframe state behavior.
- Listen for same-origin `mnrv-game:ready` and `mnrv-game:error` only to update the parent status bar; never forward arbitrary message data into HTML.

Add window CSS:

```css
.freedoom-window {
  left: 8%;
  top: 6%;
  width: min(960px, 84vw);
  height: min(760px, 82vh);
  min-width: 640px;
  min-height: 480px;
}

.freedoom-window .win-body { padding: 0; overflow: hidden; background: #000; }
.freedoom-frame { display: block; width: 100%; height: 100%; border: 0; background: #000; }

@media (max-width: 640px) {
  .freedoom-window {
    left: 2px;
    top: 2px;
    width: calc(100vw - 4px);
    height: calc(100vh - 34px);
    min-width: 0;
    min-height: 320px;
  }
}
```

- [ ] **Step 5: Run integration and regression tests**

```powershell
node --test tests/freedoom-retro-integration.test.mjs tests/retro-app-lifecycle.test.mjs tests/freedoom-shell.test.mjs tests/freedoom-input.test.mjs tests/freedoom-assets.test.mjs tests/reported-diagnostics.test.mjs
git diff --check
```

Expected: all tests pass and existing desktop routes remain referenced.

- [ ] **Step 6: Verify cold-load behavior and full window lifecycle**

Use browser network inspection to prove initial `index.html` does not fetch `freedoom1.wad`, `websockets-doom.js`, or `websockets-doom.wasm`. Open the icon, start an episode, minimize, restore, maximize, fullscreen, close, and reopen. Confirm audio/input release and clean iframe recreation.

- [ ] **Step 7: Commit the retro integration**

```powershell
git add -- index.html js/main.js css/style.css tests/freedoom-retro-integration.test.mjs
git commit -m "feat: add Freedoom to retro desktop"
```

---

### Task 5: Complete the four-episode playtest, persistence, accessibility, and release audit

**Files:**
- Modify only if findings require: `doom/index.html`, `doom/css/game-shell.css`, `doom/js/bootstrap.js`, `doom/js/input-actions.mjs`, `doom/js/touch-overlay.mjs`, `index.html`, `js/main.js`, `css/style.css`
- Create: `doom/README.md`
- Create: `tests/freedoom-release.test.mjs`

**Interfaces:**
- Produces: release documentation and a final automated deployment contract.

- [ ] **Step 1: Write the failing release contract**

Create `tests/freedoom-release.test.mjs` to assert:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readme = await readFile(new URL('../doom/README.md', import.meta.url), 'utf8').catch(() => '');
const index = await readFile(new URL('../doom/index.html', import.meta.url), 'utf8');

test('documents controls, episodes, persistence, provenance, and non-endorsement', () => {
  for (const phrase of ['Episode 1-4', 'Keyboard and mouse', 'Touch controls', 'IndexedDB', 'Freedoom 0.13.0', '65e0d3ae2ffa604155eebd96ed40da6567bd08f4', 'not endorsed']) {
    assert.match(readme, new RegExp(phrase, 'i'), `missing ${phrase}`);
  }
});

test('game page links all required local notices', () => {
  for (const path of ['licenses/freedoom/COPYING.txt', 'licenses/freedoom/CREDITS.txt', 'licenses/freedoom/CREDITS-MUSIC.txt', 'licenses/engine/COPYING.md', 'source/cloudflare-doom-wasm-65e0d3a.zip']) {
    assert.ok(index.includes(path), `missing local notice link ${path}`);
  }
});
```

- [ ] **Step 2: Confirm documentation test failure**

```powershell
node --test tests/freedoom-release.test.mjs
```

Expected: failure because `doom/README.md` does not exist.

- [ ] **Step 3: Write operational and license documentation**

Create `doom/README.md` documenting:

- route `doom/index.html` and retro desktop entry points;
- Episode 1-4 scope;
- exact desktop and touch controls;
- IndexedDB save behavior and how close/restart behaves;
- build command `powershell -ExecutionPolicy Bypass -File scripts/build-freedoom.ps1`;
- official Freedoom version/hashes and engine commit;
- locations of local licenses, credits, build metadata, and corresponding source;
- a clear statement that DOOM is a trademark of its owner, the content is Freedoom, and the MNRV integration is not endorsed by the original game publishers.

- [ ] **Step 4: Run the complete four-episode playtest**

With `agent-browser` and, where necessary, a headed browser session:

- start E1M1, E2M1, E3M1, and E4M1;
- confirm visible movement and combat feedback in each;
- confirm SFX and music originate from `freedoom1.wad`; no requests target legacy audio;
- verify save → page reload → load save;
- verify desktop keyboard/mouse, pointer lock, Escape/pause, fullscreen, and release on minimize/close;
- verify mobile joystick, aim, fire, use, weapon previous/next, hide/show controls, pause, pointer cancellation, and orientation prompt;
- test 320, 375, 768, and 1440 CSS pixel widths;
- collect screenshots of launcher, desktop play, mobile landscape play, and recoverable error state;
- inspect console/page errors and network failures.

Any failed requirement must be fixed with the narrowest relevant automated regression before continuing.

- [ ] **Step 5: Run the combined repository gate**

```powershell
node --test tests
git diff --check
git status --short
```

Expected: all tests pass; only intended files from the three approved workstreams are changed; `DOOM/DOOM.zip` remains ignored and untracked.

- [ ] **Step 6: Commit verified release documentation and playtest fixes**

```powershell
git add -- doom/README.md tests/freedoom-release.test.mjs doom/index.html doom/css/game-shell.css doom/js/bootstrap.js doom/js/input-actions.mjs doom/js/touch-overlay.mjs index.html js/main.js css/style.css
git commit -m "docs: finalize Freedoom browser release"
```

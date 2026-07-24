# MNRV Native Media Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the crashing React/Cassette media-player bundle with a complete Windows 95-styled native audio/video player that obeys retro-window lifecycle events.

**Architecture:** Keep `mediaplayer.html` inside the existing same-origin iframe. Move immutable playlists and pure helpers into an ES module that Node can test. A DOM controller owns one audio element, one video element, controls, keyboard actions, accessible status, and parent messages; `js/main.js` sends origin-scoped pause/close lifecycle messages.

**Tech Stack:** Static HTML/CSS, native `HTMLMediaElement`, ES modules, Node.js built-in test runner, `postMessage`, agent-browser.

## Global Constraints

- Do not retain React 16, Cassette, React95, or `mediaplayer.bundle.js` in the production runtime.
- Use all nine existing local MP3 files and all four existing local MP4 files.
- Do not depend on remote video availability or CORS behavior.
- Implement play, pause, stop, previous, next, seek, volume, mute, track selection, elapsed time, duration, loading, buffering, ended, and recoverable error states.
- Minimize pauses and preserves time. Close stops, resets, and clears transient errors.
- Work without horizontal overflow at 320 CSS pixels.
- Preserve the existing outer Windows 95 media-player window and title bar.
- Preserve unrelated worktree changes.

---

### Task 1: Create the tested playlist and media-state core

**Files:**
- Create: `assets/js/mediaplayer-core.mjs`
- Create: `tests/mediaplayer-core.test.mjs`

**Interfaces:**
- Produces: `AUDIO_TRACKS`, `VIDEO_TRACKS`, `clamp`, `formatTime`, `getAdjacentIndex`, and `isEditableTarget`.
- Consumed by: `assets/js/mediaplayer.js` in Task 2.

- [ ] **Step 1: Write the failing core tests**

Create `tests/mediaplayer-core.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AUDIO_TRACKS,
  VIDEO_TRACKS,
  clamp,
  formatTime,
  getAdjacentIndex,
  isEditableTarget,
} from '../assets/js/mediaplayer-core.mjs';

test('ships the complete dependable local playlists', () => {
  assert.equal(AUDIO_TRACKS.length, 9);
  assert.equal(VIDEO_TRACKS.length, 4);
  for (const track of [...AUDIO_TRACKS, ...VIDEO_TRACKS]) {
    assert.match(track.id, /^[a-z0-9-]+$/);
    assert.ok(track.title.length > 0);
    assert.match(track.src, /^assets\/(audio|video)\//);
    assert.doesNotMatch(track.src, /^https?:/);
  }
});

test('clamp and time formatting return stable UI values', () => {
  assert.equal(clamp(-1, 0, 1), 0);
  assert.equal(clamp(0.4, 0, 1), 0.4);
  assert.equal(clamp(3, 0, 1), 1);
  assert.equal(formatTime(Number.NaN), '--:--');
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65.9), '1:05');
  assert.equal(formatTime(3661), '1:01:01');
});

test('adjacent navigation wraps in both directions', () => {
  assert.equal(getAdjacentIndex(0, -1, 4), 3);
  assert.equal(getAdjacentIndex(3, 1, 4), 0);
  assert.equal(getAdjacentIndex(1, 1, 4), 2);
});

test('keyboard shortcuts ignore editable controls', () => {
  assert.equal(isEditableTarget({ tagName: 'INPUT', isContentEditable: false }), true);
  assert.equal(isEditableTarget({ tagName: 'BUTTON', isContentEditable: false }), true);
  assert.equal(isEditableTarget({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isEditableTarget({ tagName: 'DIV', isContentEditable: false }), false);
});
```

- [ ] **Step 2: Confirm the module is missing**

Run:

```powershell
node --test tests/mediaplayer-core.test.mjs
```

Expected: failure with `ERR_MODULE_NOT_FOUND` for `mediaplayer-core.mjs`.

- [ ] **Step 3: Implement the complete pure module**

Create `assets/js/mediaplayer-core.mjs`:

```js
export const AUDIO_TRACKS = Object.freeze([
  { id: 'microsoft-sound', title: 'The Microsoft Sound', src: 'assets/audio/The Microsoft Sound.mp3' },
  { id: 'windows-95-startup', title: 'Windows 95 Startup Sound', src: 'assets/audio/Microsoft Windows 95 Startup Sound.mp3' },
  { id: 'bach-brandenburg-3', title: "Bach's Brandenburg Concerto No. 3", src: "assets/audio/Bach's Brandenburg Concerto No. 3.mp3" },
  { id: 'beethoven-fifth', title: "Beethoven's 5th Symphony", src: "assets/audio/Beethoven's 5th Symphony.mp3" },
  { id: 'beethoven-fur-elise', title: "Beethoven's Fur Elise", src: "assets/audio/Beethoven's Fur Elise.mp3" },
  { id: 'sugar-plum-fairy', title: 'Dance of the Sugar-Plum Fairy', src: 'assets/audio/Dance of the Sugar-Plum Fairy.mp3' },
  { id: 'debussy-claire-de-lune', title: "Debussy's Claire de Lune", src: "assets/audio/Debussy's Claire de Lune.mp3" },
  { id: 'mountain-king', title: 'In the Hall of the Mountain King', src: 'assets/audio/In the Hall of the Mountain King.mp3' },
  { id: 'mozart-symphony-40', title: "Mozart's Symphony No. 40", src: "assets/audio/Mozart's Symphony No. 40.mp3" },
]);

export const VIDEO_TRACKS = Object.freeze([
  { id: 'magic-words', title: 'Nedry - Ah Ah Ah!', src: 'assets/video/Magic_words.mp4' },
  { id: 'mobile-loader', title: 'Mobile Loader', src: 'assets/video/Mobile loader.mp4' },
  { id: 'windows-boot', title: 'Windows 95 Boot', src: 'assets/video/Win_boot.mp4' },
  { id: 'windows-error', title: 'Windows 95 Blue Screen', src: 'assets/video/Win_error.mp4' },
]);

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function formatTime(value) {
  if (!Number.isFinite(value) || value < 0) return '--:--';
  const seconds = Math.floor(value);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function getAdjacentIndex(index, direction, length) {
  if (length < 1) return 0;
  return (index + direction + length) % length;
}

export function isEditableTarget(target) {
  const tagName = target?.tagName?.toUpperCase();
  return Boolean(target?.isContentEditable || ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(tagName));
}
```

- [ ] **Step 4: Run the core tests**

```powershell
node --test tests/mediaplayer-core.test.mjs
```

Expected: 4 passing tests, 0 failures.

- [ ] **Step 5: Commit the core**

```powershell
git add -- assets/js/mediaplayer-core.mjs tests/mediaplayer-core.test.mjs
git commit -m "feat: add native media player core"
```

---

### Task 2: Replace the broken bundle with the accessible native player

**Files:**
- Replace: `mediaplayer.html`
- Create: `assets/js/mediaplayer.js`
- Create: `tests/mediaplayer-structure.test.mjs`

**Interfaces:**
- Consumes: all exports from `assets/js/mediaplayer-core.mjs`.
- Produces: `MediaPlayerController` in the browser and message handlers for `mnrv-media:pause` and `mnrv-media:close`.

- [ ] **Step 1: Write the failing document contract test**

Create `tests/mediaplayer-structure.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../mediaplayer.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../assets/js/mediaplayer.js', import.meta.url), 'utf8').catch(() => '');

test('loads only the native production module', () => {
  assert.match(html, /<script\s+type="module"\s+src="assets\/js\/mediaplayer\.js"><\/script>/);
  assert.doesNotMatch(html, /mediaplayer\.bundle\.js/);
  assert.doesNotMatch(html, /React|Cassette|react95/i);
});

test('exposes accessible tabs, media, controls, ranges, playlist, and status', () => {
  for (const fragment of [
    'role="tablist"', 'role="tab"', 'id="media-audio"', 'id="media-video"',
    'id="play-toggle"', 'id="stop"', 'id="previous"', 'id="next"',
    'id="seek"', 'id="volume"', 'id="mute"', 'id="playlist"',
    'id="elapsed"', 'id="duration"', 'id="player-status"', 'aria-live="polite"',
  ]) assert.ok(html.includes(fragment), `missing ${fragment}`);
});

test('implements parent lifecycle and complete keyboard actions', () => {
  assert.match(script, /mnrv-media:pause/);
  assert.match(script, /mnrv-media:close/);
  for (const key of ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyM', 'Home']) {
    assert.ok(script.includes(key), `missing keyboard mapping ${key}`);
  }
});
```

- [ ] **Step 2: Run the document contract and confirm failure**

```powershell
node --test tests/mediaplayer-structure.test.mjs
```

Expected: failures because the old page loads `mediaplayer.bundle.js` and the native controller does not exist.

- [ ] **Step 3: Replace `mediaplayer.html` with the exact semantic shell**

The new document must contain this body structure, with its styling kept in the document so the iframe remains self-contained:

```html
<body>
  <main class="player-shell" aria-label="Windows 95 Media Player">
    <div class="playlist-tabs" role="tablist" aria-label="Mediatype">
      <button id="audio-tab" class="tab-btn active" type="button" role="tab" aria-selected="true" aria-controls="playlist">Audio</button>
      <button id="video-tab" class="tab-btn" type="button" role="tab" aria-selected="false" aria-controls="playlist">Video</button>
    </div>
    <section class="display-panel" aria-label="Huidige media">
      <audio id="media-audio" preload="metadata"></audio>
      <video id="media-video" preload="metadata" playsinline hidden></video>
      <div class="track-readout">
        <strong id="track-title">Geen track geselecteerd</strong>
        <span><span id="elapsed">0:00</span> / <span id="duration">--:--</span></span>
      </div>
    </section>
    <label class="range-row" for="seek"><span>Positie</span><input id="seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Afspeelpositie"></label>
    <div class="transport" role="group" aria-label="Afspeelknoppen">
      <button id="previous" type="button" aria-label="Vorige track">|&lt;</button>
      <button id="play-toggle" type="button" aria-label="Afspelen">▶</button>
      <button id="stop" type="button" aria-label="Stoppen">■</button>
      <button id="next" type="button" aria-label="Volgende track">&gt;|</button>
    </div>
    <label class="range-row" for="volume"><span>Volume</span><input id="volume" type="range" min="0" max="100" value="80" step="1" aria-label="Volume"><output id="volume-value" for="volume">80%</output></label>
    <button id="mute" class="mute-button" type="button" aria-pressed="false">Dempen</button>
    <ol id="playlist" class="playlist" aria-label="Playlist"></ol>
    <p id="player-status" class="status" aria-live="polite">Gereed</p>
  </main>
  <script type="module" src="assets/js/mediaplayer.js"></script>
</body>
```

CSS requirements in the same file:

- Win95 colors `#c0c0c0`, `#ffffff`, `#808080`, `#000080`, and black readout/video surfaces.
- Two-pixel beveled borders on interactive controls.
- `.player-shell` uses a single-column grid and fills the iframe.
- `.display-panel`, playlist, and controls use `min-width: 0`.
- `.playlist` scrolls independently and retains at least 96px height.
- Buttons and ranges expose visible `:focus-visible` outlines.
- At `max-width: 360px`, padding decreases, transport buttons remain at least 44px square, and no fixed minimum width remains.
- `prefers-reduced-motion: reduce` disables non-essential transitions.

- [ ] **Step 4: Implement the controller with explicit state methods**

Create `assets/js/mediaplayer.js` as a module importing the Task 1 exports. Implement `class MediaPlayerController` with these exact methods:

```js
constructor(root = document)
get playlist()
get media()
bindControls()
bindMedia(media)
setMode(mode)
selectTrack(index, { autoplay = false } = {})
play()
pause(status = 'Gepauzeerd')
stop()
selectAdjacent(direction)
seekToRatio(ratio)
seekBy(seconds)
setVolume(value)
toggleMute()
renderPlaylist()
renderTimeline()
renderTransport()
setStatus(message, { error = false } = {})
handleKeydown(event)
handleParentMessage(event)
```

Required behavior:

- Cache every required element by ID in the constructor and throw a descriptive error if the shell is incomplete.
- Keep `mode` (`audio` or `video`), `activeIndex`, `lastVolume`, and transient error state on the instance.
- `setMode` pauses the previous media, switches hidden/tab/`aria-selected` state, renders the new playlist, and selects index 0 without autoplay.
- `selectTrack` validates the index, resets the current media, assigns `src`, calls `load()`, updates title/playlist state, and optionally calls `play()`.
- `play()` awaits `media.play()` and converts rejection into `setStatus('Klik op Afspelen om audio of video te starten.', { error: true })`.
- `stop()` pauses, sets `currentTime = 0` when seekable, renders time, and reports `Gestopt`.
- Seek uses a 0-1000 ratio and ignores non-finite duration.
- Volume uses a 0-100 input mapped to 0-1; mute preserves the previous non-zero volume.
- On `loadedmetadata`, update duration; on `timeupdate`, update elapsed and seek; on `waiting`, report buffering; on `playing`, report playing; on `pause`, report paused unless ended; on `ended`, automatically select and play the next track; on `error`, show the current title and keep navigation active.
- `handleKeydown` ignores `isEditableTarget(event.target)` and maps the exact codes asserted by the test.
- `handleParentMessage` requires `event.origin === window.location.origin` and `event.source === window.parent`; `mnrv-media:pause` calls `pause()`, and `mnrv-media:close` calls `stop()`, clears error styling, and reports `Gereed`.
- Instantiate one controller after `DOMContentLoaded` and expose it as `window.mnrvMediaPlayer` for browser acceptance only.

- [ ] **Step 5: Run core, structure, and existing tests**

```powershell
node --test tests/mediaplayer-core.test.mjs tests/mediaplayer-structure.test.mjs tests/reported-diagnostics.test.mjs
git diff --check
```

Expected: all tests pass and no whitespace errors.

- [ ] **Step 6: Commit the native iframe player**

```powershell
git add -- mediaplayer.html assets/js/mediaplayer.js tests/mediaplayer-structure.test.mjs
git commit -m "feat: replace legacy media player runtime"
```

---

### Task 3: Integrate media lifecycle with the retro desktop and remove dead production assets

**Files:**
- Modify: `index.html`
- Modify: `js/main.js`
- Modify: `css/style.css`
- Create: `tests/retro-app-lifecycle.test.mjs`
- Delete after verification: `assets/audio/mediaplayer.bundle.js`
- Delete after verification: `assets/audio/win95-media-player-master/`

**Interfaces:**
- Produces: `sendWindowLifecycle(win, action)` in `js/main.js` for media now and Freedoom later.
- Consumed by: the Freedoom retro integration plan, which adds `data-app-kind="game"`.

- [ ] **Step 1: Write the failing lifecycle test**

Create `tests/retro-app-lifecycle.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [indexHtml, mainJs, css] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../js/main.js', import.meta.url), 'utf8'),
  readFile(new URL('../css/style.css', import.meta.url), 'utf8'),
]);

test('media iframe declares its app kind and required capabilities', () => {
  assert.match(indexHtml, /id="mediaplayer-window"[^>]*data-app-kind="media"/);
  assert.match(indexHtml, /class="mediaplayer-frame"[^>]*allow="autoplay; fullscreen"/);
});

test('desktop lifecycle sends origin-scoped pause and close messages', () => {
  assert.match(mainJs, /function sendWindowLifecycle\(win, action\)/);
  assert.match(mainJs, /window\.location\.origin/);
  assert.match(mainJs, /sendWindowLifecycle\(win, 'pause'\)/);
  assert.match(mainJs, /sendWindowLifecycle\(win, 'close'\)/);
});

test('media window can fit a 320px viewport', () => {
  const mobile = css.match(/@media\s*\(max-width:\s*480px\)[\s\S]*?\.mediaplayer-window\s*\{([^}]*)\}/);
  assert.ok(mobile, 'missing mobile media window rule');
  assert.match(mobile[1], /min-width\s*:\s*0/);
  assert.match(mobile[1], /width\s*:\s*calc\(100vw\s*-\s*8px\)/);
});
```

- [ ] **Step 2: Run and confirm the lifecycle failures**

```powershell
node --test tests/retro-app-lifecycle.test.mjs
```

Expected: failures for missing `data-app-kind`, lifecycle helper, and mobile override.

- [ ] **Step 3: Add the reusable parent lifecycle bridge**

In `index.html`, add `data-app-kind="media"` to `#mediaplayer-window` and set its iframe attributes to:

```html
<iframe class="mediaplayer-frame" src="mediaplayer.html" title="Media Player" loading="lazy" allow="autoplay; fullscreen"></iframe>
```

In `js/main.js`, add:

```js
function sendWindowLifecycle(win, action) {
  const kind = win?.dataset?.appKind;
  const frame = win?.querySelector('iframe');
  if (!kind || !frame?.contentWindow) return;
  frame.contentWindow.postMessage({ type: `mnrv-${kind}:${action}` }, window.location.origin);
}
```

Call `sendWindowLifecycle(win, 'pause')` at the beginning of `minimizeWindow`. Call `sendWindowLifecycle(win, 'close')` at the beginning of `hideWindow`. Keep the existing direct parent `<video>` pause/reset fallback for non-iframe windows.

Add this mobile rule under the existing `@media (max-width: 480px)` block:

```css
.mediaplayer-window {
  left: 4px;
  top: 4px;
  width: calc(100vw - 8px);
  height: min(520px, calc(100vh - 42px));
  min-width: 0;
  min-height: 260px;
}
```

- [ ] **Step 4: Run automated checks**

```powershell
node --test tests/mediaplayer-core.test.mjs tests/mediaplayer-structure.test.mjs tests/retro-app-lifecycle.test.mjs tests/reported-diagnostics.test.mjs
git diff --check
```

Expected: all tests pass.

- [ ] **Step 5: Run browser acceptance before deleting the legacy bundle**

Using a local HTTP server and `agent-browser`, verify:

- each of the 9 audio and 4 video entries loads metadata;
- play/pause, stop, seek, previous/next, volume, mute, tabs, and keyboard shortcuts;
- a missing-source test injected through browser evaluation shows a recoverable error;
- minimize pauses with time retained; restore stays paused; close resets to zero; reopen is clean;
- maximize, resize, and 320/375/768/1440 viewport layouts;
- no `pageerror`, unhandled rejection, or console error.

- [ ] **Step 6: Remove dead production assets only after acceptance passes**

Delete `assets/audio/mediaplayer.bundle.js` and `assets/audio/win95-media-player-master/`. Confirm no production or test reference remains:

```powershell
rg -n "mediaplayer\.bundle|win95-media-player-master|React95|@cassette" .
```

Expected: no matches outside Git history or documentation that explicitly explains the removed root cause.

- [ ] **Step 7: Re-run the complete media gate and commit**

```powershell
node --test tests/mediaplayer-core.test.mjs tests/mediaplayer-structure.test.mjs tests/retro-app-lifecycle.test.mjs tests/reported-diagnostics.test.mjs
git diff --check
git add -- index.html js/main.js css/style.css tests/retro-app-lifecycle.test.mjs assets/audio/mediaplayer.bundle.js assets/audio/win95-media-player-master
git commit -m "feat: integrate complete retro media player"
```

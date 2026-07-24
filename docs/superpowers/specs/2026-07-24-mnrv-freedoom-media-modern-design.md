# MNRV Freedoom, Media Player, and Modern Page Design

Date: 2026-07-24  
Status: approved in conversation  
Target: `C:\Users\Thinkpat\Desktop\MNRV-git-sync`

## Objective

Deliver three coordinated improvements without destabilizing the existing static MNRV website:

1. Remove the complete `.over-team` block from the modern page and replace visible section separators with one continuous color flow.
2. Add a locally hosted, playable Freedoom 0.13.0 Phase 1 experience to the retro desktop, with Episodes 1-4 available as equal launcher choices, desktop keyboard/mouse controls, and an optional mobile touch overlay.
3. Replace the broken legacy media-player runtime with a complete, dependable Windows 95-styled player.

The result must remain a static, same-origin website. Each surface must be isolated so that a failure in the game or media player cannot break the retro desktop or modern page.

## Global Constraints

- Use the official Freedoom 0.13.0 release and its `freedoom1.wad` content.
- Use the existing `DOOM/DOOM.png` file directly as the desktop icon, Start-menu icon, game-window icon, and launcher branding. Do not replace, regenerate, or silently substitute this logo.
- Do not publish original commercial DOOM WADs, music, sound effects, or other proprietary game data.
- Host the game runtime, WAD package, media, scripts, licenses, and credits locally; do not use remote gameplay iframes or CDN runtime dependencies.
- Preserve the existing modern-page hero, services, governance, contact, modal, navigation, and footer content unless explicitly covered below.
- Remove Andrew, Dave, Arpit, and Rick only through deletion of the complete `.over-team` section and its now-unused CSS. The existing `.over-hero` remains.
- Do not leave visible horizontal divider lines between the remaining Over subsections.
- Desktop game input remains keyboard and mouse. Touch controls are optional, mobile-only, and user-hideable.
- DOM owns menus, status, touch controls, and accessible text. The engine owns the game canvas and original in-game HUD.
- Use a single active game WebGL/canvas runtime. Do not place a competing Three.js renderer over the live game.
- Lazy-load the game so normal landing-page performance is unaffected before the user opens it.
- All functionality must work from a static HTTP server and from the intended production host.

## Selected Technical Approach

Use a pinned, locally built WebAssembly port based on `cloudflare/doom-wasm` / Chocolate Doom rather than modifying the legacy WebDOOM data package. The selected runtime reads WAD-backed music and sound effects and avoids the old WebDOOM bundle's hard-coded package offsets and separately copied original audio.

The runtime is vendored or built reproducibly from an exact upstream revision. Generated runtime artifacts are committed only when required by the static hosting model, along with matching source and license obligations.

Freedoom Phase 1 includes four episodes. The MNRV launcher presents Episodes 1-4 as equal primary choices from the unmodified official `freedoom1.wad`.

## Freedoom Game Design

### Player experience

- Entry point: a Freedoom desktop icon and Start-menu item in the retro environment, both using `DOOM/DOOM.png`.
- Container: a large, draggable, resizable Windows 98-style window with maximize, minimize, close, and fullscreen behavior.
- Boot flow: branded retro loading surface, real asset progress, recoverable error state, episode selection, and a deliberate Start action that unlocks browser audio.
- Core loop: choose Episode 1-4, start the first map or continue a save, move/explore/fight, receive the engine's original feedback, save or pause, and resume or restart.
- Session recovery: saves and settings survive a page reload through IndexedDB-backed storage.

### Runtime isolation

The game runs in a same-origin iframe. This contains Emscripten globals, SDL listeners, pointer lock, fullscreen styles, audio, and engine lifecycle away from the desktop document.

The iframe source is assigned only on first open. Parent and child communicate through a narrowly scoped `postMessage` protocol:

- `mnrv-game:pause`: pause audio/game input and release pointer lock.
- `mnrv-game:resume`: restore a paused session after an explicit user action.
- `mnrv-game:shutdown`: flush saves, stop audio, release input, and prepare for reset.
- `mnrv-game:ready`: runtime initialized and available.
- `mnrv-game:error`: structured recoverable failure for the parent status surface.

Minimizing pauses while retaining the current position. Closing flushes persistent data, stops the runtime, clears the iframe, and guarantees a clean boot on reopen. Restarting reloads the iframe rather than attempting to re-enter Emscripten's main loop.

### Input map

Desktop:

- Engine-native keyboard movement and actions.
- Mouse look/turn and primary fire.
- Pointer lock begins only from a user click inside the game.
- `Escape` pauses and releases pointer lock.

Mobile touch overlay:

- Left-bottom virtual joystick: forward, backward, strafe left, strafe right.
- Right-side drag surface: relative horizontal aiming/turning.
- Large bottom-right fire button.
- Use/interact button above fire.
- Weapon switching on the right edge through explicit previous/next or numbered actions.
- Pause button in the top safe area.
- Controls synthesize the engine's existing keyboard and mouse actions in one input adapter.
- Touch controls appear only for coarse-pointer/touch devices, can be hidden, and respect safe-area insets.
- Interactive targets are at least 48 by 48 CSS pixels and never occupy the central playfield.

Landscape is the preferred mobile play mode. Portrait remains recoverable through a compact orientation prompt and a contained, letterboxed game surface; the page must never become unusable or overflow horizontally.

### UI and visual direction

- Windows 98 shell outside the iframe; dark industrial Freedoom loading surface inside it.
- Keep the live playfield low-chrome: the engine HUD plus only necessary touch controls and transient hints.
- Full control instructions live behind a help or pause surface.
- Loading, pause, settings, and failure surfaces gate game/camera input explicitly.
- Non-essential transitions respect `prefers-reduced-motion`.
- A second Three.js context is intentionally excluded because it would compete for GPU resources and pointer/touch ownership. Atmospheric boot treatment uses lightweight CSS/DOM only.

### Game file boundaries

Expected structure:

```text
doom/
  index.html
  css/game-shell.css
  js/bootstrap.js
  js/input-actions.js
  js/touch-overlay.js
  js/save-store.js
  engine/<pinned generated runtime artifacts>
  data/freedoom1.wad
  licenses/freedoom/
  licenses/engine/
```

Retro desktop changes are limited to `index.html`, `css/style.css`, and `js/main.js` plus new game assets. Existing FreeCell and Minesweeper routes remain unchanged.

## Media Player Design

### Root cause and replacement decision

The current React 16/Cassette/React95 bundle crashes because source modules read `resize-observer-polyfill` through `.default` although its CommonJS package exports the constructor directly. Components then unconditionally disconnect an observer that was never created. A minimal import patch would only remove the crash; it would not add stop, volume, mute, robust errors, lifecycle control, or maintainability.

Replace the runtime with a dependency-free controller built on native `HTMLAudioElement` and `HTMLVideoElement`, while retaining the Windows 95 visual language.

### Required functionality

- Audio and video tabs with keyboard-accessible tab semantics.
- Nine existing local MP3 tracks.
- Four existing local video assets as the dependable video set.
- Remote video entries are excluded from the dependable initial playlist so playback does not rely on third-party availability or CORS behavior.
- Track selection, previous, next, play, pause, stop, seek, elapsed time, duration, volume, mute, loading, buffering, playing, paused, ended, and error states.
- Stop pauses and resets playback to zero.
- Track errors are recoverable and do not disable the remaining playlist.
- Keyboard shortcuts: Space play/pause, Left/Right seek, Up/Down volume, `M` mute, Home stop. Shortcuts do not override focused form controls.
- Accessible names, visible focus, `aria-selected`, meaningful range values, and a polite live-status region.
- No horizontal overflow at 320 CSS pixels; touch targets remain usable.

### Parent-window lifecycle

The media iframe uses a small `postMessage` bridge:

- Minimize pauses and preserves time.
- Restore leaves playback paused until the user resumes.
- Close stops, resets, and clears transient error state.
- Resize/maximize never recreates the media element or loses state.

Expected changes:

```text
mediaplayer.html
assets/js/mediaplayer.js
index.html
js/main.js
css/style.css
```

The old bundle and vendor tree are removed only after the replacement passes browser acceptance tests and no remaining production references exist.

## Modern Page Design

Remove the complete `.over-team` HTML node, including its label, both rows, and all four people. Remove all team-only CSS and responsive overrides.

Keep `.over-hero`, including its existing image and copy. The requested removal targets the team block rather than the complete Over hero.

Remove the visible section-divider rules from:

- `.over-builds`
- `.over-ai-gov`
- `.over-closing`

Replace border-driven separation with responsive vertical rhythm using `clamp()` values. Remove the now-redundant top padding introduced solely to clear divider lines.

Keep the existing scroll-driven body gradient. Refine `.over::before` into a soft overlay that is transparent at its top and bottom, darkest only through the text-heavy middle, and optionally uses subtle radial color accents. This preserves text contrast without producing a rectangular dark plate against Contact or the footer.

No new JavaScript or wrapper is needed. The final transitions must remain smooth after the page height changes and must be reviewed at the beginning, middle, and end of the scroll range.

## Error Handling

Game:

- Unsupported WebAssembly/WebGL: explain the limitation and return safely to the desktop.
- WAD, WASM, or package download failure: name the failed resource, offer Retry, and never leave a blank canvas.
- WebGL context loss: pause and offer a controlled reload.
- IndexedDB failure: continue with a visible warning that saves are session-only.
- Audio suspension: request a user gesture instead of repeatedly throwing playback errors.
- Parent close/minimize: always release pointer lock and active keys to prevent stuck movement.

Media player:

- Missing or undecodable source: show a per-track error and retain navigation.
- Rejected autoplay: remain paused with an actionable status.
- Metadata timeout or unavailable duration: keep controls stable and show an unknown duration rather than `NaN`.
- Parent lifecycle messages are origin-checked and ignored when malformed.

Modern page:

- Maintain minimum readable contrast over all scroll-gradient positions.
- Preserve focus order, navigation targets, modal behavior, and reduced-motion handling.

## Performance, Security, and Licensing

- Lazy-load the game iframe and large assets only when requested.
- Serve `.wasm` with `application/wasm`; apply long-lived immutable caching only to content-hashed generated artifacts.
- Avoid a second WebGL context and pause all game work when the window is minimized or hidden.
- Keep touch listeners scoped to the iframe and use passive listeners unless preventing scrolling is required inside a control surface.
- Validate `postMessage` origin and message shape in both directions.
- Do not load executable content from the supplied Windows `.exe`.
- Do not publish the legacy `DOOM.zip`, its original Doom WAD/audio, or unneeded `doom2` artifacts.
- Include the Freedoom modified-BSD notice and credits.
- Include the selected engine/WebAssembly port's GPL notices and corresponding-source obligations.
- Attribute trademarks accurately and state that MNRV's integration is not endorsed by the original game publishers.

## Verification Plan

### Automated structural tests

- Modern page contains no `.over-team`, team-person markup, or team-only CSS.
- Remaining Over subsections have no top/bottom divider borders.
- Desktop and Start-menu launch targets exist, are keyboard accessible, and reference the exact `DOOM/DOOM.png` asset.
- Parent/iframe lifecycle message names and origin validation are covered.
- Media state transitions and keyboard mappings are unit-tested around a controllable media adapter.
- Static references resolve and no original commercial DOOM assets enter the deploy set.

### Game browser acceptance

- Cold-load the retro desktop without fetching game payloads.
- Open the game and observe real loading progress and a useful ready state.
- Start E1M1, E2M1, E3M1, and E4M1.
- Verify keyboard movement, mouse input, fire, use, weapon switching, pause, and pointer-lock release.
- Verify touch movement, aim, fire, use, weapon switching, hide/show controls, and safe-area layout.
- Save, reload the page, and load the saved game.
- Minimize, restore, close, reopen, restart, maximize, and fullscreen without stuck input, continued background audio, blank canvas, or console errors.
- Confirm game audio comes only from Freedoom content.

### Media browser acceptance

- Every local audio and video source loads metadata.
- Time advances after a user gesture.
- Track select, previous, next, play, pause, stop, seek, volume, mute, ended, and error recovery work.
- Minimize preserves time while paused; close resets; restore/reopen are deterministic.
- Missing-source fixture produces a visible error without page or console failure.

### Responsive and accessibility acceptance

- Test 320, 375, 768, and 1440 CSS pixel widths.
- No horizontal overflow or overlapping game/media controls.
- No visible hard color breaks at Services to Over, Over to Contact, or Contact to footer.
- Keyboard navigation, visible focus, names/roles/values, live status, color contrast, and reduced motion pass.
- The central game area remains readable and touch targets remain at least 48 by 48 CSS pixels.

### Tools and quality gates

- Use test-driven development for each implementation task.
- Use the Ralph loop for bounded implementation/test/refinement iterations.
- Use fresh implementation and review agents sequentially per the subagent-driven-development workflow; only independent read-only investigations run in parallel.
- Run a final whole-branch review after task-level spec and quality reviews pass.
- Verify the live flows through `agent-browser`, including screenshots and console/page-error inspection.
- Run `git diff --check`, all repository tests, static validation, and the final asset/license audit before delivery.

## Delivery Boundaries

This design does not add multiplayer, online accounts, cloud saves, analytics, monetization, custom Freedoom levels, or a generalized emulator platform. Those are separate projects.

Implementation is complete only when all three requested workstreams pass their acceptance criteria together and no unrelated files are changed.

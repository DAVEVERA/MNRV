# MNRV Modern Over Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the complete team block from `assets/mnrv.html` and make the remaining Over content flow continuously without visible separator lines or hard color breaks.

**Architecture:** Keep the existing scroll-driven body gradient and the `.over-hero`. Delete only team markup and team-only styles. Replace border-based subsection separation with responsive vertical rhythm and a transparent-ended `.over::before` overlay.

**Tech Stack:** Static HTML, CSS, Node.js built-in test runner, browser visual verification.

## Global Constraints

- Preserve the existing `.over-hero`, services, governance, contact, modal, navigation, and footer content.
- Remove the complete `.over-team` node, including Andrew, Dave, Arpit, and Rick.
- Remove team-only desktop and responsive CSS.
- Do not leave visible horizontal divider lines between `.over-builds`, `.over-ai-gov`, and `.over-closing`.
- Do not add JavaScript or a new page wrapper for this change.
- Preserve unrelated worktree changes.

---

### Task 1: Remove the team block and create continuous visual flow

**Files:**
- Create: `tests/modern-over-flow.test.mjs`
- Modify: `assets/mnrv.html`

**Interfaces:**
- Consumes: the existing `.over`, `.over::before`, `.over-hero`, `.over-builds`, `.over-ai-gov`, and `.over-closing` selectors.
- Produces: unchanged public section IDs and content structure except for removal of `.over-team`.

- [ ] **Step 1: Write the failing structural regression test**

Create `tests/modern-over-flow.test.mjs` with this content:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pagePath = new URL('../assets/mnrv.html', import.meta.url);
const html = await readFile(pagePath, 'utf8');

function cssRule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 's'));
  assert.ok(match, `missing CSS rule for ${selector}`);
  return match[1];
}

test('the complete team block and its dedicated styles are removed', () => {
  assert.doesNotMatch(html, /class="over-team(?:\s|\")/);
  assert.doesNotMatch(html, /class="over-person(?:\s|\")/);
  assert.doesNotMatch(html, /De mensen achter MNRV/);
  assert.doesNotMatch(html, /\.over-team(?:\s|\{|\-)/);
  assert.doesNotMatch(html, /\.over-person(?:\s|\{|\-)/);
});

test('remaining Over subsections use spacing instead of divider borders', () => {
  for (const selector of ['.over-builds', '.over-ai-gov', '.over-closing']) {
    const rule = cssRule(selector);
    assert.doesNotMatch(rule, /border-(?:top|bottom)\s*:/);
    assert.doesNotMatch(rule, /padding-top\s*:\s*52px/);
  }
});

test('the Over overlay fades to transparency at both edges', () => {
  const rule = cssRule('.over::before');
  assert.match(rule, /rgba\([^)]*,\s*0\)\s+0%/);
  assert.match(rule, /rgba\([^)]*,\s*0\)\s+100%/);
});

test('the hero and all post-team content remain present', () => {
  assert.match(html, /class="over-hero"/);
  assert.match(html, /class="over-builds"/);
  assert.match(html, /class="over-ai-gov"/);
  assert.match(html, /class="over-closing"/);
  assert.match(html, /id="contact"/);
});
```

- [ ] **Step 2: Run the narrow test and confirm the intended failures**

Run:

```powershell
node --test tests/modern-over-flow.test.mjs
```

Expected: failures for existing `.over-team` markup/styles, `border-top` rules, and the old overlay edge colors.

- [ ] **Step 3: Delete the team-only markup and CSS**

In `assets/mnrv.html`:

- Delete the entire `<!-- TEAM -->` block from `<div class="over-team">` through its matching closing `</div>` immediately before `<!-- WAT WE BOUWEN -->`.
- Delete the CSS block beginning with `/* TEAM — editorial rows */` through `.over-team-secondary .over-person-strength { display: none; }`.
- Delete the responsive `.over-team-row`, `.over-person`, and `.over-team-row .over-person:last-child` declarations under `@media (max-width: 900px)`.
- Delete `.over-person-name { font-size: 24px; }` under `@media (max-width: 560px)`.

Do not remove `.over-hero`, `img/andrew-dave.webp`, or any content starting at `<!-- WAT WE BOUWEN -->`.

- [ ] **Step 4: Replace hard separators with the approved overlay and spacing**

Set `.over::before` to:

```css
.over::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(circle at 18% 34%, rgba(61, 90, 110, 0.18), transparent 42%),
    radial-gradient(circle at 82% 68%, rgba(210, 120, 8, 0.10), transparent 38%),
    linear-gradient(
      to bottom,
      rgba(8, 12, 18, 0) 0%,
      rgba(8, 12, 18, 0.72) 14%,
      rgba(14, 22, 32, 0.88) 50%,
      rgba(10, 16, 24, 0.70) 86%,
      rgba(10, 16, 24, 0) 100%
    );
  pointer-events: none;
}
```

Set the spacing rules to:

```css
.over-hero {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 64px;
  align-items: start;
  margin-bottom: clamp(56px, 7vw, 88px);
}

.over-builds {
  margin-bottom: clamp(72px, 8vw, 104px);
}

.over-ai-gov {
  max-width: 680px;
  margin-bottom: clamp(72px, 8vw, 104px);
}

.over-closing {
  padding-top: 0;
}
```

Preserve all other typography, tag-pill borders, colors, and component hover states.

- [ ] **Step 5: Run structural and existing tests**

Run:

```powershell
node --test tests/modern-over-flow.test.mjs tests/reported-diagnostics.test.mjs
git diff --check
```

Expected: all tests pass and `git diff --check` produces no output.

- [ ] **Step 6: Verify the rendered page at required breakpoints**

Serve the repository with the available static server and use `agent-browser` to inspect `assets/mnrv.html` at 320, 375, 768, and 1440 CSS pixels.

Verify:

- no team cards or team headings;
- no horizontal lines above Builds, Governance, or Closing;
- no horizontal overflow;
- no hard color break at Services → Over, Over → Contact, or Contact → footer;
- the contact modal, navigation anchors, footer links, and focus states still work;
- no browser console or page errors.

- [ ] **Step 7: Commit the independently verified change**

```powershell
git add -- assets/mnrv.html tests/modern-over-flow.test.mjs
git commit -m "feat: simplify modern Over section flow"
```

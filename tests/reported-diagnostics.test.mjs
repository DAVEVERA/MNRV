import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const quickstartPath = new URL(
  '../assets/audio/win95-media-player-master/example/quickstart/quickstart.html',
  import.meta.url,
);
const examplePath = new URL(
  '../assets/audio/win95-media-player-master/example/src/index.html',
  import.meta.url,
);
const stylesheetPath = new URL('../css/style.css', import.meta.url);

const [quickstartHtml, exampleHtml, stylesheet] = await Promise.all([
  readFile(quickstartPath, 'utf8'),
  readFile(examplePath, 'utf8'),
  readFile(stylesheetPath, 'utf8'),
]);

function assertDocumentMetadata(html, label) {
  assert.match(html, /<html\b[^>]*\blang="en"[^>]*>/i, `${label}: language`);
  assert.match(html, /<meta\s+charset="utf-8"\s*\/?>/i, `${label}: charset`);
  assert.match(
    html,
    /<meta\s+name="viewport"\s+content="width=device-width,\s*initial-scale=1"\s*\/?>/i,
    `${label}: viewport`,
  );
  assert.match(html, /<title>[^<]+<\/title>/i, `${label}: title`);
  assert.match(
    html,
    /<meta\s+name="robots"\s+content="noindex,\s*nofollow"\s*\/?>/i,
    `${label}: bundled demo indexing policy`,
  );
}

function getContentMarkup(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '');
}

test('bundled demo documents declare complete metadata and stay out of search', () => {
  assertDocumentMetadata(quickstartHtml, 'quickstart');
  assertDocumentMetadata(exampleHtml, 'example');
  assert.match(getContentMarkup(quickstartHtml), /<h1\b[^>]*>[^<]+<\/h1>/i);
});

test('example images reserve space and expose text alternatives', () => {
  const imageTags = getContentMarkup(exampleHtml).match(/<img\b[^>]*>/gi) ?? [];

  assert.ok(imageTags.length > 0, 'expected example images');
  for (const imageTag of imageTags) {
    assert.match(imageTag, /\balt="[^"]+"/i, `${imageTag}: alt`);
    assert.match(imageTag, /\bwidth="\d+"/i, `${imageTag}: width`);
    assert.match(imageTag, /\bheight="\d+"/i, `${imageTag}: height`);
  }
});

test('example image styles preserve intrinsic aspect ratios responsively', () => {
  assert.match(exampleHtml, /\.header img\s*{[^}]*\bwidth:\s*auto;/s);
  assert.match(exampleHtml, /^\s*img\s*{[^}]*\bmax-width:\s*100%;[^}]*\bheight:\s*auto;/ms);
});

test('example content has sequential headings and no inline style attributes', () => {
  const contentMarkup = getContentMarkup(exampleHtml);
  const headingLevels = [...contentMarkup.matchAll(/<h([1-6])\b/gi)].map((match) =>
    Number(match[1]),
  );

  assert.ok(headingLevels.length > 1, 'expected multiple headings');
  for (let index = 1; index < headingLevels.length; index += 1) {
    assert.ok(
      headingLevels[index] <= headingLevels[index - 1] + 1,
      `heading jumps from h${headingLevels[index - 1]} to h${headingLevels[index]}`,
    );
  }
  assert.doesNotMatch(contentMarkup, /\sstyle="[^"]*"/i);
});

test('main stylesheet keeps fallbacks and removes the obsolete touch declaration', () => {
  assert.match(stylesheet, /text-wrap:\s*balance;\s*\r?\n\s*overflow-wrap:\s*anywhere;/);
  assert.match(stylesheet, /scrollbar-width:\s*none;/);
  assert.match(stylesheet, /\.apps-tabs::\-webkit-scrollbar\s*{[^}]*display:\s*none;/s);
  assert.doesNotMatch(stylesheet, /(^|[;{]\s*)-webkit-overflow-scrolling\s*:/m);
});

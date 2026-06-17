import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const artifactDir = join(process.cwd(), 'runtime-artifacts');

export async function generateArtifact({ kind, prompt, title }) {
	await mkdir(artifactDir, { recursive: true });
	const id = randomUUID();
	const safeTitle = title || (kind === 'image' ? 'Generated image' : 'Generated artifact');

	if (kind === 'image') {
		return generateImagePlaceholder(id, safeTitle, prompt);
	}

	if (kind === 'json') {
		const filename = `${id}.json`;
		const payload = JSON.stringify({ prompt, createdAt: new Date().toISOString() }, null, 2);
		await writeFile(join(artifactDir, filename), payload);
		return result(id, 'json', safeTitle, 'application/json', filename);
	}

	const filename = `${id}.html`;
	const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(safeTitle)}</title></head><body><main><h1>${escapeHtml(safeTitle)}</h1><p>${escapeHtml(prompt)}</p></main></body></html>`;
	await writeFile(join(artifactDir, filename), html);
	return result(id, 'html', safeTitle, 'text/html', filename);
}

async function generateImagePlaceholder(id, title, prompt) {
	const filename = `${id}.svg`;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
	<rect width="1200" height="800" fill="#09090d"/>
	<circle cx="600" cy="380" r="230" fill="#d5312d" opacity=".38"/>
	<circle cx="600" cy="380" r="140" fill="#fff" opacity=".08"/>
	<text x="600" y="690" text-anchor="middle" fill="#fff" font-family="Arial" font-size="34">${escapeHtml(title)}</text>
	<text x="600" y="735" text-anchor="middle" fill="#bbb" font-family="Arial" font-size="22">${escapeHtml(prompt).slice(0, 80)}</text>
</svg>`;
	await writeFile(join(artifactDir, filename), svg);
	return result(id, 'image', title, 'image/svg+xml', filename);
}

function result(id, kind, title, mimeType, filename) {
	return {
		id,
		kind,
		title,
		mimeType,
		previewUrl: `/artifacts/${filename}`,
		downloadUrl: `/artifacts/${filename}`
	};
}

function escapeHtml(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

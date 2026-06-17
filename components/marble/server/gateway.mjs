import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { generateArtifact } from './adapters/artifacts.mjs';
import { transcribeWithGoogleSpeech } from './adapters/googleSpeech.mjs';
import { synthesizeWithGoogleTts } from './adapters/googleTts.mjs';
import { respondWithConfiguredLlm } from './adapters/llm.mjs';
import { parseMultipart, readJson, sendBuffer, sendJson, sendNoContent, sendText } from './utils/http.mjs';

const projectRoot = process.cwd();
const distRoot = resolve(projectRoot, 'dist');
const publicRoot = resolve(projectRoot, 'public');
const artifactRoot = resolve(projectRoot, 'runtime-artifacts');
const port = Number(process.env.PORT || 8787);

const mimeTypes = new Map([
	['.css', 'text/css; charset=utf-8'],
	['.html', 'text/html; charset=utf-8'],
	['.js', 'text/javascript; charset=utf-8'],
	['.json', 'application/json; charset=utf-8'],
	['.jpg', 'image/jpeg'],
	['.mp3', 'audio/mpeg'],
	['.png', 'image/png'],
	['.svg', 'image/svg+xml; charset=utf-8']
]);

createServer(async (request, response) => {
	try {
		const url = new URL(request.url || '/', `http://127.0.0.1:${port}`);

		if (url.pathname === '/api/health') {
			sendJson(response, 200, {
				stt: Boolean(process.env.GOOGLE_ACCESS_TOKEN || process.env.K_SERVICE),
				tts: Boolean(process.env.GOOGLE_ACCESS_TOKEN || process.env.K_SERVICE),
				llm: process.env.LLM_PROVIDER === 'openai-compatible'
					? Boolean(process.env.LLM_ENDPOINT)
					: Boolean(process.env.GOOGLE_ACCESS_TOKEN || process.env.K_SERVICE),
				artifacts: true
			});
			return;
		}

		if (url.pathname === '/api/speech/transcribe' && request.method === 'POST') {
			const { fields, files } = await parseMultipart(request);
			const file = files.get('audio');
			if (!file) throw new Error('Missing audio file.');
			const result = await transcribeWithGoogleSpeech({
				audio: file.buffer,
				mimeType: file.type,
				language: fields.get('language') || process.env.DEFAULT_LANGUAGE || 'nl-NL'
			});
			sendJson(response, 200, result);
			return;
		}

		if (url.pathname === '/api/agent/respond' && request.method === 'POST') {
			const body = await readJson(request);
			const result = await respondWithConfiguredLlm({
				transcript: body.transcript || '',
				language: body.language || process.env.DEFAULT_LANGUAGE || 'nl-NL',
				context: Array.isArray(body.context) ? body.context : []
			});
			sendJson(response, 200, result);
			return;
		}

		if (url.pathname === '/api/speech/synthesize' && request.method === 'POST') {
			const body = await readJson(request);
			const audio = await synthesizeWithGoogleTts({
				text: body.text || '',
				language: body.language || process.env.DEFAULT_LANGUAGE || 'nl-NL'
			});
			if (!audio) {
				sendNoContent(response);
				return;
			}
			sendBuffer(response, 200, audio, 'audio/mpeg');
			return;
		}

		if (url.pathname === '/api/artifacts/generate' && request.method === 'POST') {
			const body = await readJson(request);
			const artifact = await generateArtifact({
				kind: body.kind || 'html',
				prompt: body.prompt || '',
				title: body.title
			});
			sendJson(response, 200, artifact);
			return;
		}

		if (url.pathname.startsWith('/artifacts/')) {
			const filePath = safeResolve(artifactRoot, url.pathname.replace('/artifacts/', ''));
			serveFile(response, filePath);
			return;
		}

		const staticRoot = existsSync(distRoot) ? distRoot : publicRoot;
		const requested = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
		const filePath = safeResolve(staticRoot, requested);
		serveFile(response, filePath || safeResolve(staticRoot, 'index.html'));
	} catch (error) {
		sendJson(response, 500, {
			error: error instanceof Error ? error.message : String(error)
		});
	}
}).listen(port, '0.0.0.0', () => {
	console.log(`Magical Marble gateway running on http://127.0.0.1:${port}`);
});

function safeResolve(basePath, relativePath) {
	const filePath = resolve(basePath, relativePath);
	return filePath === basePath || filePath.startsWith(`${basePath}${process.platform === 'win32' ? '\\' : '/'}`) ? filePath : null;
}

function serveFile(response, filePath) {
	if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
		sendText(response, 404, 'Not found');
		return;
	}

	const extension = extname(filePath);
	response.writeHead(200, {
		'content-type': mimeTypes.get(extension) || 'application/octet-stream'
	});
	createReadStream(filePath).pipe(response);
}

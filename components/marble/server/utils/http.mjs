export async function readJson(request) {
	const text = await readText(request);
	return text ? JSON.parse(text) : {};
}

export async function readText(request) {
	const chunks = [];
	for await (const chunk of request) {
		chunks.push(Buffer.from(chunk));
	}
	return Buffer.concat(chunks).toString('utf8');
}

export async function readBuffer(request) {
	const chunks = [];
	for await (const chunk of request) {
		chunks.push(Buffer.from(chunk));
	}
	return Buffer.concat(chunks);
}

export function sendJson(response, status, payload) {
	const body = JSON.stringify(payload);
	response.writeHead(status, {
		'content-type': 'application/json; charset=utf-8',
		'content-length': Buffer.byteLength(body)
	});
	response.end(body);
}

export function sendText(response, status, text) {
	response.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
	response.end(text);
}

export function sendNoContent(response) {
	response.writeHead(204);
	response.end();
}

export function sendBuffer(response, status, buffer, contentType) {
	response.writeHead(status, {
		'content-type': contentType,
		'content-length': buffer.length
	});
	response.end(buffer);
}

export async function parseMultipart(request) {
	const contentType = request.headers['content-type'] || '';
	const boundaryMatch = contentType.match(/boundary=(.+)$/);
	if (!boundaryMatch) {
		throw new Error('Missing multipart boundary.');
	}

	const boundary = `--${boundaryMatch[1]}`;
	const buffer = await readBuffer(request);
	const body = buffer.toString('binary');
	const parts = body.split(boundary).slice(1, -1);
	const fields = new Map();
	const files = new Map();

	for (const part of parts) {
		const clean = part.replace(/^\r\n/, '').replace(/\r\n$/, '');
		const [rawHeaders, rawContent = ''] = clean.split('\r\n\r\n');
		const disposition = rawHeaders.match(/content-disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/i);
		if (!disposition) continue;

		const name = disposition[1];
		const filename = disposition[2];
		const type = rawHeaders.match(/content-type: ([^\r\n]+)/i)?.[1] || 'application/octet-stream';
		const content = Buffer.from(rawContent, 'binary');

		if (filename) {
			files.set(name, { filename, type, buffer: content });
		} else {
			fields.set(name, content.toString('utf8'));
		}
	}

	return { fields, files };
}

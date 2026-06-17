import { getGoogleAccessToken } from '../utils/googleAuth.mjs';

export async function synthesizeWithGoogleTts({ text, language }) {
	const token = await getGoogleAccessToken();
	if (!token) {
		return null;
	}

	const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
		method: 'POST',
		headers: {
			authorization: `Bearer ${token}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			input: { text },
			voice: {
				languageCode: normalizeLanguage(language),
				ssmlGender: 'NEUTRAL'
			},
			audioConfig: {
				audioEncoding: 'MP3'
			}
		})
	});

	if (!response.ok) {
		throw new Error(`Google TTS failed: ${response.status} ${await response.text()}`);
	}

	const payload = await response.json();
	return Buffer.from(payload.audioContent, 'base64');
}

function normalizeLanguage(language) {
	if (!language) return process.env.DEFAULT_LANGUAGE || 'nl-NL';
	return language.includes('-') ? language : `${language}-${language.toUpperCase()}`;
}

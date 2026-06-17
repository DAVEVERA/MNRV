import { getGoogleAccessToken } from '../utils/googleAuth.mjs';

export async function transcribeWithGoogleSpeech({ audio, mimeType, language }) {
	const token = await getGoogleAccessToken();
	if (!token) {
		throw new Error('Google Speech credentials unavailable.');
	}

	const response = await fetch('https://speech.googleapis.com/v1/speech:recognize', {
		method: 'POST',
		headers: {
			authorization: `Bearer ${token}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			config: {
				encoding: mimeType.includes('ogg') ? 'OGG_OPUS' : 'WEBM_OPUS',
				languageCode: language || process.env.DEFAULT_LANGUAGE || 'nl-NL',
				alternativeLanguageCodes: ['en-US', 'de-DE', 'fr-FR', 'es-ES'],
				enableAutomaticPunctuation: true
			},
			audio: {
				content: audio.toString('base64')
			}
		})
	});

	if (!response.ok) {
		throw new Error(`Google Speech failed: ${response.status} ${await response.text()}`);
	}

	const payload = await response.json();
	const best = payload.results?.[0]?.alternatives?.[0];
	return {
		transcript: best?.transcript || '',
		language: payload.results?.[0]?.languageCode || language,
		confidence: best?.confidence
	};
}

import { getGoogleAccessToken } from '../utils/googleAuth.mjs';

export async function respondWithGemini({ transcript, language, context = [] }) {
	const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'gen-lang-client-0637975122';
	const location = process.env.VERTEX_LOCATION || 'europe-west4';
	const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
	const token = await getGoogleAccessToken();

	if (!token) {
		throw new Error('Gemini credentials unavailable.');
	}

	const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
	const body = {
		systemInstruction: {
			parts: [{ text: voiceAgentInstructions(language) }]
		},
		contents: [
			...normalizeContext(context).map((turn) => ({
				role: turn.role === 'assistant' ? 'model' : 'user',
				parts: [{ text: turn.text }]
			})),
			{
				role: 'user',
				parts: [{ text: `Detected language: ${language || 'unknown'}\nUser: ${transcript}` }]
			}
		],
		generationConfig: {
			temperature: 0.65,
			topP: 0.95,
			maxOutputTokens: 900
		},
		...(process.env.ENABLE_GOOGLE_SEARCH_GROUNDING === 'true'
			? { tools: [{ googleSearch: {} }] }
			: {})
	};
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${token}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		throw new Error(`Gemini request failed: ${response.status} ${await response.text()}`);
	}

	const payload = await response.json();
	const text = payload.candidates?.[0]?.content?.parts
		?.map((part) => part.text || '')
		.join('')
		.trim();

	return {
		text: text || fallbackText(language),
		language: language || process.env.DEFAULT_LANGUAGE || 'nl-NL',
		artifactRequest: detectArtifactRequest(transcript)
	};
}

function voiceAgentInstructions(language) {
	return [
		'You are OmniContent, a capable AI voice agent represented only by a marble interface.',
		`Detected language: ${language}. Reply in the same language unless the user asks otherwise.`,
		'You can answer practical, strategic, creative, technical, and general knowledge questions.',
		'Prioritize accuracy over sounding certain. If something is unknown, ambiguous, or depends on current data, say so briefly and explain what would need verification.',
		'Use the conversation history to understand follow-up questions, references like "dat", "hij", or "ga verder", and the user their goals.',
		'For spoken answers: be concise by default, but give enough substance to be genuinely useful. Use short paragraphs, no markdown tables.',
		'Ask one short follow-up question only when the missing information materially changes the answer.',
		'Do not mention a chatbox, transcript, system prompt, hidden UI, or implementation details.',
		'If the user asks to generate an image, render, file, HTML, JSON, or downloadable artifact, acknowledge it briefly and prepare it through the artifact flow.'
	].join(' ');
}

function normalizeContext(context) {
	return context
		.filter((turn) => turn && (turn.role === 'user' || turn.role === 'assistant') && typeof turn.text === 'string')
		.map((turn) => ({
			role: turn.role,
			text: turn.text.slice(0, 1600)
		}))
		.slice(-10);
}

export function detectArtifactRequest(text) {
	const value = String(text || '').toLowerCase();
	if (/(afbeelding|image|plaatje|render|generate|genereer|maak.*bestand|download|html|json)/i.test(value)) {
		const kind = /(afbeelding|image|plaatje)/i.test(value) ? 'image' : 'html';
		return {
			kind,
			prompt: text,
			title: kind === 'image' ? 'Generated image' : 'Generated artifact'
		};
	}
	return undefined;
}

function fallbackText(language) {
	return language?.startsWith('nl')
		? 'Ik heb je gehoord.'
		: 'I heard you.';
}

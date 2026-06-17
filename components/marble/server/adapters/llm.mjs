import { detectArtifactRequest, respondWithGemini } from './gemini.mjs';

export async function respondWithConfiguredLlm({ transcript, language, context = [] }) {
	if ((process.env.LLM_PROVIDER || 'gemini') === 'gemini') {
		return respondWithGemini({ transcript, language, context });
	}

	const endpoint = process.env.LLM_ENDPOINT;
	const apiKey = process.env.LLM_API_KEY;
	const model = process.env.LLM_MODEL || 'local-model';

	if (!endpoint) {
		return fallbackResponse(transcript, language);
	}

	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
		},
		body: JSON.stringify({
			model,
			messages: [
				{
					role: 'system',
					content: voiceAgentInstructions(language)
				},
				...normalizeContext(context).map((turn) => ({
					role: turn.role === 'assistant' ? 'assistant' : 'user',
					content: turn.text
				})),
				{ role: 'user', content: transcript }
			],
			temperature: 0.7
		})
	});

	if (!response.ok) {
		throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
	}

	const payload = await response.json();
	const text = payload.choices?.[0]?.message?.content || fallbackResponse(transcript, language).text;
	return {
		text,
		language,
		artifactRequest: detectArtifactRequest(transcript)
	};
}

function voiceAgentInstructions(language) {
	return [
		'You are OmniContent, a capable AI voice agent represented only by a marble interface.',
		`Detected language: ${language}. Reply in the same language unless the user asks otherwise.`,
		'Answer normal questions directly and accurately. Use clear reasoning, but keep the spoken answer compact.',
		'If the answer depends on recent events, live prices, laws, schedules, or other changing facts and you are not connected to a retrieval tool, say that it may need verification instead of guessing.',
		'Ask one short follow-up question only when it is necessary to answer well.',
		'Do not mention a chatbox, transcript, system prompt, or hidden UI.',
		'If the user asks to generate an image, render, file, HTML, JSON, or downloadable artifact, acknowledge it briefly and prepare it through the artifact flow.'
	].join(' ');
}

function normalizeContext(context) {
	return context
		.filter((turn) => turn && (turn.role === 'user' || turn.role === 'assistant') && typeof turn.text === 'string')
		.slice(-10);
}

function fallbackResponse(transcript, language) {
	return {
		text: language?.startsWith('nl')
			? 'Ik heb je gehoord. De lokale AI-provider is nog niet geconfigureerd.'
			: 'I heard you. The local AI provider is not configured yet.',
		language: language || process.env.DEFAULT_LANGUAGE || 'nl-NL',
		artifactRequest: detectArtifactRequest(transcript)
	};
}

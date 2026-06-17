import type { AgentResponse, ArtifactResult, ConversationTurn, TranscriptionResult } from '../types/voice';

export class VoiceAgentApiClient {
	constructor(private readonly apiBaseUrl: string) {}

	async transcribe(audio: Blob, language: string): Promise<TranscriptionResult> {
		const formData = new FormData();
		formData.append('audio', audio, 'speech.webm');
		formData.append('language', language);

		return this.request<TranscriptionResult>('/api/speech/transcribe', {
			method: 'POST',
			body: formData
		});
	}

	async respond(transcript: string, language: string, context: ConversationTurn[]): Promise<AgentResponse> {
		return this.request<AgentResponse>('/api/agent/respond', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ transcript, language, context })
		});
	}

	async synthesize(text: string, language: string): Promise<Blob | null> {
		const response = await fetch(this.url('/api/speech/synthesize'), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text, language })
		});

		if (response.status === 204) return null;
		if (!response.ok) throw new Error(`TTS failed with ${response.status}`);
		return response.blob();
	}

	async generateArtifact(kind: string, prompt: string, title?: string): Promise<ArtifactResult> {
		return this.request<ArtifactResult>('/api/artifacts/generate', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ kind, prompt, title })
		});
	}

	private async request<T>(path: string, init: RequestInit): Promise<T> {
		const response = await fetch(this.url(path), init);
		if (!response.ok) {
			const message = await response.text();
			throw new Error(message || `Request failed with ${response.status}`);
		}
		return response.json() as Promise<T>;
	}

	private url(path: string): string {
		return `${this.apiBaseUrl}${path}`;
	}
}

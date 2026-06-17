export type VoiceAgentState =
	| 'idle'
	| 'permission-request'
	| 'listening'
	| 'processing-audio'
	| 'thinking'
	| 'generating'
	| 'speaking'
	| 'error';

export type VoiceAgentConfig = {
	apiBaseUrl: string;
	defaultLanguage: string;
	autoDetectLanguage: boolean;
	useBrowserTTSFallback: boolean;
	debug: boolean;
	vad: {
		silenceMs: number;
		minSpeechMs: number;
		volumeThreshold: number;
		maxListenMs: number;
	};
};

export type ArtifactResult = {
	id: string;
	kind: 'image' | 'file' | 'html' | 'json' | 'text';
	title: string;
	mimeType: string;
	previewUrl?: string;
	downloadUrl: string;
};

export type TranscriptionResult = {
	transcript: string;
	language?: string;
	confidence?: number;
};

export type AgentResponse = {
	text: string;
	language: string;
	artifactRequest?: {
		kind: ArtifactResult['kind'];
		prompt: string;
		title?: string;
	};
};

export type ConversationTurn = {
	role: 'user' | 'assistant';
	text: string;
};

export type VoiceAgentRuntimeEvent =
	| { type: 'tap' }
	| { type: 'permission-granted' }
	| { type: 'permission-denied'; error: Error }
	| { type: 'audio-started' }
	| { type: 'speech-ended'; blob: Blob }
	| { type: 'transcribed'; result: TranscriptionResult }
	| { type: 'agent-response'; result: AgentResponse }
	| { type: 'artifact-start' }
	| { type: 'speaking-start' }
	| { type: 'complete' }
	| { type: 'error'; error: Error };

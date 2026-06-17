import type { VoiceAgentConfig } from './types/voice';

function boolFromEnv(value: string | undefined, fallback: boolean): boolean {
	if (value === undefined) return fallback;
	return value === 'true' || value === '1';
}

function numberFromEnv(value: string | undefined, fallback: number): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

export function getVoiceAgentConfig(): VoiceAgentConfig {
	const env = import.meta.env;

	return {
		apiBaseUrl: env.VITE_API_BASE_URL || '',
		defaultLanguage: env.VITE_DEFAULT_LANGUAGE || 'nl-NL',
		autoDetectLanguage: boolFromEnv(env.VITE_AUTO_DETECT_LANGUAGE, true),
		useBrowserTTSFallback: boolFromEnv(env.VITE_USE_BROWSER_TTS_FALLBACK, true),
		debug: boolFromEnv(env.VITE_DEBUG, false),
		vad: {
			silenceMs: numberFromEnv(env.VITE_VAD_SILENCE_MS, 1100),
			minSpeechMs: numberFromEnv(env.VITE_VAD_MIN_SPEECH_MS, 500),
			volumeThreshold: numberFromEnv(env.VITE_VAD_VOLUME_THRESHOLD, 0.026),
			maxListenMs: numberFromEnv(env.VITE_VAD_MAX_LISTEN_MS, 18000)
		}
	};
}

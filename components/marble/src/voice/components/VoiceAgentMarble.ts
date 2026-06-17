import { VoiceAgentApiClient } from '../adapters/apiClient';
import { speakWithBrowserTts } from '../adapters/browserTts';
import { startAudioCapture } from '../audio/audioInput';
import { runVad } from '../audio/vad';
import { MarbleRenderer } from '../animation/MarbleRenderer';
import { VoiceAgentStateMachine } from '../state/voiceAgentStateMachine';
import type { ConversationTurn, VoiceAgentConfig } from '../types/voice';
import { showArtifactPopout } from './artifactPopout';

type CreateVoiceAgentOptions = {
	container: HTMLElement;
	artifactRoot: HTMLElement;
	statusNode: HTMLElement;
	config: VoiceAgentConfig;
};

export function createVoiceAgentMarble(options: CreateVoiceAgentOptions): void {
	const { container, artifactRoot, statusNode, config } = options;
	const renderer = new MarbleRenderer(container);
	const machine = new VoiceAgentStateMachine();
	const api = new VoiceAgentApiClient(config.apiBaseUrl);
	let stopVad: (() => void) | null = null;
	let sessionActive = false;
	let turnRunning = false;
	const conversation: ConversationTurn[] = [];

	machine.subscribe((state) => {
		renderer.setState(state);
		statusNode.textContent = state;
		if (state === 'error') {
			window.setTimeout(() => {
				if (machine.current === 'error') machine.transition({ type: 'complete' });
			}, 1200);
		}
	});

	renderer.onTap(() => {
		if (sessionActive) {
			stopSession();
			return;
		}
		void startSession();
	});

	async function startSession(): Promise<void> {
		sessionActive = true;
		machine.transition({ type: 'tap' });

		while (sessionActive) {
			await runConversationTurn();
			if (sessionActive) {
				await wait(180);
			}
		}

		renderer.setAudioLevel(0);
		if (machine.current !== 'error') machine.transition({ type: 'complete' });
	}

	function stopSession(): void {
		sessionActive = false;
		stopVad?.();
		stopVad = null;
		renderer.setAudioLevel(0);
	}

	function remember(turn: ConversationTurn): void {
		conversation.push(turn);
		if (conversation.length > 12) {
			conversation.splice(0, conversation.length - 12);
		}
	}

	async function runConversationTurn(): Promise<void> {
		if (turnRunning) return;
		turnRunning = true;

		try {
			const capture = await startAudioCapture();
			machine.transition({ type: 'permission-granted' });
			machine.transition({ type: 'audio-started' });

			const audio = await new Promise<Blob | null>((resolve, reject) => {
				stopVad = runVad(capture, {
					...config.vad,
					onLevel: (level) => renderer.setAudioLevel(level),
					onSpeechEnd: resolve,
					onNoSpeech: () => resolve(null),
					onError: reject
				});
			});
			stopVad = null;
			renderer.setAudioLevel(0);

			if (!sessionActive || !audio) return;

			machine.transition({ type: 'speech-ended', blob: audio });
			const transcription = await api.transcribe(audio, config.defaultLanguage);
			machine.transition({ type: 'transcribed', result: transcription });

			if (!sessionActive || !transcription.transcript.trim()) return;

			const language = transcription.language || config.defaultLanguage;
			const response = await api.respond(transcription.transcript, language, conversation.slice(-10));
			machine.transition({ type: 'agent-response', result: response });
			remember({ role: 'user', text: transcription.transcript });
			remember({ role: 'assistant', text: response.text });

			if (!sessionActive) return;

			if (response.artifactRequest) {
				machine.transition({ type: 'artifact-start' });
				const artifact = await api.generateArtifact(
					response.artifactRequest.kind,
					response.artifactRequest.prompt,
					response.artifactRequest.title
				);
				showArtifactPopout(artifactRoot, artifact, () => container.focus());
			}

			if (!sessionActive) return;

			machine.transition({ type: 'speaking-start' });
			await speak(response.text, response.language);
		} catch (error) {
			sessionActive = false;
			renderer.setAudioLevel(0);
			stopVad?.();
			stopVad = null;
			machine.transition({ type: 'error', error: error instanceof Error ? error : new Error(String(error)) });
			await wait(900);
		} finally {
			turnRunning = false;
		}
	}

	async function speak(text: string, language: string): Promise<void> {
		try {
			const audio = await api.synthesize(text, language);
			if (audio) {
				await renderer.playAudioBlob(audio);
				return;
			}
		} catch (error) {
			if (!config.useBrowserTTSFallback) throw error;
		}

		if (config.useBrowserTTSFallback) {
			await speakWithBrowserTts(text, language);
		}
	}
}

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}

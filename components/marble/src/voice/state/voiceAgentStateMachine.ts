import type { VoiceAgentRuntimeEvent, VoiceAgentState } from '../types/voice';

export class VoiceAgentStateMachine {
	private state: VoiceAgentState = 'idle';
	private listeners = new Set<(state: VoiceAgentState) => void>();

	get current(): VoiceAgentState {
		return this.state;
	}

	subscribe(listener: (state: VoiceAgentState) => void): () => void {
		this.listeners.add(listener);
		listener(this.state);
		return () => this.listeners.delete(listener);
	}

	transition(event: VoiceAgentRuntimeEvent): VoiceAgentState {
		switch (event.type) {
			case 'tap':
				this.set('permission-request');
				break;
			case 'permission-granted':
			case 'audio-started':
				this.set('listening');
				break;
			case 'speech-ended':
				this.set('processing-audio');
				break;
			case 'transcribed':
				this.set('thinking');
				break;
			case 'agent-response':
				this.set(event.result.artifactRequest ? 'generating' : 'speaking');
				break;
			case 'artifact-start':
				this.set('generating');
				break;
			case 'speaking-start':
				this.set('speaking');
				break;
			case 'complete':
				this.set('idle');
				break;
			case 'permission-denied':
			case 'error':
				this.set('error');
				break;
		}

		return this.state;
	}

	private set(next: VoiceAgentState): void {
		if (this.state === next) return;
		this.state = next;
		for (const listener of this.listeners) {
			listener(next);
		}
	}
}

import type { AudioCaptureSession } from './audioInput';

type VadOptions = {
	silenceMs: number;
	minSpeechMs: number;
	volumeThreshold: number;
	maxListenMs: number;
	onLevel: (level: number) => void;
	onSpeechEnd: (blob: Blob) => void;
	onError: (error: Error) => void;
	onNoSpeech?: () => void;
};

export function runVad(session: AudioCaptureSession, options: VadOptions): () => void {
	const chunks: BlobPart[] = [];
	let startedAt = 0;
	let lastSpeechAt = 0;
	let speechDetected = false;
	let frame = 0;
	let stopped = false;

	session.mediaRecorder.addEventListener('dataavailable', (event) => {
		if (event.data.size > 0) chunks.push(event.data);
	});

	session.mediaRecorder.addEventListener('stop', () => {
		const blob = new Blob(chunks, { type: session.mediaRecorder.mimeType || 'audio/webm' });
		if (speechDetected && blob.size > 0) {
			options.onSpeechEnd(blob);
		} else if (options.onNoSpeech) {
			options.onNoSpeech();
		} else {
			options.onError(new Error('No speech detected.'));
		}
	});

	session.mediaRecorder.start(250);
	startedAt = performance.now();
	lastSpeechAt = startedAt;

	function tick(now: number): void {
		if (stopped) return;
		const level = session.getLevel();
		options.onLevel(level);

		if (level >= options.volumeThreshold) {
			lastSpeechAt = now;
			if (now - startedAt >= options.minSpeechMs) {
				speechDetected = true;
			}
		}

		if (speechDetected && now - lastSpeechAt >= options.silenceMs) {
			stop();
			return;
		}

		if (!speechDetected && now - startedAt >= options.maxListenMs) {
			stop();
			return;
		}

		frame = requestAnimationFrame(tick);
	}

	function stop(): void {
		if (stopped) return;
		stopped = true;
		cancelAnimationFrame(frame);
		session.stop();
	}

	frame = requestAnimationFrame(tick);
	return stop;
}

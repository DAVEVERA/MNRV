export type AudioCaptureSession = {
	mediaRecorder: MediaRecorder;
	stream: MediaStream;
	audioContext: AudioContext;
	analyser: AnalyserNode;
	getLevel: () => number;
	stop: () => void;
};

export async function startAudioCapture(): Promise<AudioCaptureSession> {
	const stream = await navigator.mediaDevices.getUserMedia({
		audio: {
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true
		}
	});

	const audioContext = new AudioContext();
	if (audioContext.state === 'suspended') {
		await audioContext.resume();
	}
	const source = audioContext.createMediaStreamSource(stream);
	const analyser = audioContext.createAnalyser();
	analyser.fftSize = 512;
	analyser.smoothingTimeConstant = 0.72;
	source.connect(analyser);

	const mediaRecorder = new MediaRecorder(stream, {
		mimeType: getSupportedMimeType()
	});
	const data = new Uint8Array(analyser.fftSize);

	return {
		mediaRecorder,
		stream,
		audioContext,
		analyser,
		getLevel: () => {
			analyser.getByteTimeDomainData(data);
			let sum = 0;
			for (const value of data) {
				const centered = (value - 128) / 128;
				sum += centered * centered;
			}
			return Math.sqrt(sum / data.length);
		},
		stop: () => {
			if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
			stream.getTracks().forEach((track) => track.stop());
			void audioContext.close();
		}
	};
}

function getSupportedMimeType(): string {
	const candidates = [
		'audio/webm;codecs=opus',
		'audio/webm',
		'audio/ogg;codecs=opus'
	];

	return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || '';
}

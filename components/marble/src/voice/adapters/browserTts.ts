export async function speakWithBrowserTts(text: string, language: string): Promise<void> {
	if (!('speechSynthesis' in window)) {
		throw new Error('Browser SpeechSynthesis is unavailable.');
	}

	window.speechSynthesis.cancel();

	await new Promise<void>((resolve, reject) => {
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = language;
		utterance.onend = () => resolve();
		utterance.onerror = () => reject(new Error('Browser SpeechSynthesis failed.'));
		window.speechSynthesis.speak(utterance);
	});
}

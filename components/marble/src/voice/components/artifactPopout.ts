import type { ArtifactResult } from '../types/voice';

export function showArtifactPopout(root: HTMLElement, artifact: ArtifactResult, onClose: () => void): void {
	root.replaceChildren();

	const backdrop = document.createElement('div');
	backdrop.className = 'artifact-popout';
	backdrop.setAttribute('role', 'dialog');
	backdrop.setAttribute('aria-modal', 'true');
	backdrop.setAttribute('aria-label', artifact.title);

	const panel = document.createElement('section');
	panel.className = 'artifact-popout__panel';

	const preview = document.createElement('div');
	preview.className = 'artifact-popout__preview';

	if (artifact.kind === 'image' && artifact.previewUrl) {
		const image = document.createElement('img');
		image.src = artifact.previewUrl;
		image.alt = artifact.title;
		preview.append(image);
	} else if (artifact.previewUrl) {
		const iframe = document.createElement('iframe');
		iframe.src = artifact.previewUrl;
		iframe.title = artifact.title;
		preview.append(iframe);
	} else {
		preview.textContent = artifact.title;
	}

	const actions = document.createElement('div');
	actions.className = 'artifact-popout__actions';

	const download = document.createElement('a');
	download.className = 'artifact-popout__button';
	download.href = artifact.downloadUrl;
	download.download = safeDownloadName(artifact);
	download.textContent = 'Download';

	const close = document.createElement('button');
	close.className = 'artifact-popout__button artifact-popout__button--ghost';
	close.type = 'button';
	close.textContent = 'Close';
	close.addEventListener('click', () => {
		root.replaceChildren();
		onClose();
	});

	actions.append(download, close);
	panel.append(preview, actions);
	backdrop.append(panel);
	root.append(backdrop);
	close.focus();
}

function safeDownloadName(artifact: ArtifactResult): string {
	const extension = artifact.mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'txt';
	return `${artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'artifact'}.${extension}`;
}

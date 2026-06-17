const metadataTokenUrl = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

export async function getGoogleAccessToken() {
	if (process.env.GOOGLE_ACCESS_TOKEN) {
		return process.env.GOOGLE_ACCESS_TOKEN;
	}

	try {
		const response = await fetch(metadataTokenUrl, {
			headers: { 'Metadata-Flavor': 'Google' },
			signal: AbortSignal.timeout(1500)
		});
		if (!response.ok) return null;
		const payload = await response.json();
		return payload.access_token || null;
	} catch {
		return null;
	}
}

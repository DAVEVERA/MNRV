import './styles/marble.css';
import { createVoiceAgentMarble } from './voice/components/VoiceAgentMarble';
import { getVoiceAgentConfig } from './voice/config';

const container = document.getElementById('marble-scene');
const artifactRoot = document.getElementById('artifact-root');
const statusNode = document.getElementById('voice-status');

if (!container || !artifactRoot || !statusNode) {
	throw new Error('Voice agent mount nodes are missing.');
}

createVoiceAgentMarble({
	container,
	artifactRoot,
	statusNode,
	config: getVoiceAgentConfig()
});

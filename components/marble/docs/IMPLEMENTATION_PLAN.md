# Marble AI Voice Agent Implementation Plan

## Goal

Upgrade the existing marble visual into a marble-only AI voice agent interface. The marble remains the central and only permanent UI element. It listens, thinks, generates, speaks, and errors through state-driven animation rather than a chatbox or text panel.

This plan is derived from `src/greatergoal.txt` plus the later product decision that Google Cloud services may be used as the default hosted stack.

## Product Requirements

- Preserve the current marble identity, shader feel, transparent background, and centered WebGL interface.
- Add clear visual states: `idle`, `permission-request`, `listening`, `processing-audio`, `thinking`, `generating`, `speaking`, and `error`.
- Request microphone permission only after a user tap/click.
- Use live microphone volume to animate the listening state.
- Stop recording automatically after silence via VAD.
- Detect or carry language from STT metadata and answer in the same language.
- Keep frontend provider-agnostic: provider logic stays behind adapters and server endpoints.
- Add no chatbox, transcript panel, or persistent assistant UI.
- Show a temporary on-page pop-out only when the user asks for an image, render, file, or other downloadable artifact.
- Keep audio and secrets private: no credentials in frontend, no permanent audio storage by default.

## Architecture Decisions

- Frontend stack: Vite + TypeScript + Three.js.
- Permanent UI: marble only.
- Deployment target: Cloud Run service built by Cloud Build.
- Gateway: Node server serving the built frontend and `/api/*` endpoints.
- STT default: Google Cloud Speech-to-Text adapter server-side.
- TTS default: Google Cloud Text-to-Speech adapter server-side, with Browser SpeechSynthesis fallback.
- LLM: configurable OpenAI-compatible endpoint through the gateway.
- Artifact generation: gateway adapter returning preview/download URLs; Vertex AI Imagen can be wired behind the adapter later.

## Module Plan

- `src/voice/components/VoiceAgentMarble.ts`
  - Orchestrates tap-to-talk flow.
  - Owns state transitions, adapter calls, TTS playback, and artifact pop-out trigger.
- `src/voice/animation/MarbleRenderer.ts`
  - Preserves the marble shader and halo.
  - Adds state and audio-level driven animation without changing the visual identity.
- `src/voice/state/voiceAgentStateMachine.ts`
  - Encodes the voice-agent state transitions.
- `src/voice/audio/audioInput.ts`
  - Handles microphone permission, MediaRecorder, Web Audio analyser, and level calculation.
- `src/voice/audio/vad.ts`
  - Detects speech and silence, then stops recording automatically.
- `src/voice/adapters/*`
  - Browser/client adapters for API calls and SpeechSynthesis fallback.
- `server/gateway.mjs`
  - Serves the built frontend and routes API calls.
- `server/adapters/*`
  - Google Speech, Google TTS, LLM, and artifact provider adapters.

## API Contract

- `GET /api/health`
  - Reports availability for STT, TTS, LLM, and artifact generation.
- `POST /api/speech/transcribe`
  - Accepts multipart audio and returns transcript, language, and confidence.
- `POST /api/agent/respond`
  - Accepts transcript and language, returns response text and optional artifact request.
- `POST /api/speech/synthesize`
  - Returns playable audio, or `204` to tell the frontend to use browser TTS fallback.
- `POST /api/artifacts/generate`
  - Generates or prepares a downloadable artifact and returns preview/download URLs.

## Acceptance Criteria

- `npm run check` passes.
- `npm run build` passes.
- `npm audit --omit=dev` reports no vulnerabilities.
- Gateway serves `/` successfully.
- Gateway returns valid responses for `/api/health`, `/api/agent/respond`, `/api/speech/synthesize`, and `/api/artifacts/generate`.
- No WordPress, shortcode, PHP, or legacy runtime files remain.
- No chatbox or persistent transcript UI is present.
- Artifact pop-out is the only additional visible UI beyond the marble.

## Current Implementation Status

- Vite + TypeScript migration: implemented.
- Marble renderer preservation: implemented.
- State machine: implemented.
- Audio capture + analyser: implemented.
- VAD: implemented.
- Browser/client API adapters: implemented.
- Node gateway: implemented.
- Google Speech and Google TTS server adapters: implemented.
- Configurable LLM adapter: implemented.
- Artifact pop-out + placeholder artifact adapter: implemented.
- Cloud Run Dockerfile and Cloud Build config: implemented.

## Known Follow-Ups

- Perform a real browser visual QA pass once browser tooling is available.
- Configure Cloud Run service account permissions for Google Speech-to-Text and Text-to-Speech.
- Configure `LLM_ENDPOINT`, `LLM_API_KEY`, `LLM_MODEL`, and `DEFAULT_LANGUAGE` in deployment.
- Replace placeholder artifact generation with Vertex AI Imagen or another approved provider when credentials and product policy are finalized.

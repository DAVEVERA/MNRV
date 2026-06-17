# Project Treemap

```text
marble/
|-- public/
|   |-- assets/
|   |   `-- textures/           # Runtime texture maps for the marble shader
|-- src/
|   |-- main.ts                 # Browser entrypoint
|   |-- voice/                  # Voice agent modules, adapters, state, animation
|   `-- styles/
|       `-- marble.css          # Runtime styling for the standalone scene
|-- server/
|   |-- gateway.mjs             # Cloud Run Node gateway
|   |-- adapters/               # Google/LLM/artifact adapters
|   `-- utils/                  # HTTP and auth helpers
|-- docs/
|   |-- TREEMAP.md              # This structure reference
|   |-- IMPLEMENTATION_PLAN.md  # Voice-agent goal, plan, and acceptance criteria
|   `-- knowledge/              # Source-aware MNRV knowledge base notes
|-- index.html                  # Vite HTML entrypoint
|-- Dockerfile                  # Cloud Run container
|-- cloudbuild.yaml             # Cloud Build deploy pipeline
|-- package.json                # npm scripts, no runtime dependencies
|-- package-lock.json           # Locked npm dependency graph
|-- README.md                   # Setup and usage
|-- .gitignore
`-- .gitattributes
```

## Structure Rules

- `public/` contains files that are served directly by the local web server.
- `src/` contains first-party application code.
- `server/` contains the local/Cloud Run gateway and provider adapters.
- Third-party browser libraries come from npm packages, not checked-in vendor scripts.

## Runtime Paths

- Page: `/`
- Frontend entry: `/src/main.ts` during Vite dev, bundled into `dist/` for Cloud Run
- Textures: `/assets/textures/noise.jpg`, `/assets/textures/noise3D.jpg`
- API gateway: `/api/health`, `/api/speech/transcribe`, `/api/agent/respond`, `/api/speech/synthesize`, `/api/artifacts/generate`

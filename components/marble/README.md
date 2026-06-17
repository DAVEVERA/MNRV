# Magical Marble

Standalone interactieve 3D-marmer voor gebruik als frontend visual module.

## Structuur

```text
.
|-- public/
|   |-- assets/
|   |   `-- textures/
|-- src/
|   |-- main.ts
|   |-- voice/
|   `-- styles/
|       `-- marble.css
|-- server/
|   `-- gateway.mjs
|-- docs/
|   `-- TREEMAP.md
|-- index.html
|-- package.json
|-- README.md
`-- .gitignore
```

## Gebruik

Installeer dependencies:

```bash
npm install
```

Start de Cloud Run-compatible gateway na een build:

```bash
npm run build
npm start
```

Voor frontend development kun je Vite draaien op `http://127.0.0.1:8080`. Start de gateway apart op `http://127.0.0.1:8787` wanneer je `/api/*` wilt testen.

```bash
npm start
npm run dev
```

De gateway serveert de productiebuild op:

```text
http://127.0.0.1:8787
```

## Gespreksmodus

Klik een keer op de marble om de voice agent te starten. Daarna blijft de marble na elk antwoord automatisch opnieuw luisteren, zodat het gesprek doorloopt zonder telkens opnieuw te klikken. Klik nog een keer op de marble om de sessie te stoppen.

Tijdens de dialoog reageert de marble per state:

- `listening`: audio-reactieve halo en ronding.
- `thinking`: langzamere diepe beweging rond de rand.
- `speaking`: audio-reactieve puls op basis van de afgespeelde stem.
- `generating`: snellere shimmer en randgloed voor artifact-output.

## Techniek

- Three.js 0.131.3
- Vite + TypeScript
- Custom shader material
- Google-first Node gateway voor voice endpoints

## API

- `GET /api/health`
- `POST /api/speech/transcribe`
- `POST /api/agent/respond`
- `POST /api/speech/synthesize`
- `POST /api/artifacts/generate`

Google credentials blijven server-side. Gemini draait standaard via Vertex AI. Relevante Cloud Run environment variables:

- `LLM_PROVIDER=gemini`
- `GOOGLE_CLOUD_PROJECT`
- `VERTEX_LOCATION=europe-west4`
- `GEMINI_MODEL=gemini-2.5-flash`
- `DEFAULT_LANGUAGE=nl-NL`
- `ENABLE_GOOGLE_SEARCH_GROUNDING=false`

Voor een OpenAI-compatible endpoint kun je later `LLM_PROVIDER=openai-compatible`, `LLM_ENDPOINT`, `LLM_API_KEY` en `LLM_MODEL` gebruiken.

De agent bewaart per browsersessie een compacte gesprekscontext, zodat vervolgvragen natuurlijker blijven. Google Search grounding is voorbereid maar standaard uitgeschakeld, omdat Google bij grounded responses zichtbare search suggestions en bronvermelding vereist.

## Projectindeling

Zie `docs/TREEMAP.md` voor de actuele folderstructuur en de rol van elke map.

Zie `docs/IMPLEMENTATION_PLAN.md` voor het grotere voice-agent doel, de architectuurkeuzes en de acceptatiecriteria.

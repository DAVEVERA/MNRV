# MNRV

Clippy-led AI portfolio & lead-gen for [mnrv.nl](https://mnrv.nl). Het hele gesprek loopt via Clippy: een cinematische 3D-agent op een near-black canvas die je in <30s door het MNRV-verhaal loodst en een intake start.

## Stack

- **Next.js 14** App Router \u00b7 TypeScript strict \u00b7 Tailwind
- **next-intl** \u2014 NL default, EN via `/en`
- **React Three Fiber + drei** \u2014 Clippy als 3D-scene
- **Framer Motion** \u2014 chat bubbles
- **Anthropic Messages API** via raw `fetch()` + SSE streaming op Edge runtime
- **Supabase** \u2014 Postgres (conversations / messages / leads) + Edge Function (`lead-notify`)
- **Resend** \u2014 transactional mail naar `info@mnrv.nl`

## Structuur

```
app/
  [locale]/        \u2014 enige publieke route: fullscreen Clippy + chat
  api/chat/        \u2014 Edge; proxy \u2192 Anthropic SSE + tool-use lead capture
  sitemap.ts, robots.ts, opengraph-image.tsx
components/
  scene/           \u2014 ClippyCanvas, ClippyModel, SceneLights
  chat/            \u2014 ChatShell, SpeechBubble, ChatInput, LocalePill
  providers/       \u2014 zustand store (Clippy state + cursor)
content/           \u2014 services, cases, brand KB (Clippy's system prompt)
lib/               \u2014 anthropic.ts, intake-tools.ts, clippy-fsm.ts, supabase
messages/          \u2014 nl.json, en.json
supabase/
  migrations/      \u2014 initial schema
  functions/       \u2014 lead-notify (Deno)
legacy/            \u2014 de oude Win98-site, uit de build gelaten
```

## Development

```bash
pnpm install        # of npm install
cp .env.local.example .env.local
# Vul ANTHROPIC_API_KEY + Supabase keys in
pnpm dev
```

Open `http://localhost:3000` \u2014 Clippy verschijnt op een donker canvas en groet je in het Nederlands. Typ een vraag om het gesprek te starten.

### Edge Function secrets

De `lead-notify` functie verwacht in Supabase:

```
RESEND_API_KEY
LEAD_NOTIFY_EMAIL=info@mnrv.nl
LEAD_NOTIFY_FROM="Clippy <clippy@mnrv.nl>"
```

Zet deze via `supabase secrets set --project-ref tulvzbzjbwxtjnaengwa ...` of via Studio \u2192 Edge Functions \u2192 Secrets.

### Optioneel: DB webhook

Om `lead-notify` ook bij directe inserts te triggeren (zonder de Next.js route), maak in Supabase Studio een Database Webhook op `public.leads` (event: INSERT) richting de `lead-notify` Edge Function.

## Clippy als 3D-asset

De huidige `ClippyModel` is **volledig procedureel** (paperclip-extrude + twee oogbollen + snor) zodat de app out-of-the-box werkt. Wil je de cinematische Sketchfab-Clippy als GLB? Zet het bestand op `public/clippy.glb` en vervang de procedurele mesh door `useGLTF('/clippy.glb')` met `useAnimations()` \u2014 de state-machine in `lib/clippy-fsm.ts` mapt al naar clip-namen (`Idle`, `Wave`, `Thinking`, `Talking`, `Excited`, `Celebrate`).

## Legacy

De originele Win98-site staat in `legacy/`. Niets in die map wordt nog gebuild, maar de historische HTML blijft bewaard voor referentie.

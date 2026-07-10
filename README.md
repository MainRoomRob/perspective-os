# Perspective OS

Multi-perspective research tool implementing a 4-step framework:

1. **Multi-Perspective Scan** — five expert simulations (Practitioner, Academic, Skeptic, Economist, Historian)
2. **Contradiction Map** — agreements, conflicts, evidence ranking, blind spots
3. **Synthesis** — executive briefing, key findings, actionable insight for your role
4. **Peer Review** — confidence scores, bias check, overall assessment

## Setup

```bash
cp .env.example .env
# Add DATABASE_URL and OPENAI_API_KEY (or GEMINI_API_KEY)
# Or sync keys from Positioning OS:
npm run env:sync-keys

npm install
npm run db:init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The home page badge shows **LLM: openai** (or **gemini**) when keys are configured, or **Mock mode** otherwise.

Without API keys, the pipeline runs in **mock mode** with deterministic fixture output.

### LLM configuration

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Primary provider (preferred when set) |
| `OPENAI_MODEL` | Default `gpt-4o-mini` |
| `GEMINI_API_KEY` | Fallback provider |
| `GEMINI_MODEL` | Default `gemini-2.5-flash-lite` |
| `LLM_PROVIDER` | Optional: `openai` or `gemini` when both keys are set |

## Monorepo

| Package | Purpose |
|---------|---------|
| `apps/web` | Next.js UI |
| `packages/core` | Zod schemas and domain types |
| `packages/db` | Drizzle + Postgres |
| `packages/ai` | Prompts, pipeline, LLM client |
| `packages/web-server` | Server actions |

## Scripts

- `npm run dev` — start dev server
- `npm run db:init` — apply migrations
- `npm run typecheck` — TypeScript across packages
- `npm run env:sync-keys` — copy LLM keys from Positioning OS `.env` (fills empty keys only)
- `npm run pipeline:smoke` — run full pipeline in terminal (live if keys set)

## Design system

UI uses [`@mainroomstudio/design-system`](https://github.com/MainRoomRob/mrs-design_system) (CSS-first tokens and components).

**Deployed builds:** vendored in `packages/design-system/dist/` (no external registry).

**Local DS development:** rebuild sibling `mrs-design_system`, then copy `dist/` into `packages/design-system/`.

## Deploy (Vercel)

1. Create a [Neon](https://console.neon.tech) project and copy the **pooled** connection string.
2. Import [MainRoomRob/perspective-os](https://github.com/MainRoomRob/perspective-os) in [Vercel](https://vercel.com/new).
3. **Root Directory:** `apps/web` — enable **Include source files outside of Root Directory** (monorepo).
4. Apply migrations to your production database (once, from your machine):

```bash
DATABASE_URL="postgresql://..." npm run db:init
```

5. Set environment variables in Vercel (Production + Preview):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon pooled Postgres connection string |
| `OPENAI_API_KEY` | Live AI (required for production demo) |
| `OPENAI_MODEL` | Optional, default `gpt-4o-mini` |

6. Deploy (build runs `npm run build` only). If a deploy still fails, use **Redeploy → Clear build cache**.

Use a **separate Neon project or branch** for production — do not share your local dev database.

**Note:** There is no authentication yet. Anyone with the URL can create sessions and consume your OpenAI quota.

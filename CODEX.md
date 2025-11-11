# CODEX.md

Guidance for Codex CLI, aligned with CLAUDE.md, so Claude and Codex can work in sync.

## Quick Start
- `npm run dev` — Start dev server at http://localhost:3000
- `npm run build` — Production build
- `npm start` — Serve production build
- `npm run lint` — ESLint/Next checks
- Clear cache if Next.js glitches: remove `.next/` then `npm run dev`

## Environment & Secrets
- `.env.local` must define `OPENAI_API_KEY` (never commit).
- Firebase client config/helpers in `firebase.ts`. Secure data via Firestore rules (anonymous auth + constrained writes to `projects`).

## Repository Map
- `app/` — App Router pages, layouts, styles (`app/globals.css`). API files at `app/api/<name>/route.ts`.
- `app/project/[projectId]/*` — Journey UI: Explore, 4Ws, Solutions, Co‑Founder Lab; includes read‑only teacher view.
- `app/api/mentor/route.ts` — Current AI mentor endpoint (problem‑finding flow, source of truth today).
- `lib/` — Utilities (e.g., `mentorLogic.ts`). CLAUDE.md also outlines a planned `lib/ai/*` orchestrator.

## Architecture Overview (from CLAUDE.md)
- Journey-Based Flow: Horizontal sliding canvas with step unlocks and completion checks per step.
- AI Orchestrator Pattern (planned/outlined): unified `/api/ai` endpoint, `lib/ai/orchestrator.ts`, prompt registry under `lib/ai/prompts/*`, shared `lib/ai/types.ts`, assistants under `lib/ai/assistants/*`.
  - If orchestrator files are missing, treat them as a refactor target; keep `/api/mentor` as current implementation.
- Co‑Founder Lab Phases: opinionated‑ranking → concrete‑variants → merge‑or‑cut → design‑concept → bold‑remix → commit. Short, concrete, one question per turn.
- Validation: utilities ensure substantive, unique responses before progression; step completion requires content + “checked feedback” flags.
- Firestore Model: `projects` collection holds exploration data, statements, selections, conversation history; journey reads/writes nested paths.

## Data Model & Firebase Helpers (from CLAUDE.md)
- Use nested field paths when updating to avoid overwriting siblings, e.g.:
  `problemExploration.thinkBig.answers`, `problemExploration.thinkBig.hasCheckedFeedback`.
- Common helpers: `ensureAuth()`, `subscribeToProject(projectId, cb)`, `updateProject(projectId, data)`.

## Validation & Completion Pattern
- Validation functions (e.g., uniqueness, min length) gate progression.
- Step completion requires content validity AND `hasCheckedFeedback: true` to unlock next step.

## API Patterns
- Mentor endpoint (current): `POST /api/mentor` for problem‑finding stages (`domain`, `issue`, `statement`, `tweak`).
- Orchestrator endpoint (planned): `POST /api/ai` with `stepId`, `zoneId`, `action`, and full project context; returns structured `AIResponse`.
- Auto‑trigger example (Co‑Founder Lab): agent can send a synthetic trigger to `/api/ai` on stage transitions.

## Agent Interoperability & Sync
- Source of Truth
  - Today: `app/api/mentor/route.ts` implements production AI behavior.
  - Orchestrator: treat as an incremental refactor; mirror prompts/logic there if `lib/ai/*` exists.
- Shared Conventions
  - Branches: `feat/<area>-<short>`, `fix/<area>-<short>`; area examples: `api`, `ui`, `firebase`, `journey`, `ai`.
  - Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`) with scope (e.g., `feat(api): add issue generation`).
  - Routes and files: follow Next.js naming (`page.tsx`, `layout.tsx`, API `route.ts`, dynamic `[id]`).
  - Types: extend shared types (planned: `lib/ai/types.ts`) rather than duplicating interfaces.
- Handoff Checklist (Claude ↔ Codex)
  - Confirm env set: `OPENAI_API_KEY`, Firebase rules OK.
  - Note current endpoint in use (`/api/mentor` vs `/api/ai`).
  - Link files touched and rationale (UI under `app/project/[projectId]/*`, API, helpers).
  - State validation/completion implications and any Firestore path changes.
  - Provide manual test steps and screenshots/GIFs for UI diffs.
- Prompt & Behavior Sync
  - Keep a single prompt registry (planned: `lib/ai/prompts/`). If absent, centralize system/user prompts in one module under `lib/` and import from API.
  - Avoid duplicating prompt strings across endpoints; export and reuse.
- Logging & Diagnostics
  - Log high‑level events only (no secrets). Surface stepId, zoneId, stage transitions, and token costs if available.
  - When refactoring to orchestrator, keep compatibility shims or adapters to map mentor stages to orchestrator actions.

## Coding Standards
- TypeScript strict mode; 2‑space indent; PascalCase components; camelCase variables; kebab‑case filenames for non‑components.
- Use `@/*` path alias when helpful.
- Keep `npm run lint` clean before PRs.

## Known Issues & Runbooks (from CLAUDE.md)
- Next.js cache can cause false syntax errors after structural changes.
  - Fix: delete `.next/` and run `npm run dev`.
- Firestore field renames require updates in interfaces, all usages, update paths, and step completion checks; old documents will not auto‑migrate.

## Tests (recommended shape)
- Unit: Jest + React Testing Library, co‑located `*.test.ts(x)`.
- E2E: Playwright for key journeys (Explore → 4Ws → Solutions → Co‑Founder Lab).
- Cover: mentor API logic, validation functions, and step completion gates.

## AI Model Configuration (from CLAUDE.md)
- Model: `gpt-4o-mini`; temperature varies (≈0.7–0.8 generative; lower for review); max tokens ≈300–400.
- Cost guidance: ~$0.15/1M input tokens; ~$0.60/1M output tokens.

## Brand Design Tokens
- Background `#162237`, Accent `#f15f24`, Secondary `#86dabd`.
- Glassmorphism with backdrop blur; text colors include strong/ muted variants.

## Safe Edit Targets
- UI: components under `app/project/[projectId]/*` and `app/*` pages/layouts.
- API: `app/api/mentor/route.ts` (or `/api/ai` orchestrator if added).
- Utilities: `lib/*`, `firebase.ts`.

# Repository Guidelines

## Project Structure & Module Organization
- `app/` — Next.js App Router. Pages (`page.tsx`), layouts (`layout.tsx`), styles (`globals.css`). API routes live at `app/api/<name>/route.ts`. Dynamic routes use `[param]` folders.
- `lib/` — Shared utilities (e.g., `mentorLogic.ts`).
- `firebase.ts` — Firebase initialization and helpers.
- `README.md` — Setup, Firebase rules, and usage notes.
- `.env.local` — Local secrets (not committed).

## Build, Test, and Development Commands
- `npm run dev` — Start the Next.js dev server at `http://localhost:3000`.
- `npm run build` — Production build (checks types and compiles).
- `npm start` — Run the production server (after build).
- `npm run lint` — Run Next.js/ESLint checks.

## Coding Style & Naming Conventions
- Language: TypeScript with `strict` mode (see `tsconfig.json`).
- Indentation: 2 spaces; prefer single quotes.
- Components: React function components; PascalCase component names.
- Variables/Functions: camelCase; constants UPPER_SNAKE_CASE when global.
- Files: kebab-case for non-components; Next routes use `page.tsx`, API files `route.ts`, dynamic folders `[id]`.
- Imports: use `@/*` path alias when helpful.
- Linting: keep `npm run lint` clean before PRs.

## Testing Guidelines
- Current state: no test runner configured.
- If adding tests:
  - Unit: Jest + React Testing Library; co-locate as `*.test.ts(x)` near source (e.g., `lib/foo.test.ts`).
  - E2E: Playwright under `e2e/` for critical flows (mentor prompt → selection → statement).
  - Aim to cover mentor API logic in `app/api/mentor/route.ts` and key UI steps under `app/project/[projectId]/*`.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). Scope examples: `api`, `ui`, `firebase`, `lib`.
- PRs should include:
  - Summary of changes and rationale.
  - Screenshots/GIFs for UI updates.
  - Testing notes (manual steps or automated tests).
  - Any config changes (env vars, Firebase rules).

## Security & Configuration Tips
- Never commit `.env.local`. Requires `OPENAI_API_KEY`.
- Keep API keys server-side (via `/api/*` routes). Avoid logging secrets.
- Ensure Firestore rules match README guidance (anonymous auth + constrained writes to `projects`).

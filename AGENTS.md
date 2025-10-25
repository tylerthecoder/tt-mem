# Repository Guidelines

## Project Structure & Module Organization
This repository uses the Next.js App Router. Feature routes live under `app/` (`play/`, `interval-training/`, `reading-comprehension/`), with shared UI in `app/components/`, contexts in `app/context/`, and provider wiring in `app/providers.tsx`. Mongo-facing server actions are grouped in `app/actions/`, and cross-cutting helpers sit in `app/lib/` (database/auth) and `app/hooks/`. Tailwind styling is centralized in `app/globals.css`, static assets in `public/`, and domain models in `types/`. Prefer the `@/` alias when importing from `app` or `types`.

## Build, Test, and Development Commands
Install dependencies with `npm install`. Use `npm run dev` for the local Next server, `npm run lint` to apply the ESLint + TypeScript ruleset, `npm run build` to validate a production bundle, and `npm run start` to boot the optimized build. Bring up MongoDB with `docker compose up mongo` before hitting server actions that require persistence.

## Coding Style & Naming Conventions
The codebase is TypeScript-first; keep components as typed React function components and export hooks or helpers with explicit return types. Follow the 4-space indentation, single quotes for module imports, and PascalCase file names for components (`DeckList.tsx`), camelCase for utilities (`mapMongoId.ts`). Tailwind utility classes drive view styling—co-locate layout styles with the component and keep shared tokens in `globals.css`. Run `npm run lint` before submitting to catch violations of the shared config.

## Testing Guidelines
There is no committed automated suite yet, so validate changes by exercising affected flows in `npm run dev` with the Mongo container running. When adding tests, colocate `*.test.ts(x)` or `*.spec.ts(x)` beside the feature, rely on Vitest + React Testing Library, and wire the runner through a new `npm test` script in `package.json`. Document any manual verification steps in your pull request until coverage thresholds are in place.

## Commit & Pull Request Guidelines
Recent commits use brief, imperative messages (`Add interval training`, `Better home page`); keep following that style and scope each commit to a cohesive change. Pull requests should include a clear summary of the user-facing impact, linked issues or TODO items, validation notes (manual steps, screenshots, or test commands), and callouts for remaining risks. Highlight schema or environment changes near the top so reviewers can update `.env` files promptly.

## Environment & Configuration
Populate `MONGODB_URI`, `MONGODB_DB_NAME`, and `JWT_SECRET` in `.env.local` before running authenticated or database-backed features. Never commit secrets. If you add new configuration, update `docker-compose.yml` and reference handling in `app/lib/` so server actions stay aligned.

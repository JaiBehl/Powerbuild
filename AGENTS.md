# Powerbuild development instructions

## Start from current context

- Read `README.md` before planning/editing. It contains product decisions, implementation/data contracts, audit findings and continuation instructions.
- Inspect the current branch/source. Compare newer runtime commits with the README baseline. Current code can be newer than the README or a past chat.
- Active app: React/Vite under `src/`, entered through `index.html`. Build with `npm run build`. Root `app-*.js`, `styles.css` and `build.mjs` are inactive legacy files.
- Honor the latest explicit user instructions and requested scope. Audit findings are not authorization to implement every suggestion or change a saved plan.

## Required companion documentation

- Update `README.md` in the same commit/PR as changes affecting behavior, UI, calculations, persistence, dependencies, deployment or developer workflow.
- Update relevant features, source map, formulas, schemas, compatibility/migrations, setup and known issues. Remove superseded claims and record actual validation.
- Refresh source baseline/date for runtime changes to identify code actually reviewed; docs-only edits may retain the application baseline. Never invent a SHA, test or deployment result.
- A fresh chat using the README must identify the active app, capabilities, data contracts, important limits and next verification steps.
- Distinguish requested/proposed, implemented, built, deployed and end-to-end verified. Use the PR checklist. The README check enforces a companion edit, not accuracy.

## Preserve behavior and data

- Keep the restored dark React UI, sticky sidebar, compact saved foods and requested scope of visual edits.
- Use shared `CalorieSection` panels. Minimized headers retain toggle/title/description/value; hide mounted content to preserve drafts.
- Keep maintenance goal-independent, uncapped deadline arithmetic, editable calories/macros and existing impossible-target warnings.
- Store canonical weights in pounds and convert at boundaries. Saved foods use per-serving values; consumed logs retain independent snapshots/totals.
- Keep isolated profiles, active-profile backups/resets, repeat-safe history merge and supported old backups. Cloud stores all profiles in one account snapshot without automatic conflict merging.
- Supported seated OHP uses upright back support; legacy bench goal is touch-and-go. Do not silently impose past/default goals on saved profiles.
- Repository is public: never commit private Notes/history/backups, emails, tokens, service-role keys or credentials. Use synthetic examples and public placeholders.

## Verification and delivery

- Use Node 22+ for current fresh dependency resolution; inspect current engines and lockfile state.
- For runtime changes run `npm run build` and focused checks. No established application test/lint/typecheck command exists in the audited baseline; state actual results/limits.
- Check changed UI at relevant desktop/mobile sizes. For auth/sync changes check redirects, ownership, two-device edits/conflicts and offline recovery using disposable data.
- Do not erase/reset/replace or experiment on real user history to test a change.
- Merge, preview and production readiness are separate evidence. Preserve established GitHub-to-Vercel hosting and verify live claims.

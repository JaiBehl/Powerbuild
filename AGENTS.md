# Powerbuild development instructions

## Current context and scope

- Read README.md before editing. Fetch current source/open PRs and compare with its reviewed baseline; code or user instructions can be newer than past chats.
- Active app is React/Vite under src/, entered through index.html. npm run build is the production build; build.mjs delegates to Vite. Root app-*.js and root styles.css are inactive legacy files.
- Preserve requested scope and the restored dark UI, sticky sidebar, compact saved foods and shared collapsible cards. Minimized headers retain descriptions/counts; hidden content stays mounted.
- Work sequentially: finish one fix/feature, add a regression, verify the full suite, then proceed. Audit observations are not blanket permission for unrelated redesigns.

## Data contracts

- Canonical weights stay pounds; convert at boundaries. Food templates store one serving; consumed logs retain independent snapshots/totals.
- Activity/targets/goal fallback are date snapshots; defaults seed new dates. Manual calorie weights remain explicit until automatic weigh-ins are selected. Reconnecting automatic weight updates the selected date and new-date defaults, without rewriting other saved manual dates; incomplete plans inherit the profile mode. Show the calculator date and actual weight source/date, and exclude future/invalid weigh-ins.
- Exercise edits are session-only by default. Future-template permission is explicit and resets per session; match stable IDs or a unique legacy name, never position.
- Supported seated OHP uses upright back support; legacy bench is touch-and-go. Keep distinct variations separate unless explicitly linked. Never impose old/default goals on saved profiles.
- PR bodyweights are derived from dated weigh-ins: same-day means, then interpolation/nearest within 30 days per side. Label estimates with sources; never substitute current/default weight. Rank relative records independently by unrounded load/bodyweight, retain achievement dates and exclude unavailable bodyweights or unsupported bodyweight/assisted resistance. Do not persist derived estimates over logs.
- Preserve local profiles, supported backups, import provenance and repeat-safe merge. Correction/removal requires preview, explicit choice and a saved recovery copy.
- Cloud stores all profiles in one account snapshot. Three-way merge only non-conflicting edits; retain choices/recovery for real conflicts. Guard obsolete auth responses and ownership RLS.
- Before destructive changes, save recovery or abort with a useful error. Do not run destructive tests on real user history, auth accounts or cloud payloads.

## Verification

- Node 22+; .nvmrc/CI use Node 24. Use npm ci and commit dependency locks when intentionally changing packages.
- Install Chromium with npx playwright install --with-deps chromium. npm run test:all runs unit/integration tests, Vite build and Playwright browser regressions.
- Add tests for the concrete failure/new behavior, with synthetic records. Keep all prior tests passing. Test relevant desktop/mobile flows and data round trips.
- Auth/sync tests use the isolated synthetic backend; distinguish these from actual inbox delivery or real-device account verification.
- GitHub Actions runs PR/main regressions, retains reports/traces, and performs read-only production smoke checks after main CI. Preview success, merge and production readiness are separate evidence.
- Preserve existing GitHub-to-Vercel hosting. Do not claim deployment or testing without checking the relevant commit/results.

## Required documentation and privacy

- Update README.md in the same commit/PR for changes to behavior, UI, calculations, schemas/migrations, dependencies, testing or deployment. Update current contracts and remove stale claims, not just append conflicting notes.
- Refresh reviewed baseline/date for runtime changes; docs-only commits can retain the application baseline. Record actual checks and material limits. A fresh chat using the README should identify current capabilities and next steps.
- Use the PR checklist. The README companion check detects a missing edit, not factual accuracy; do not bypass maintenance for direct pushes.
- This repository is public. Never commit real Notes exports, workouts/food backups, account emails, auth tokens, secret/service-role keys or private history. Use synthetic examples and public configuration placeholders.

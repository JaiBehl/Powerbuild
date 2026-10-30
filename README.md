# Powerbuild

Powerbuild is a local-first fitness web app for workout/bodyweight logging, a rolling push/pull/legs schedule, strength goals, maintenance and macro calculations, food/serving tracking, saved foods and custom cardio. Optional Supabase accounts sync profiles across devices. Vercel hosts the React/Vite frontend.

This is the project manual and the context handoff for a new AI conversation. Read it before editing, then inspect the current source. Live user data and credentials are deliberately excluded.

## Reliability update in progress

Development branch: `fix/verified-reliability-and-features`. Changes are being implemented and validated sequentially. Node 24, pinned direct dependencies, `npm test` (Node regression tests) and `npm run test:e2e` (Playwright Chromium) are now configured. GitHub Actions runs both suites and the production build on each branch push/PR. The historical audit below describes the pre-update baseline; each completed phase is recorded here and its affected contract will be revised before release.

### Phase 1 — safe session/template editing

Exercise changes now default to this session only. An explicit checkbox also applies them to future workouts. Stable template IDs survive rename/reordering; older sessions resolve only through a unique name and ambiguous links are rejected. Unit and browser regressions cover old reordered sessions, session-only deletion, persistent data, explicit future edits and immutable originals. A committed package lock now enables `npm ci` in CI. Full-suite validation is required before phase 2.

### Phase 2 — daily nutrition plans

Phase 1 passed the complete CI gate. Activity, baseline inputs, manual targets/macros and goal settings now snapshot into each nutrition date record as `plan: {calorieSettings, goal}`; food/cardio writes also snapshot the plan. Existing records migrate without losing items/cardio. Edits affect the selected date; an explicit action copies settings into defaults for new dates. Core calorie math moved to tested `src/nutrition.js`; zero manual calorie targets now remain zero. Unit/browser tests cover dated isolation, reload, older-record migration, goal-independent maintenance, uncapped math and food/cardio coexistence.

### Phase 3 — explicit weight source

Phase 2 passed the full CI gate. Baseline maintenance now has Follow weigh-ins / Enter weight manually modes. Automatic mode uses only weigh-ins dated on/before the selected date and ignores retained manual values; legacy explicit manual weights remain manual until changed. Unit and browser tests cover reconnecting Progress weigh-ins and preserving legacy overrides.

### Phase 4 — exercise identity and aliases

Phase 3 passed the full CI gate. Standard barbell/touch-and-go bench labels now share one chart and goal series; paused/incline/standing variations remain distinct. Settings provides explicit reversible custom links and same-name opt-outs. Resolution does not rewrite original workout text. Alias maps are profile data included in backups/sync. Unit/browser tests cover shared history, goal values, variant separation, persisted links and cycle rejection.

## Current handoff

| Item | Audited state |
| --- | --- |
| Repository | [JaiBehl/Powerbuild](https://github.com/JaiBehl/Powerbuild), public |
| Default branch | `main` |
| Application baseline | [`03d6258633b7376b184a3b7e86bdd201cf18c62a`](https://github.com/JaiBehl/Powerbuild/commit/03d6258633b7376b184a3b7e86bdd201cf18c62a) |
| Audit date | October 30, 2026, America/Los_Angeles |
| Coverage | All 34 tracked files at that baseline, merged PRs #1–#22, relevant recovered app discussions and relevant workout-note export structure |
| Latest implementation | PR #22: shared collapsible panels with persistent descriptions/counts throughout all five tabs |
| Pull-request state | All 22 PRs merged; none open at audit |
| Production | [powerbuild-flexible-goals.vercel.app](https://powerbuild-flexible-goals.vercel.app) |
| Vercel project | `powerbuild-flexible-goals` |
| Backend | Supabase Auth, `public.powerbuild_cloud_state`, `public.powerbuild_save_state` |
| This handoff | Documentation and documentation-maintenance checks; no application behavior/data/schema changes |

The baseline identifies the application source reviewed, so documentation-only commits may be newer. Before continuing, fetch current `main`, compare runtime changes since that SHA, and check open PRs. Current source governs implementation; the user's latest explicit instructions govern intended behavior.

### Start a new AI chat

Upload this README and provide repository access. Suggested opening message:

> Continue Powerbuild from this README. Read its handoff, product constraints, source map, data contracts and audit findings. Fetch the current main branch and AGENTS.md; compare against the documented baseline and inspect the source relevant to my request. Preserve existing data and UI preferences. Update the README in the same change and distinguish implemented behavior from proposals and verified results.

The README provides context, not the entire source or the user's current logs. Making changes still requires source access. Current goals, workouts, nutrition and profiles must come from the app or a supplied backup when relevant; do not reconstruct them from defaults or old conversations.

## Product decisions to preserve

- Preserve the restored original React/localhost UI: dark navy surfaces, POWERBUILD / STRENGTH × PHYSIQUE branding, clear set tables and sticky desktop sidebar. The user repeatedly requested this design. Respect requests to change only a named area.
- All main content panels minimize independently through `CalorieSection`. Keep the top-left plus/minus control, title, mini-description and useful right-hand count/value visible when minimized. Hide mounted content so minimizing does not discard draft edits.
- Bodyweight goal, baseline maintenance, activity, custom cardio, calorie target, macros, food log and Saved Foods are separate cards. Saved Foods belongs immediately below the food log; individual saved-food cards stay compact and readable.
- Calculate maintenance regardless of goals. Goal/deadline math has no former percentage deficit/surplus cap. Keep manual calorie/macro overrides and warnings for impossible math or expired deadlines.
- Log foods individually, with meal categories and fractional/multiple servings. Editing/deleting a saved template must not alter already logged nutrition.
- Keep profiles isolated, with active-profile export/import/reset. Supabase login and profile selection are different concepts; all profiles sync to one account.
- Preserve history, original session notes, all-years browsing and repeat-safe historical merges. Do not commit private Notes exports, converted personal history, backups, emails or credentials to this public repo.
- The training model is powerbuilding: strength plus accessory hypertrophy. Supported seated barbell OHP uses upright back support. The legacy bench goal is touch-and-go, not paused bench.
- Goals/deadlines are editable data. Earlier requests included January 12, 2027 for bodyweight, followed by bulk/cut discussions; fresh code defaults still use April 12, 2027. Do not silently impose defaults or historical plans on existing profiles.
- The intended workflow is GitHub changes followed by Vercel Git deployments. Local edits, preview success, merging and production verification are distinct states.

## Architecture and complete source map

The active app is JavaScript/React 18. `index.html` loads `/src/main.jsx`; Vite follows imports and builds to `dist/`. Navigation is React state without URL routing. `App` owns the active DB, profiles, selected tab/date, shared form state, imports/exports and derived strength history. Child components receive data and update callbacks. There is no Redux, TypeScript or custom API server.

The browser saves to `localStorage` first. Optional `useCloudSync` sends a JSON snapshot through the Supabase client. Auth and data security live in Supabase, not in Vercel API routes.

| File | Responsibility |
| --- | --- |
| `index.html` | Active root element, theme/title/viewport, React module entry |
| `package.json` | ES modules, Vite dev/build/preview commands, dependencies |
| `src/main.jsx` | App orchestration, normalization/migration, profile actions, session actions, e1RM history, JSON/CSV export, backup/history import |
| `src/data.js` | Six-session cycle, complete default prescriptions/settings, legacy goals, local date, date-based scheduling, session factory, Epley estimate |
| `src/TrainTab.jsx` | Set logging, workout/exercise controls, template editing, notes, finish/reopen/delete |
| `src/ScheduleTab.jsx` | Weekly calendar, training/rest labels, six-template preview |
| `src/ProgressTab.jsx` | Overview/goals, e1RM/bodyweight charts, searchable/year-filtered/paginated history |
| `src/CalorieTracker.jsx` | Calorie defaults, baseline/activity/goal/macro calculations, food/cardio integration |
| `src/CalorieSection.jsx` | Shared collapsible card across every tab, despite its calorie-specific name |
| `src/FoodLog.jsx` | Food CRUD, categories, totals/remaining, bookmarking portions |
| `src/SavedFoods.jsx` | Saved-template search/edit/delete and reuse with meal/servings |
| `src/ServingPicker.jsx` | Decimal serving input and ¼, ½, 1, 2, 3 buttons |
| `src/foodLibrary.js` | Food validation, meal normalization, serving math, snapshots, old-entry compatibility |
| `src/CardioLog.jsx` | Date-specific cardio name/duration/calorie CRUD |
| `src/SettingsTab.jsx` | Units, bodyweight planning, schedule, arbitrary strength goals, importer, backup/export/reset |
| `src/ProfileSwitcher.jsx` | Sidebar profile selection/create/rename/inactive deletion |
| `src/profiles.js` | Profile keys, metadata, first-run migration, per-profile loading/saving/removal |
| `src/cloudSync.jsx` | Client/auth, confirmation resend, snapshot comparison, revision saves, polling/retry/conflict UI |
| `src/units.js` | lb/kg and macro-rate conversions; canonical stored weights stay lb |
| `src/historicalImport.js` | Historical format validation and repeat-safe merge |
| `src/style.css` | Active base styles, charts, nutrition, compact foods, shared panels |
| `src/profile.css`, `src/cardio.css`, `src/ui-polish.css` | Imported profile/cardio/goal/spacing refinements |
| `.env.example` | Public frontend configuration placeholders |
| `supabase/migrations/20261029_cloud_sync.sql` | Account snapshot table, ownership RLS and revision-checked save function |
| `CLOUD_SYNC_SETUP.md` | Existing cloud setup and Mac-to-phone migration guide |
| Root `app-core.js`, `app-views.js`, `app-settings.js`, `app-workout-customizer.js`, `styles.css` | Inactive older vanilla-JS app; historical/migration context only |
| `build.mjs` | Inactive legacy static-file copier, not the active build |
| `AGENTS.md` | Future AI development and README maintenance requirements |
| `.github/pull_request_template.md` | Change, verification and documentation checklist |
| `.github/workflows/readme-check.yml` | Companion-README PR check added with this handoff |

**Build trap:** `node build.mjs` copies the current React HTML alongside legacy assets but omits the React source/bundle. It can produce an unusable site. Use `npm run build`; edit active files under `src/`.

## Feature reference

### Train

- Previous/next date, date picker, Today action and scheduled/rest label. Date is shared with Progress and Calorie tracker.
- Start the planned workout or manually select any of the six types, including on a rest day.
- Session overview: workout type, completed/total sets, completed lifting volume, finished/in-progress status.
- Each exercise: rep range/effort guidance, weight/reps/RPE inputs, done toggle, set number and optional Top/Backoff tag. Add/remove sets. Volume sums `weight × reps` for completed sets.
- Add any named exercise to the session and future sessions of that workout type; defaults are three sets, 8–12 reps, 1–2 RIR, accessory classification.
- Edit name/rep range/effort through prompts or remove an exercise with confirmation. Those operations update that workout template too. Individual set additions/removals affect the session, not template set count.
- Notes save with the session while typing. Finish/reopen toggles status. Delete removes the workout after confirmation.
- Effectively one session per date: lookup uses date, and the underlying start action replaces existing sessions on that date. There is no multiple-workouts-per-day interface.
- Finishing does not advance a manual counter; schedule rotation is calculated from dates and configured weekdays.

### Schedule and default program

Cycle: **Push A → Pull A → Legs A → Push B → Pull B → Legs B**, continuing across weeks. Fresh weekdays: Monday, Tuesday, Wednesday, Friday, Saturday; rest Thursday/Sunday. Settings edits weekdays, start date and offset 0–5. Rotation advances on scheduled training dates even if a workout is skipped. Dates before the start have no plan.

Schedule supports previous/current/next week, opening dates in Train, finished-session indicators, completed/planned counts and template exercise counts.

| Workout | Default exercises and set counts |
| --- | --- |
| Push A | Barbell bench press 4; Supported seated barbell OHP 3; Incline machine or DB press 2; Cable lateral raise 3; Overhead cable triceps extension 2; Cable pec fly 2 |
| Pull A | Chest-supported upper-back row 3; Neutral-grip lat pulldown 3; Reverse pec deck 3; Preacher curl 3; Incline dumbbell curl 2; Forearm flexion/extension 2 |
| Legs A | Barbell back squat 4; Seated leg curl 3; Leg extension 3; Standing calf raise 3; Hip adduction 2; Cable crunch 3 |
| Push B | Supported seated barbell OHP 4; Touch-and-go bench press 3; Incline press 2; Cable lateral raise 3; Cable pec fly 2; Triceps pushdown 2 |
| Pull B | Pull-up or lat pulldown 3; Chest-supported row 3; Single-arm cable lat pulldown 2; Cable rear-delt fly 2; Incline dumbbell curl 3; Preacher or cable curl 2; Forearm flexion/extension 2 |
| Legs B | Barbell back squat 3; Romanian deadlift 2; Seated or lying leg curl 3; Leg extension 3; Seated calf raise 3; Hanging leg raise 3 |

Exact ranges/effort prescriptions are in `src/data.js`; profiles can customize them. Explicit strength tags are Push A bench, Legs A squat and Push B OHP: first set Top, then Backoff, generally 3–5 top / 4–6 backoff. Other compounds can serve strength goals without those tags. The default deadlift is Romanian on Legs B; conventional deadlift can be custom/historical.

### Progress

- Overview: finished workouts, completed sets, latest bodyweight, current target.
- Optional goals for any exact exercise name, each with target weight/date. Add/edit/remove in Settings. New profiles start with no strength goals.
- Original-profile migration can retain 405-lb squat, 315-lb touch-and-go bench and 225-lb supported seated OHP goals using the stored strength deadline. These are migration values, not requirements for new profiles.
- Separate e1RM and bodyweight charts, each with 3M/6M/1Y/All controls (default 6M). Range counts back from the latest point in that series, not today. Hover shows month/day/year and converted weight.
- Strength history uses done sets with positive load/reps, at most 15 reps, taking the highest estimate per exercise/date. Done sets in unfinished sessions also count.
- Epley: `e1RM = weight × (1 + reps / 30)`. A one-rep set still receives this formula, about 3.33% above lifted weight; there is no separate actual-1RM record. Goal summaries use the latest date's estimate, not all-time best.
- Workout history includes all years and finished/unfinished/imported sessions. Year filtering, search across date/type/exercises/notes, and 30-record increments. Open a record's original date/notes in Train.
- Bodyweight history has all-years/year filtering, date/weight search and 30-record increments. Saving replaces previous entries on the selected date. Deleting removes only the selected record after confirmation, even with same-day duplicates in imported data.
- Exercise series/goal matching is exact and case-sensitive. `Barbell bench press` and `Touch-and-go bench press` do not automatically combine.

### Calorie and macro tracker

Eight independent cards: Bodyweight goal, Baseline maintenance, Daily activity, Custom cardio, Daily calorie target, Macro targets, Food & meal log, Saved Foods.

- Bodyweight goal edits the same target/deadline used by Settings/header. Cut/Bulk/Maintain derives from target versus calculation weight.
- Baseline source: calibrated app estimate or custom number. Inputs are weight, male/female formula, age, feet/inches. Explicit calorie weight overrides weigh-ins; otherwise use the latest weigh-in on/before the selected date, then starting weight.
- Walking slider 0–15 miles, running 0–10 miles, both 0.25 steps; running labeled 5:00/mile. Lifted yes/no and duration 1–3 hours in 0.25 steps, disabled when not lifted.
- Custom cardio: named exercise, minutes and manually entered calories, add/edit/delete per date. Only entered calories affect expenditure; duration is recorded but does not calculate calories.
- Automatic goal/deadline calories or manual daily target. Automatic protein/fat per bodyweight with remaining carbs, or independently entered protein/carbs/fat. Macro calories may differ from calorie target and the UI explains this.
- Foods/cardio share a selected-date record without overwriting each other. Activity and target settings remain profile-wide; see persistence notes.

### Food log and Saved Foods

- Name, meal, per-serving kcal/protein/carbs/fat, serving multiplier. Categories: Breakfast, Lunch, Dinner, Snacks, Other.
- Blank calories compute `4P + 4C + 9F`; explicit calories take precedence. Blank macros count zero. Reject missing names, all-zero nutrition and negative/non-finite nutrients.
- Quick servings: ¼, ½, 1, 2, 3. Custom positive decimal up to 100; use `0.5`, not the string `1/2`. Multiplied nutrients round to two decimals.
- Add/edit/delete individual entries, group by meal, show consumed/remaining calories/macros. Older unnamed entries remain visible with fallback names/categories.
- Save a new portion or bookmark a logged food into Saved Foods. Saving a template does not itself log consumption.
- Search saved foods by name, sorted alphabetically. Edit/delete per-serving templates/default meals. Select servings/meal and Add to log for the selected date.
- Logged foods hold their own `perServing` snapshot and multiplied totals, optionally linked by `sourceSavedFoodId`. Template edits/deletes cannot change prior logs. Total-only older entries can be converted back to portions for editing/bookmarking.
- Library is profile-scoped, backed up and cloud-synced. No barcode scanner or external nutrition lookup is implemented.

## Calculation contract

These describe implementation, not measured energy expenditure or recommended intake.

| Quantity | Formula/behavior |
| --- | --- |
| Canonical units | lb, height in inches, macro rates g/lb, food macros g, energy kcal, distance miles |
| Conversions | `1 kg = 2.2046226218 lb`; `1 in = 2.54 cm` |
| Mifflin relationship | `10 × kg + 6.25 × cm − 5 × age + sexAdjustment`; male 5, female −161 |
| Estimated baseline | `round(max(1200, 2300 + BMR(inputs) − BMR(reference)))` |
| Reference | 180 lb, 71 in (5'11), male, age 18 → exactly 2,300 kcal before activity |
| Input handling | Estimated height clamped 48–96 in; age 13–100; custom baseline used directly |
| Walking | `milesWalked × weightLb × 0.45` |
| Running | `milesRun × weightLb × 0.72`; pace label is not another equation input |
| Lifting | `lifted ? liftHours × 175 : 0`; not bodyweight-scaled |
| Custom cardio | Sum nonnegative entered calories for the selected date |
| Maintenance | Rounded baseline + walking + running + lifting + selected-date cardio |
| Goal days | `max(1, round((deadline − selectedDate) / 86400000))`, dates constructed at noon |
| Goal adjustment | `(targetWeightLb − weightLb) × 3500 / goalDays` |
| Calculated target | `round(maintenance + goalAdjustment)`, without former percentage caps |
| Weekly rate | `(targetWeightLb − weightLb) × 7 / goalDays`, converted for kg display |
| Protein/fat | `round(weightLb × configured gramsPerLb)` independently |
| Carbs | `max(0, round((selectedTarget − 4 × protein − 9 × fat) / 4))` |
| Macro calories | `round(4 × protein + 4 × carbs + 9 × fat)` |

Reference example: four miles walked, no running, 1.5 hours lifting at 180 lb gives `2300 + 324 + 262.5`, rounded to **2,887 kcal maintenance** before custom cardio. Changing only the weight goal/deadline does not change that maintenance.

Do not restore the former 25% deficit / 15% surplus caps or inactive vanilla app's 1,200–6,000 calorie clamp. Extreme math can give zero/negative calculated targets, shown with a warning. Expired/current deadlines use one day with a warning. Large implied surpluses get explanatory copy. Carbs floor at zero, so automatic macro calories can exceed an extremely low target.

Manual calories and macro grams are independent. A zero manual calorie input currently falls back to the calculated target despite the input allowing zero; this is an audit finding, not an intentional new behavior.

## Local development and build

Use **Node 22+** for a fresh install. Earlier Node 18 guidance predates the currently resolved Supabase package: Vite 5 supports Node 18, but the allowed Supabase range resolved during this audit to a version requiring Node >=22. Audit runtime was Node 24.22.1/npm 11.9.0. No `engines` or runtime pin is checked in at the baseline.

```bash
git clone https://github.com/JaiBehl/Powerbuild.git
cd Powerbuild
npm install
npm run dev
```

Use the address Vite prints, normally `http://localhost:5173`. macOS/Windows/Linux run through Node and a browser; no native build. Dev/preview bind to `0.0.0.0` in the configured scripts.

For cloud-enabled development, copy `.env.example` to `.env.local`, fill the intended project's public settings, and restart Vite:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Without these, local persistence works and cloud sync is unavailable. Browser storage must be accessible. Never put secret/service-role keys in any `VITE_` variable or committed file; Vite exposes frontend values in the bundle.

```bash
npm run build
npm run preview
```

Build runs `vite build` to `dist/`; preview serves that output, normally on port 4173. Neither is a deployment. Do not use `node build.mjs`.

| Dependency | Declared range | Audit fresh-install resolution |
| --- | --- | --- |
| Vite | `^5.4.15` | `5.4.21` |
| React / React DOM | `^18.3.1` / `^18.3.1` | `18.3.1` / `18.3.1` |
| Recharts | `^2.15.1` | `2.15.4` |
| lucide-react | `^0.468.0` | `0.468.0` |
| @supabase/supabase-js | `^2.57.0` | `2.118.0` |

No lockfile is committed at the audited baseline. Observed versions are not pins and can change. Use `npm install`, not `npm ci`, until a lockfile exists. There are no test/lint/format/typecheck scripts or established application test suite. The documentation check added here is not an application test.

## State, persistence and compatibility

Each profile holds a normalized database:

| Field | Shape/meaning |
| --- | --- |
| `settings` | `startDate`, `startWeight`, `targetWeight`, `weightDeadline`, `strengthDeadline`, `units`, `schedule`, `cycleOffset` |
| `strengthGoals` | `[{ id, exercise, targetWeight, deadline }]`; weights in lb |
| `sessions` | `[{ id, date, type, notes, finished, exercises }]` |
| `exercises[]` | `{ id, name, range, target, kind, sets }`; imports may also carry source metadata |
| `sets[]` | `{ weight, reps, rpe, done, tag }`; weight in lb; empty values can be `''` and entered values can be strings |
| `weights` | `[{ date, weight }]`, optionally with imported IDs/metadata; weight in lb |
| `calories` | `[{ date, items: [...], cardio: [...] }]` |
| `items[]` | `{ id, name, meal, servings, perServing, calories, protein, carbs, fat, sourceSavedFoodId? }`; top-level nutrients are consumed totals |
| `cardio[]` | `{ id, name, durationMinutes, calories }` |
| `savedFoods` | `[{ id, name, meal, calories, protein, carbs, fat }]`; nutrients per one serving |
| `calorieSettings` | Baseline mode/demographics, activity inputs, protein/fat rates, automatic/manual target modes and override values |
| `templates` | Map of workout name to tuples `[name, setCount, repRange, effortTarget, kind?]` |

Fresh settings: start `2026-10-12`, starting weight `180`, target `160`, bodyweight deadline `2027-04-12`, strength deadline `2027-10-12`, units `lb`, weekdays `[1,2,3,5,6]` (Mon=1), offset `0`. New profiles have empty logs/library/strength goals and cloned default templates.

Fresh calorie settings: `baselineMode: estimate`, custom baseline `2300`, height `71`, bodyweight override `null`, male, age `18`, walking `4`, running `0`, lifted `true`, duration `1.5`, protein `1 g/lb`, fat `0.3 g/lb`, calculated calories/macros, null manual overrides. Age is editable but does not automatically advance on birthdays.

### Storage keys and profiles

| localStorage key | Contents |
| --- | --- |
| `powerbuild-profiles-v1` | `{ profiles: [{ id, name, createdAt }], activeProfileId }` |
| `powerbuild-tracker-v1:profile:<id>` | One profile database |
| `powerbuild-cloud-last-v1:<auth-user-id>` | Last accepted/uploaded account snapshot for comparisons |
| `powerbuild-tracker-v1` | Legacy React single-profile DB, migration source |
| `powerbuild-app-v1` | Legacy vanilla state, partial migration source |

Without valid profile metadata, `ensureProfiles` initializes `primary` / `My profile` from legacy data if available. A valid older React DB is normalized; eligible legacy goals migrate only when an explicit goal array is absent. The vanilla fallback carries selected goal/bodyweight/activity fields but initializes sessions/calories empty: it does **not** convert old `workoutLogs` or customized rotation. Preserve old keys/backups if further migration is needed.

Profile creation requires a nonblank case-insensitively unique name. Switch/rename are supported. Only inactive profiles may be deleted and the last profile cannot be deleted. Switching resets shared UI to Train/today. Profiles isolate logs/settings but are not separate password-protected identities.

lb/kg mode only converts at display/input/export boundaries; stored pounds remain unchanged. Macro g/kg converts to/from stored g/lb. Height remains feet/inches and activity remains miles in kg mode.

**Date scope:** walking, running, lifting, calorie-weight override, baseline demographics, calorie/macro modes and targets are profile-wide, not daily snapshots. Changing them can change the estimate displayed for other dates. Foods and custom cardio are date-specific. The selected date is shared React state. Collapse flags, chart ranges and component-local drafts are not persisted in storage/cloud; minimizing keeps content mounted, while switching tabs/remounting can reset local UI state.

### Backups, CSV and reset

- Export profile backup downloads the active DB as `powerbuild-<profile-name>-backup.json`, without profile-list metadata or Supabase session.
- Import into this profile validates basic shape and **replaces** the active profile after confirmation. This differs from historical merge. Missing supported fields normalize with defaults; nested data is not exhaustively validated.
- Export sets CSV contains every session/exercise/set row: date, workout, exercise, set, displayed weight/unit, reps, RPE, tag, completed. It does not export nutrition/bodyweight. CSV quotes are escaped.
- Reset clears active-profile logs, foods, goals, templates and settings after confirmation; other profiles stay. An active cloud connection can propagate that reset in its next account snapshot.
- Sign-out retains device data. Localhost, preview and production origins have separate browser storage. Same account on the same site is the intended cross-device workflow.

## Supabase cloud sync and authentication

See [CLOUD_SYNC_SETUP.md](CLOUD_SYNC_SETUP.md) and [the migration](supabase/migrations/20261029_cloud_sync.sql). This is optional account sync, not a custom server implemented in the repo.

### Setup and first-device migration

1. Use the intended Supabase project and apply the checked-in SQL through SQL Editor. Inspect existing tables/policies/function before changing an already configured project.
2. Enable email/password authentication; confirm signup first if email confirmation is enabled.
3. In Authentication → URL Configuration, set Site URL to the production origin. Allow origins used for signup/confirmation redirects, including local/preview testing where appropriate. Signup/resend explicitly pass `window.location.origin` as `emailRedirectTo`.
4. Configure `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` in the intended Vercel Production/Preview environments, then rebuild/redeploy; these are build-time values.
5. On the device with existing logs, export the profiles' JSON backups, sign in, select Upload this device if cloud is empty, and wait for Cloud sync active.
6. On the second device, open the same site and sign into the same account. Select Use cloud data when prompted. Verify workout, weight, food, saved-food and cardio entries both directions.

Past incident: verification links redirected to `localhost:3000`; an old link had `otp_expired`. PR #12 added current-origin redirects and Resend confirmation email. Dashboard Site URL/allowed redirects still must match. Use the newest email; code changes cannot revive an expired link. No password-reset interface is implemented.

### Snapshot, retry and conflict contract

Cloud payload: `{ profileState, profileData }`. Metadata includes the profile list and active profile ID; data maps all listed profile IDs to full databases. **All profiles and the active selection** belong to one account snapshot, not separate profile accounts/tables.

- Sign-in fetches the account row. Empty cloud offers upload; matching snapshots synchronize; a recognizable clean older local copy can accept remote data. Otherwise ask which version to keep.
- Stable serialization sorts object keys but keeps array order.
- Local edits debounce 900 ms before RPC upload with expected revision. Successful saves increment revision.
- Poll newer remote revisions every 12 seconds while synchronized and on tab visibility changes. This is not Supabase Realtime.
- Divergent versions show Use cloud data / Keep this device data. There is **no automatic record/field merge**. Using cloud applies its entire profile list/data; keeping device replaces the cloud account snapshot after confirmation.
- Failed uploads retain local data, expose error/retry and retry after roughly 10 seconds. Initial-load errors also expose retry.
- Signing out keeps local data. Check which local data is present before uploading to another account in a shared browser.
- Locally loaded app data can still be edited during network loss, but there is no service worker, PWA manifest or background sync worker guaranteeing a fresh offline page load.

### SQL and live audit

`public.powerbuild_cloud_state`: `user_id uuid` PK/FK to `auth.users` with deletion cascade; `payload jsonb`; `revision bigint` default 1; `updated_at timestamptz` default now. This does not create an account-deletion UI.

RLS is enabled. Authenticated SELECT/UPDATE restrict `auth.uid() = user_id`; INSERT/UPDATE checks enforce ownership. Authenticated roles have SELECT/INSERT/UPDATE grants. `powerbuild_save_state(expected_revision, payload)` is `SECURITY INVOKER` with `search_path = public`, requires auth, inserts for expected revision 0 or updates a matching revision, and raises `SYNC_CONFLICT` if no row saved. Execution is revoked from public/anon and granted to authenticated. The actual argument names are `p_expected_revision` and `p_payload`.

The migration and live table/RLS policy/function metadata were reviewed without reading private cloud payloads or changing data. Ownership RLS protects accounts; revision enforcement belongs to this app's RPC save path. The grants do not require every other same-account client to use the RPC. There is no cloud revision history, per-profile restore endpoint or SQL payload-size/schema validation.

## Historical Apple Notes import

Settings imports **converted historical JSON**, not raw ZIP/Markdown/PDF. The browser validation/merge code is in the repo; a Notes-to-JSON converter and private converted workout data are not. The supplied Notes archive mixes multiline dated sets and weigh-ins with unrelated notes; conversions should select relevant workout/bodyweight files and exclude unrelated personal material.

Latest conversion instruction: floor fractional reps to whole reps, merge usable records into the remaining history and discard other review-flagged records. Failures can be zero-rep attempts and must not create successful e1RM points. That cleanup is a conversion step: the browser importer does not floor reps, interpret free text, parse a ZIP or remove review flags automatically.

Minimal **synthetic** import, using canonical pound values and stable IDs:

```json
{
  "format": "powerbuild-historical-import-v1",
  "metadata": { "importId": "example-stable-import-id" },
  "sessions": [
    {
      "id": "example-session-2026-01-02",
      "date": "2026-01-02",
      "type": "Historical workout",
      "notes": "Synthetic source note",
      "finished": true,
      "exercises": [
        {
          "id": "example-exercise-2026-01-02",
          "name": "Barbell bench press",
          "range": "Historical",
          "target": "",
          "kind": "strength",
          "sets": [
            { "weight": 100, "reps": 5, "rpe": "", "done": true, "tag": "" }
          ]
        }
      ]
    }
  ],
  "weights": [
    { "id": "example-weight-2026-01-02", "date": "2026-01-02", "weight": 180 }
  ]
}
```

UI limit: 5,000,000 bytes. Validator limits: 5,000 sessions; 30,000 weights; 200 exercises/session; 300 sets/exercise. It checks YYYY-MM-DD shape and finite positive bodyweight up to 1,000 lb, not every set field or valid calendar date. Supply stable unique IDs even where validation does not require them.

Merge rules:

1. Add new dates with an import marker in notes.
2. Existing date keeps its ID/type/finished state/exercises. Skip incoming exercise when string ID or trimmed case-insensitive name already exists. Same-name exercise sets are **not** merged individually.
3. Append source notes once using `[Apple Notes import: <importId> / <date>]`. Keep the import ID stable across repeats.
4. Existing same-day bodyweight or matching ID wins; add other dates. Missing IDs can collide as string `undefined`, so converters must assign them.
5. Sort sessions/weights chronologically. Preserve settings, goals, templates, calories, foods, cardio and other data.

Repeat importing the same well-formed archive is safe. This is not an overwrite/correction/deletion tool. A revised same-name exercise can be skipped; removing a record from an input file does not remove it from the profile. A cleaned re-import will not delete already imported questionable records; that needs an explicit, backed-up cleanup plan.

## Deployment and verification

Existing hosting target: Vercel `powerbuild-flexible-goals` for this GitHub repo. Intended configuration: repo root, Vite, `npm run build`, output `dist`. Feature branches/PRs historically create previews; merging `main` feeds production. Baseline has no `vercel.json` or application GitHub Actions deployment workflow; dashboard settings/Git integration are external configuration.

Build and check changed flows, inspect preview, merge as authorized, then verify production. Do not claim a production deployment based only on a local change, commit or preview. Rebuild after environment changes. Preserve the established hosting project unless asked otherwise.

### Audit verification record — October 30, 2026

| Check | Result and limit |
| --- | --- |
| Coverage | All 34 baseline files and merged PRs #1–#22; active versus legacy source distinguished |
| Fresh install | Passed on Node 24.22.1; versions listed above; no lockfile generated/committed by this audit |
| Production build | `npm run build` passed; about 625.54 kB minified JS / 179.14 kB gzip, with >500 kB chunk warning |
| Pure functions, synthetic inputs | Passed schedule/rest rotation, session isolation, unit/macro-rate conversion, Epley bounds, serving math, saved-food snapshot independence, legacy portions, same-date historical collisions and repeat-safe import |
| Server-rendered calorie checks | Passed 2,300 baseline / 2,887 reference activity maintenance, goal-independent maintenance, uncapped negative math/warning, independent manual calories/macros, dated cardio addition |
| Production static access | Site and JS HTTP 200; expected latest panels and Supabase URL/public-key configuration present in deployed JS |
| GitHub Vercel status | Success for the documented application SHA |
| Live Supabase metadata | Healthy project; RLS table, ownership policies and invoker save function present; no private payload read |
| Supabase security advisor | One warning: leaked-password protection disabled; [remediation guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) |
| Vercel detail access | Project listing succeeded; deployment listing 403 and project detail 404 with available connection; no CLI installed. Dashboard build/env configuration not independently confirmed through those endpoints |
| Authenticated devices | Signup/confirmation, first upload, two-device changes/conflicts, account switching and offline recovery were not exercised in this audit |

The focused checks were one-time audit checks, not a committed `npm test` suite. Source/static/build verification does not prove every interactive or authenticated flow passed.

### Regression checklist for subsequent changes

- Train: start scheduled/manual, enter/complete sets, customize exercise/template, add/remove set, save notes, refresh, finish/reopen, inspect later session.
- Schedule/Progress: keep date-based rotation; open imported dates/notes; year/search/load-more for workouts/weights; correct chart ranges/tooltips and lb/kg display.
- Nutrition: reference baseline, gain/loss math, manual overrides, zero-carb floor, dated food/cardio isolation, fractional servings and saved-template independence.
- UI: desktop/phone layout; minimize every changed panel while descriptions/counts remain; reopen without losing mounted drafts/filters.
- Profiles/history: separate profiles; export/import/reset disposable active profile; repeat synthetic history merge; preserve supported older backups.
- Cloud when changed: disposable data/accounts; confirmation redirects/resend, both-device changes, conflicts, retries, sign-out. Do not perform destructive tests on the user's actual history.

## Known limitations and follow-up opportunities

These are observations/potential next tasks, not changes implemented by this README.

| Area | Finding |
| --- | --- |
| Reproducibility | No lockfile/Node pin; allowed Supabase range now resolves to Node >=22 |
| Legacy build/source | Old scripts/CSS/copier coexist with React; retire only after reviewing migration needs |
| Legacy migration | Vanilla `workoutLogs`/custom rotation are not converted; preserve originals for recovery |
| Cloud confidence | Authenticated two-device flow needs verification; conflict choice replaces all-profile snapshot |
| Shared-device privacy | Local profile cache remains after sign-out and is not account/password-isolated |
| Historical estimates | Activity, weight override and targets are profile settings, not daily snapshots |
| Manual target zero | Input allows zero; calculation treats non-positive override as absent |
| Validation/storage | Backup/cloud/history validation is shallow; local-storage quota/errors have no recovery UI |
| Exercise identity | Exact-name charts split related lifts. Customizing an old/imported session updates future template by index, which may target the wrong template exercise if orders differ |
| Import corrections | Existing names/same-day weights win; repeat import cannot delete old questionable records |
| Dates/locales | Some local-noon navigation uses `toISOString()` and schedule loops fixed millisecond days; test DST/far-offset timezones before expanding locale handling |
| UI persistence | Collapse flags/chart ranges/local drafts do not persist across remount/reload. Unused older CSS/comments can describe superseded behavior |
| Metrics | Epley used even for singles; done sets count before finishing; goals show latest estimate rather than peak |
| Performance | Large-bundle warning; fresh Recharts 2 install printed deprecation notice; upgrade/split only with regression checks |
| Test infrastructure | No application suite/lint/typecheck; documentation check is not runtime validation |
| Auth settings | Leaked-password warning remains; confirmation dashboard configuration was not independently read during this audit |

Previously discussed 150–200-lb bodyweight sliders, per-lift bodyweight-scaled/exponential targets and pinning a chat calculator are not implemented as those controls in the active app. Weight uses numeric inputs and strength goals are independently edited records. No native mobile app, PWA/offline asset cache, raw ZIP importer, direct Apple Notes/Canvas integration, automatic training progression, external food database, password-reset screen or field-level cloud conflict merge exists. Treat requests for these as new work.

## Implementation history

All PRs below were merged by the application baseline. Later implementations supersede earlier descriptions, particularly UI restoration and panel behavior.

| PR | Change |
| --- | --- |
| [#1](https://github.com/JaiBehl/Powerbuild/pull/1) | Custom exercises per workout |
| [#2](https://github.com/JaiBehl/Powerbuild/pull/2) | Earlier workout-layout restoration |
| [#3](https://github.com/JaiBehl/Powerbuild/pull/3) | Screenshot-era UI restoration |
| [#4](https://github.com/JaiBehl/Powerbuild/pull/4) | Session notes restored |
| [#5](https://github.com/JaiBehl/Powerbuild/pull/5) | Actual original React/localhost UI restored with sticky sidebar/customization |
| [#6](https://github.com/JaiBehl/Powerbuild/pull/6) | Isolated local profiles |
| [#7](https://github.com/JaiBehl/Powerbuild/pull/7) | Automatic baseline and custom override |
| [#8](https://github.com/JaiBehl/Powerbuild/pull/8) | Arbitrary optional goals and kg mode |
| [#9](https://github.com/JaiBehl/Powerbuild/pull/9) | Goal wording/spacing |
| [#10](https://github.com/JaiBehl/Powerbuild/pull/10) | Custom cardio by date |
| [#11](https://github.com/JaiBehl/Powerbuild/pull/11) | Supabase account/snapshot sync |
| [#12](https://github.com/JaiBehl/Powerbuild/pull/12) | Email confirmation redirect/resend |
| [#13](https://github.com/JaiBehl/Powerbuild/pull/13) | Repeat-safe history JSON merge |
| [#14](https://github.com/JaiBehl/Powerbuild/pull/14) | Cleaner e1RM chart/full dates |
| [#15](https://github.com/JaiBehl/Powerbuild/pull/15) | All-years searchable workout history |
| [#16](https://github.com/JaiBehl/Powerbuild/pull/16) | All-years weigh-ins/bodyweight chart |
| [#17](https://github.com/JaiBehl/Powerbuild/pull/17) | Initial Progress minimize controls |
| [#18](https://github.com/JaiBehl/Powerbuild/pull/18) | Uncapped target math, manual calories/macros, individual foods |
| [#19](https://github.com/JaiBehl/Powerbuild/pull/19) | Saved Foods/fractional servings |
| [#20](https://github.com/JaiBehl/Powerbuild/pull/20) | Compact saved-food cards |
| [#21](https://github.com/JaiBehl/Powerbuild/pull/21) | Separate collapsible nutrition panels |
| [#22](https://github.com/JaiBehl/Powerbuild/pull/22) | Shared collapsible cards across all five tabs |

### Documentation handoff — October 30, 2026

Replaced the placeholder README with this audit/context guide; added AI maintenance instructions, a PR checklist and a README companion-change check. No application source, dependencies, user history, private Notes content, database schema, auth settings or hosting settings were changed by the documentation task.

## Keep this file current

1. Read `AGENTS.md`/README before editing. Fetch current source and inspect commits/PRs after the documented baseline.
2. In the **same change** as a feature/fix/configuration change, update the relevant feature, file map, calculations, state/compatibility notes, setup, issues and validation. Remove superseded claims rather than leaving contradictory notes.
3. Refresh reviewed source baseline/date when runtime behavior changes and append a short implementation/verification note with PR/commit when known. Identify source actually reviewed; never invent a SHA. Docs-only changes can retain the application baseline.
4. Keep requested, implemented, built, deployed and end-to-end verified separate. Record unresolved gaps and external configuration only when checked.
5. Keep this README useful by itself for a new chat; link supporting docs without outsourcing the core contracts. Use synthetic examples and public/placeholders for configuration.
6. State what changed, why, checks run and remaining limits in the PR handoff/checklist.

`README companion change` checks PR filenames and fails when application/configuration files change without a current `README.md` edit. It does not generate prose, verify factual completeness, run the app or automatically configure required branch protection. Direct pushes need the same discipline. Review maintains accuracy; this check catches a missing companion update.

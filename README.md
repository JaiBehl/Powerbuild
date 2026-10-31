# Powerbuild

Powerbuild is a local-first powerbuilding web app: workout/set logging, reusable workout/exercise libraries, editable saved training schedules, strength goals and PRs, bodyweight trends, maintenance/macros, individual food logs, saved foods and cardio. Optional Supabase accounts synchronize profiles across devices. React/Vite builds the frontend; Vercel hosts it.

This README is the product manual and the handoff for a fresh AI development conversation. Read it with `AGENTS.md`, then inspect current source. Live user logs, private Notes exports and credentials are not included.

## Current release and continuation

| Item | Current context |
| --- | --- |
| Repository | [JaiBehl/Powerbuild](https://github.com/JaiBehl/Powerbuild), public; default branch `main` |
| Site | [powerbuild-flexible-goals.vercel.app](https://powerbuild-flexible-goals.vercel.app) |
| Hosting | Existing Vercel project `powerbuild-flexible-goals`, team/dashboard slug `power-build` |
| Backend | Supabase project `zgbldcmahkokmkfqeljh`; Auth and the account-snapshot table/RPC described below |
| Source reviewed through | [8758a2c9a550acad4376d58772c467ba4046a03d](https://github.com/JaiBehl/Powerbuild/commit/8758a2c9a550acad4376d58772c467ba4046a03d) |
| Release work | [PR #29](https://github.com/JaiBehl/Powerbuild/pull/29): reusable workouts/exercises, saved whole-program schedules, and bodyweight/weighted calisthenics; follows maintenance PR #28 and records PRs #26–#27 |
| Date | October 31, 2026, UTC |
| Validation | 124 unit/integration + 70 Chromium browser tests, zero failures; production build; [complete source gate](https://github.com/JaiBehl/Powerbuild/actions/runs/41201029796) |

The source baseline identifies code actually reviewed and tested. Documentation-only or merge commits may be newer. Fetch current `main`, inspect commits since that baseline, and check open PRs before changing anything. Current source governs implemented behavior; the latest explicit user instruction governs desired behavior.

Suggested prompt when uploading this file to a new AI chat:

> Continue Powerbuild from this README. Read AGENTS.md and the current source, compare main with the documented baseline, and inspect the code relevant to my request. Preserve existing data and the established UI. Implement changes one at a time, add a regression test, and keep the full suite passing before continuing. Update this README in the same PR and report actual validation and remaining limits.

Source access is still required for edits. Current workouts, foods, goals and profile settings must come from the app or a supplied backup; never reconstruct them from fresh defaults or old chats.

## Product decisions

- Preserve the restored original React/localhost UI: dark navy cards, POWERBUILD / STRENGTH × PHYSIQUE branding, readable set tables and sticky desktop sidebar. Respect requests to change only a named area.
- Every main content panel minimizes independently. Keep its toggle, title, mini-description and useful summary/count visible while minimized; keep the hidden content mounted so minimizing does not discard a draft.
- Panel state is remembered on the device by profile, tab and panel. Exercise cards use stable template/session identity. These preferences are separate from synced training data.
- Separate Bodyweight goal, Baseline maintenance, Daily activity, Custom cardio, Daily calorie target, Macro targets, Food & meal log and Saved Foods cards. Saved Foods sits below the food log and its individual cards remain compact.
- Calculate maintenance independently of goals. Keep uncapped goal/deadline arithmetic, manual calorie/macro overrides and warnings for impossible or expired goals.
- Store weights in pounds and convert only at input/display/export boundaries. Saved-food edits must never change previously logged nutrition.
- Workout exercise edits affect the session by default. Updating future templates requires explicit permission, reset for each workout; match stable identity, not position.
- Supported seated barbell OHP means upright back support. The legacy bench goal is touch-and-go. Keep paused/incline/standing variations distinct unless the user explicitly links names.
- Goals are editable data. Earlier chats included a January 12, 2027 weight deadline and later bulk/cut plans; fresh code defaults use April 12, 2027. Do not impose past plans or fresh defaults on an existing profile.
- This repository is public. Never commit personal workout/food backups, Notes ZIPs, account emails, real auth tokens or secret/service-role keys. Test with synthetic data.

## Features by tab

### Training library

- **Exercise library / Exercise editor** keep reusable definitions with default sets, rep ranges, effort, creation/update dates, duplication, archive and 10-version edit history. Existing template and historical names seed the catalog without inventing original dates. New exercises created through the workout/session editors enter the same catalog.
- Workout templates and Train can reuse saved exercises. Exercise renames update linked future templates and add an old-label link for progress continuity; existing session names/sets are not rewritten. Reloading resolves historical labels to their renamed definitions without recreating obsolete catalog entries. Applying new default prescriptions to linked templates is explicit. Per-workout overrides remain possible, and changing an exercise name directly in a template detaches its old catalog link.


- **Library → Workout library** lists every saved workout with creation/update dates, search, duplication and an archived-workout view. Existing templates migrate with stable IDs without inventing historical creation dates.
- **Workout editor** creates and edits the reusable template, including name, description, exercise order, set counts, rep ranges, effort targets and strength/accessory focus. Edits affect new sessions; logged sessions retain their original names/sets. Select in Train chooses the workout without overwriting an occupied date.
- Renames update the active rotation while stable workout IDs keep old session-to-template links usable. Session-only edits remain the default in Train. Future-template edits also enter workout edit history.
- Up to 10 previous workout versions can be restored. Archiving retains the workout and its logs; active schedule references must be removed first. Library data is profile-scoped and survives backup, recovery and cloud snapshot normalization. Editing a catalog definition does not rewrite dated session snapshots.
- Phone navigation and wide record/library tables stay within their scroll containers as the Library tab is added.
- Phone regression failures report the overflowing elements' layout bounds for diagnosis alongside screenshots/traces.
- Inactive chart tooltips are removed from layout so their hidden boxes cannot create horizontal page scrolling; active tooltip behavior remains covered.


### Bodyweight and weighted calisthenics

- Toggle **Bodyweight exercise** in the exercise editor, each workout-template row or the current session. Bodyweight mode logs **added weight**; zero is bodyweight only. Default added load is reusable; individual sets can vary it. External-load exercises keep their normal weight fields. Both modes convert correctly between lb/kg while storing pounds.
- The exercise library includes Push-up, Pull-up, Chin-up, Dip, Inverted row and Bodyweight squat. Unambiguous calisthenic names seed bodyweight defaults for future templates; ambiguous “Pull-up or lat pulldown” stays external until explicitly chosen. Existing logged sets retain their prior interpretation. Switching a populated session asks before changing the meaning of its weights and saves recovery; applying mode changes to future templates remains explicit.
- Absolute strength records includes **Bodyweight exercise records**: most bodyweight-only reps, heaviest added load and best added load at each rep count, all-time/recent, with dated bodyweight context. These sets do not become external-load 1RMs or relative lift/BW ratios. Previous performance matches the resistance mode and labels BW + added weight. External-load volume counts added weight only, without guessing how much body mass a movement displaces.
- JSON/program snapshots retain mode/default added load. Sets CSV appends Resistance and Load basis columns; its Weight field means added load for bodyweight exercises. No assistance-load calculator or movement-specific effective-mass model is included.

### Train

- Date picker, previous/next day and Today; scheduled-workout/rest label. Date is shared with Progress and nutrition.
- Start the scheduled workout or any active saved workout manually, including on rest days. The model is one session per date.
- Each exercise logs weight, reps, optional RPE, done flag and Top/Backoff tag; add/remove sets. Overview shows completed/total sets, completed volume and finished status.
- Add any exercise; edit name, rep range or effort; remove an exercise. By default these affect only this session. The explicit future-template checkbox also updates the matching template. Ambiguous older links are rejected instead of changing the wrong exercise.
- New unsaved exercises start at three sets, 8–12 reps, 1–2 RIR; choosing a saved exercise uses its defaults. Individual set-count changes affect the session, not the future template.
- Previous finished session appears beside the current sets, using movement aliases and current units. It excludes the current/future dates and does not overwrite current inputs.
- Notes save as typed. Finish/reopen changes status; delete requires confirmation and creates a recovery copy. Finishing does not manually advance the date-based rotation.

### Schedule and default program

Cycle: **Push A → Pull A → Legs A → Push B → Pull B → Legs B**, continuing across weeks. Fresh weekdays are Monday/Tuesday/Wednesday/Friday/Saturday. Schedule edits weekdays, start date, starting slot and the complete rotation. Settings also retains the rotation weekday/offset controls. Planned rotation advances on scheduled dates even if a workout is skipped. Dates before the start have no plan. Calendar arithmetic is date-only and timezone/DST independent.

**Schedule editor** supports repeating rotations (reorder/add/remove slots, repeat workouts, explicit Rest slots, selected training weekdays) or fixed Monday–Sunday assignments. Changes update planned dates while logged sessions remain unchanged. Rotation slots have explicit accessible labels, including on phones. Apply saves a recovery copy first.

**Saved schedules** stores named complete program snapshots with descriptions, creation/update dates, search, copies, archive/restore and up to 10 previous versions. Loading fills the editor for review; Apply activates it. A saved program includes its referenced workout templates and prescriptions, independent of later edits. Restore workout templates is selectable when applying a saved plan; disabling it uses current templates. Restoration matches stable workout IDs, preserves workout logs and avoids overwriting unrelated name collisions. A draft containing two names for the same stable workout is rejected with guidance to choose one name or duplicate it first. The **Schedule application log** keeps the last 100 applied programs, each loadable for reuse. Libraries and application history are profile-scoped and included in backups/cloud snapshots. An all-profile restore returns to Train for the restored active profile; reopen Settings to export.

Browse previous/current/next week, open dates in Train, see finished indicators and completed/planned counts, and preview template exercise counts.

| Workout | Default exercises and set counts |
| --- | --- |
| Push A | Barbell bench press 4; Supported seated barbell OHP 3; Incline machine or DB press 2; Cable lateral raise 3; Overhead cable triceps extension 2; Cable pec fly 2 |
| Pull A | Chest-supported upper-back row 3; Neutral-grip lat pulldown 3; Reverse pec deck 3; Preacher curl 3; Incline dumbbell curl 2; Forearm flexion/extension 2 |
| Legs A | Barbell back squat 4; Seated leg curl 3; Leg extension 3; Standing calf raise 3; Hip adduction 2; Cable crunch 3 |
| Push B | Supported seated barbell OHP 4; Touch-and-go bench press 3; Incline press 2; Cable lateral raise 3; Cable pec fly 2; Triceps pushdown 2 |
| Pull B | Pull-up or lat pulldown 3; Chest-supported row 3; Single-arm cable lat pulldown 2; Cable rear-delt fly 2; Incline dumbbell curl 3; Preacher or cable curl 2; Forearm flexion/extension 2 |
| Legs B | Barbell back squat 3; Romanian deadlift 2; Seated or lying leg curl 3; Leg extension 3; Seated calf raise 3; Hanging leg raise 3 |

Exact rep/effort prescriptions live in `src/data.js`; profiles can override templates. Push A bench, Legs A squat and Push B supported OHP have explicit strength Top/Backoff tags, generally 3–5 top / 4–6 backoff. The default deadlift is Romanian on Legs B; conventional deadlift may be custom or historical.

### Progress

- Overview of finished sessions, completed sets, latest weight and target.
- Optional strength goals for any exercise, with individual target weight/deadline; add/edit/remove in Settings. New profiles start with none. Eligible original-profile migrations retain the older 405/315/225-lb squat/touch-and-go bench/supported OHP goals; these are not universal defaults.
- Set-based strength chart and separate raw-weight/seven-day-average chart. Independent 3M/6M/1Y/All controls, default 6M, measured back from the latest point in that series. Tooltips show full dates and units.
- A completed single retains its achieved load. Predictions interpolate the Nuzzo 2024 population tables (flat barbell bench, leg press, or general). Recorded RPE 7–10 adds `10 − RPE` estimated reps in reserve, including half points; at most 10 effective reps qualify. Blank RPE is explicitly labelled as an assumption of failure. Easy/high-rep/invalid sets remain logged but do not generate predictions. The chart takes the highest qualifying value per movement/date, including done sets in unfinished sessions.
- **Absolute strength records** (formerly Personal records) separates achieved singles, RPE-aware estimated 1RM (including submaximal singles), and best load at every rep count. Compare all time through the selected date with the last 90 calendar days. Each winning record also shows `load / historical bodyweight × 100`, to one decimal, in both columns. For example, 225 lb at 180 lb is **125.0% BW**. Percentages use unrounded canonical values and stay unchanged in kg mode; estimated bodyweights or predicted 1RMs carry an **Est.** prefix. Missing bodyweight or unsupported bodyweight/assisted resistance omits the percentage. Absolute winners still maximize load, not the percentage. The old panel preference key is retained so the rename preserves saved minimize state. Future sets are excluded and ties retain the first achievement date.
- Each absolute PR shows bodyweight for its own achievement date. Use the mean of valid same-day weigh-ins; otherwise linearly interpolate between the surrounding weigh-ins when each is within 30 calendar days, or use the nearest within 30 days. Derived bodyweights are labelled **Est. BW** with source dates/method. Only measurements through the selected records date are considered. Missing/stale measurements show **BW unavailable**; current/default/calorie weights are never substituted. Editing a weigh-in recalculates context without changing any lift, and kg display converts both loads and bodyweights from stored pounds.
- The independently collapsible **Relative strength records** panel ranks every qualifying set by unrounded `lift / bodyweight`, separately for achieved singles, RPE-aware estimated 1RMs and each rep count. It selects its own best sets, rather than dividing the absolute PR by bodyweight. All-time and last-90-day comparisons share the movement/date controls with absolute records and the chart; ratios display to three decimals and are unit-invariant. Missing/stale bodyweights are excluded; estimated bodyweights retain their provenance. Bodyweight/assisted movements are excluded because added load/assistance is not total resistance. Compare the same movement and equipment; this simple ratio is not an allometric or competition score. Ratios/context are derived at render time, never persisted over historical logs.
- Standard bench labels share a movement series; custom reversible aliases and same-name opt-outs are in Settings. Linking does not rewrite original logs. Charts, goals, previous-session comparisons and records use the same resolution.
- Weekly review covers seven days ending on the selected date: finished workouts/sets/volume, average consumed calories/protein on food-log days, custom cardio, weight average and change versus the preceding week. Missing days are unknown, not zero. Multiple weigh-ins on one day are averaged before averaging days.
- Workout and bodyweight history include every year, year/search filters and 30-record increments. Workout search includes date/type/exercises/notes; opening a workout shows its original date/notes.
- Saving a weigh-in replaces that date's measurements. Deleting removes only the selected record, with recovery available.

### Calorie tracker, food and cardio

- Each recorded nutrition date has its own plan snapshot: baseline/demographics, activity, calorie/macro overrides and goal values. Food/cardio writes also snapshot a plan. Defaults seed new dates; an explicit action copies the selected day's settings into defaults.
- Settings labels distinguish new-date bodyweight defaults from an existing day's plan. Editing defaults does not rewrite a recorded day's activity, targets or fallback starting weight. Actual weigh-ins still update automatic weight selection for their dates.
- **Bodyweight goal** displays the signed **Weekly goal pace** in the expanded plan and minimized summary: `(goal weight − current calculation weight) × 7 / remaining calendar days`, in lb/week or kg/week to two decimals. It updates with the selected date, weigh-ins, manual weight, target and deadline. This is the average change needed to meet the goal, rather than a forecast from a manual calorie target. Invalid, today or expired deadlines show guidance instead of a misleading one-day rate; existing daily calorie warnings/arithmetic remain unchanged.
- Weight source is **Follow weigh-ins** or **Enter weight manually**. Reconnecting now changes the selected date and defaults for new dates, clearing stale manual default weights; choosing manual weight stays date-specific and starts from the current calculated weight. Existing explicit manual dates remain unchanged. Incomplete saved plans inherit the profile's weight mode rather than turning a retained number into an accidental manual override. Automatic uses the newest valid positive weigh-in on/before the calculator date (last recorded entry wins on a duplicate date), then the day's starting-weight fallback. The calculator date is visible at the top with a Today button; Baseline maintenance identifies the actual weigh-in date or manual/fallback source. Later weigh-ins do not rewrite earlier dates. Reconnecting is also available as a one-click button for older saved settings.
- Baseline uses resting metabolism × an explicit daily living factor (default 1.2), or an existing custom baseline. Default RMR is ten Haaf for recreational athletes aged 18–35; general-adult Mifflin–St Jeor is selectable and is the fallback outside that range. Under-18 results are flagged as outside adult validation. Height stays feet/inches; age is editable and does not increment automatically. The earlier forced 2,300 reference calibration is removed; explicit custom numbers remain unchanged. Formula-derived values, including estimates for earlier dates, recalculate under the new model; recorded foods, activity inputs and explicit overrides are not rewritten.
- Walking 0–15 miles and running 0–10 miles in 0.25 steps; running is labeled 5:00/mile. Walking pace is 15–40 min/mile (default 22.5). Lifted yes/no and 1–3 hours in 0.25 steps. Session-average lifting intensity is 3.5/5/6 MET (default 3.5), with rest subtracted and weight scaling. Duration/intensity disable when not lifted. Set RPE is not a valid calorie conversion and is not used as one.
- Custom cardio logs name, minutes and manually entered active/net kcal for a selected date. Only entered kcal affects expenditure; duration is recorded, not an automatic calorie estimator. Avoid counting the same activity in sliders, baseline factor and cardio. A known-total maintenance override in Daily calorie target replaces the entire baseline/activity sum; it does not add exercise again. This is separate from the existing custom baseline and custom calorie target.
- Calculated or manual calories; calculated bodyweight-based macros or independently entered protein/carbs/fat. A zero manual calorie target remains zero. Macro calories may differ from the calorie goal and the UI explains the difference.
- Individual foods: name, Breakfast/Lunch/Dinner/Snacks/Other, per-serving calories/protein/carbs/fat and serving amount. Blank calories compute from macros; explicit calories take precedence. Missing names, all-zero nutrition and negative/non-finite nutrients are rejected.
- Serving buttons ¼, ½, 1, 2, 3; custom positive decimal up to 100. Type `0.5`, not `1/2`, in the numeric field. Nutrient multiplication rounds to two decimals.
- Add/edit/delete meals, meal grouping and consumed/remaining totals. Older unnamed total-only entries remain supported.
- Save a new portion or bookmark a logged food. Saving a template does not log consumption. Search/edit/delete saved foods, choose meal/servings, then add to the selected date.
- Saved templates hold per-serving values. Logged entries retain independent `perServing` snapshots and consumed totals, optionally linked by `sourceSavedFoodId`; template edits/deletes cannot change past logs.
- Foods and cardio coexist in the same date record without overwriting each other. Libraries and logs are profile-scoped and included in backup/sync.

### Profiles, backups and recovery

- Sidebar profile create/switch/rename; names are nonblank and case-insensitively unique. Only inactive profiles can be deleted, and the last profile cannot be deleted. New profiles have separate empty logs/goals/saved programs and seed their own workout/exercise libraries from cloned templates.
- Profiles are local data partitions, not separate password-protected accounts. When signed in, all profiles sync to that account. Sign-out keeps local caches.
- Export profile backup is the active DB as `powerbuild-<name>-backup.json`; import validates it and replaces only that profile after confirmation/checkpoint. CSV exports every workout set in the selected unit, not food/weight logs.
- Structural deletions and explicit replacements/reset/import create a recovery copy first. If a recovery copy cannot be saved, replacement is blocked. Ordinary persistence failures display an error while in-memory edits remain exportable.
- Undo last change is available after a checkpointed change while no later data change has intervened. Later changes invalidate the immediate undo rather than silently discarding newer work; saved recovery versions remain in Settings.
- Recovery copies can be saved manually, downloaded and restored. All-profile export/import round-trips the profile list and databases; it also accepts account-copy JSON downloaded from Cloud Sync. Validate every listed profile and checkpoint the current workspace before restore.
- Deleting a profile checkpoints the whole workspace, allowing restoration of the profile list. Account recovery copies are also available in the Cloud Sync sidebar.
- Recovery is device-local, bounded to up to five versions per scope with older copies pruned for storage. Clearing browser data removes those versions. Keep downloaded backups for durable recovery.

## Calculation contract

These are implementation formulas, not measured energy expenditure or recommended intake.

| Quantity | Implementation |
| --- | --- |
| Canonical units | Pounds; height inches; macro rates g/lb; food macros g; kcal; distance miles |
| Conversion | `1 kg = 2.2046226218 lb`; `1 in = 2.54 cm` |
| ten Haaf RMR | `(49.940 × kg + 2459.053 × heightM − 34.014 × age + 799.257 × male + 122.502) / 4.184`; original kJ coefficients converted to kcal |
| General-adult Mifflin RMR | `10 × kg + 6.25 × cm − 5 × age + sexAdjustment`; male 5, female −161 |
| Estimated baseline | `round(RMR × dailyLivingFactor)`; factor default 1.2, range 1.1–1.5; explicit custom baseline bypasses it |
| Estimate input handling | Height 48–96 in; age 13–100, under 18 flagged unsupported; ten Haaf restricted to 18–35 |
| Walking, net | `(3.85 + 5.97 × speedMps² / heightM) × kg × 0.005 × walkingMinutes`; `speedMps = 1609.344 / (paceMinPerMile × 60)` |
| Running, net | `runMiles × 1609.344 × kg × 0.001`; level ACSM horizontal cost |
| Lifting, net | `lifted ? (MET − 1) × 3.5 × kg / 200 × hours × 60 : 0` |
| Cardio | Sum entered active/net calories for selected date |
| Estimated maintenance | `round(baseline + netWalk + netRun + netLift + activeCardio)` |
| Known total maintenance | Explicit positive total replaces the entire estimate; invalid values show guidance and use the estimate until corrected |
| Goal days | `max(1, rounded calendar-day difference)`; invalid/cleared deadline uses one day with guidance |
| Calculated target | `round(maintenance + (targetLb − weightLb) × 3500 / days)` |
| Weekly goal rate | `(targetLb − weightLb) × 7 / days`, converted for kg display |
| Protein/fat | `round(weightLb × configured gramsPerLb)` |
| Carbs | `max(0, round((chosenTarget − 4P − 9F) / 4))` |
| Macro calories | `round(4P + 4C + 9F)` |
| Strength | Achieved single = actual load; prediction = `load / interpolated fraction of 1RM` at `reps + (10 − RPE)` (blank effort assumes zero reserve); RPE 7–10 and <=10 effective reps |
| Relative strength PR | Achieved single, qualifying estimated 1RM, or rep-specific load divided by historical bodyweight in the same unit; maximize each category separately before display rounding |
| Calisthenic records | For explicit bodyweight mode, maximize zero-added-load reps and positive added load separately; added load is never treated as total resistance or used for 1RM/relative ratios |
| Absolute-record BW percentage | The absolute winning load (or predicted 1RM) divided by its own historical bodyweight × 100; display to one decimal; no change to PR selection |

Reference example: 180 lb, 71 in, male, age 18, athlete RMR, living factor 1.2, four walking miles at 22.5 min/mile, no running, 1.5 h typical lifting (3.5 MET) → RMR about 2,108; baseline 2,530 + walking 314.3 + lifting 321.5, rounded to **3,166 kcal maintenance**, before custom cardio. This is a starting model estimate, not measured personal expenditure. Goals do not change that maintenance. There are no former percentage deficit/surplus caps or old vanilla-app 1,200–6,000 target clamp. Impossible targets/expired dates show warnings. A zero-carb floor means macro calories can exceed an extreme low calorie target.

## Strength estimation evidence and limits

Research checked October 30, 2026. [Nuzzo et al. (2024)](https://doi.org/10.1007/s40279-023-01937-7), Figs 2–4, pool 269 studies and show exercise-dependent rep/load relationships. `src/strengthEstimation.js` retains the published means in the relevant range and linearly interpolates load percentage; the 100%-at-one-rep boundary is definitional. Inverting population means and adding self-reported RIR are implementation approximations, **not an externally validated individual prediction model or a claim of universal superiority over Epley**. The leg-press curve has especially wide uncertainty. No fabricated individual confidence interval is shown.

The [2025 cross-validation](https://pubmed.ncbi.nlm.nih.gov/39495260/) recommends modified Lombardi for bench/leg extension at 4–10 reps to failure in a small, young male sample tested at 80% 1RM. It is not sufficient to impose that equation on every exercise/person/load. [2025/2026 RIR review](https://doi.org/10.1080/10833196.2025.2564026) supports better RIR accuracy close to failure. RPE 7–10 and 10 effective reps are conservative product gates, not universally validated thresholds; hard sets of roughly 2–6 reps with consistent technique are preferable for tracking. Bodyweight/assisted movements (including ambiguous pull-up/pulldown labels) do not predict a max from added load alone; their achieved loads and rep records remain visible. Unknown effort is never silently recorded as RPE 10. All PRs, goals and charts share one estimator after alias resolution. Logged weights/reps/RPE and achieved records are not rewritten; historical predictions may change. A direct, well-standardized maximum remains more informative than a prediction.

## Maintenance evidence and limits

Research checked October 30, 2026. The [athlete RMR meta-analysis](https://doi.org/10.1007/s40279-023-01896-z) supports population-matched equations, with ten Haaf performing well in its available athlete data. The [original ten Haaf study](https://doi.org/10.1371/journal.pone.0108460) supplies the coefficients used here. [October 2026 elite-cyclist validation](https://pubmed.ncbi.nlm.nih.gov/42849011/) also found good ten Haaf agreement in that cohort, but its new cyclist-specific equation is not a powerbuilding equation. [2025 DLW work](https://doi.org/10.1038/s43016-024-01089-5) illustrates individual uncertainty and poor extrapolation to unusually active groups. Newer does not mean universally better.

Walking uses [Ludlow and Weyand (2016)](https://pubmed.ncbi.nlm.nih.gov/26679617/) height/weight/speed net oxygen cost for level walking; running uses the established ACSM level-distance component. Both use an approximate 5 kcal/L oxygen conversion. Lifting uses [2024 Compendium](https://pacompendium.com/conditioning-exercise/) categories 02054, 02052 and 02050, subtracting rest. Intensity must describe the session average with rests, not a hard set. Hills, sprints, load carriage and individual economy are not measured. The living factor is an explicit assumption, not a validated personal TDEE measurement; exercise substitution/compensation and digestion vary. No universal compensation discount or fabricated confidence interval is applied.

For individual calibration, compare complete intake logs and weight averages over several consistent weeks, or enter a known total maintenance. Missing meals are not treated as zero intake, and short-term water/glycogen changes cannot identify TDEE. The app does not auto-fit maintenance from incomplete food history. Indirect calorimetry measures RMR, not total daily maintenance; doubly labelled water measures free-living expenditure. Neither measurement is available from app inputs. The existing 3,500-kcal/lb goal/deadline arithmetic is preserved as a rough static planning rule, **not** a validated dynamic weight-change forecast; it remains uncapped with guidance. No claim of exact or universally optimal predictions is made.

## Development and repeatable tests

Use Node **22+**; `.nvmrc` and CI select Node 24. The Supabase dependency requires Node >=22. Direct dependencies are pinned and `package-lock.json` is committed; use `npm ci`.

```bash
git clone https://github.com/JaiBehl/Powerbuild.git
cd Powerbuild
npm ci
npm run dev
```

Vite prints the dev address, normally `http://localhost:5173`; dev/preview bind to `0.0.0.0`. The app works through a browser on macOS/Windows/Linux and phones; it is not a native app.

```bash
npx playwright install --with-deps chromium
npm run test:all
```

| Command | Purpose |
| --- | --- |
| `npm test` | Node unit/integration regression suite; includes a compatibility-build integration check |
| `npm run build` | Vite production bundle to `dist/` |
| `npm run test:e2e` | Playwright Chromium browser suite |
| `npm run test:all` | Tests → production build → browser regressions |
| `npm run preview` | Serve built output, normally port 4173 |
| `node build.mjs` | Compatibility alias to the active Vite build; no longer an incomplete file copier |
| `node scripts/production-smoke.mjs` | Read-only public HTML/bundle release check, with rollout retries |

GitHub Actions runs regression tests/builds on PRs and pushes to `main`. Successful main CI then runs the production smoke check. Reports, failure screenshots and traces are retained for seven days as `browser-regression-results` artifacts. The smoke check verifies public bundle capabilities including the training libraries, schedule editor, bodyweight/added-load controls, calculator date, weigh-in source/date, weekly goal pace, Absolute strength records, BW percentage labels, relative strength records, historical bodyweight estimate labels, RPE-aware records and the resting-metabolism formula control; combine it with Vercel's exact-commit status when checking a deployment.

Browser tests use a synthetic Supabase host through the Playwright web-server environment. They exercise the real frontend/client against an isolated protocol backend, not the production database. Tests cover two devices, revision races, conflicts, offline/reload/retry, sign-out/stale responses, confirmation redirects, UI/data flows, backups and phone-width layout. Actual inbox delivery and the user's real Mac/iPhone account session are not exercised by CI.

Pinned direct packages: Vite 5.4.21, React/React DOM 18.3.1, Recharts 2.15.4, lucide-react 0.468.0, Supabase JS 2.118.0; Playwright test 1.64.1. Do not upgrade or regenerate the lockfile without running the full gate.

## Supabase setup and synchronization

Without configuration, local storage still works and the sidebar reports cloud unavailable. For local cloud work, copy `.env.example` to `.env.local` and restart Vite:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

These are public browser values. Never use a secret/service-role key in `VITE_` variables or source. Production/Preview values are configured in Vercel and require a rebuild after changes.

See [CLOUD_SYNC_SETUP.md](CLOUD_SYNC_SETUP.md) and [the existing migration](supabase/migrations/20261029_cloud_sync.sql). Enable email/password auth; configure Site URL and allowed confirmation origins for the production/local/preview sites in use. Signup and resend use `window.location.origin`. Old `localhost:3000`/`otp_expired` incidents are not fixed by reusing an expired email link: request a fresh confirmation and check dashboard origins.

First-device migration: export backups on the device with existing data, sign in, Upload this device if cloud is empty, and wait for Cloud sync active. Sign in to the same account/site on the second device and choose cloud data when appropriate.

### Backend contract

`public.powerbuild_cloud_state` has `user_id uuid` PK/FK to `auth.users` with deletion cascade, `payload jsonb`, `revision bigint`, `updated_at timestamptz`. RLS ownership policies use `auth.uid() = user_id` for authenticated SELECT/INSERT/UPDATE, with both update checks. `powerbuild_save_state(p_expected_revision, p_payload)` is `SECURITY INVOKER`, fixes search path, requires auth, inserts at expected revision 0 or updates the matching revision, and raises `SYNC_CONFLICT` otherwise. Public/anon execution is revoked. This release requires no SQL schema change.

### Client contract

- Snapshot shape is `{ profileState, profileData }`: metadata/profile list/active selection plus every profile database. Login and profile selection are different concepts.
- Local changes debounce 900 ms before revision-checked RPC saves. Poll newer remote revisions every 12 seconds and when the tab becomes visible; this is polling, not Realtime.
- Three-way merge compares the last known common snapshot, this device and cloud. Independent edits combine; record arrays match unique dates first, then IDs when safe. Incompatible independent starts on the same workout date require a choice, preserving the one-session-per-date model. Deletions are respected. Same-value conflicts or opaque concurrent template/set-array changes require explicit choice.
- Without a common base, divergent copies require a choice. Choosing one version saves recovery copies first. Download both versions or restore an account copy from the sidebar; all-profile file import accepts those downloads.
- Retry rechecks remote state/revision before saving; offline edits stay local and survive reload. Background updates preserve current UI. Obsolete session responses cannot reactivate sync or replace later local edits.
- Applying all-profile data attempts rollback if a storage write fails and retains recovery copies. No server-side revision archive is maintained.
- Sign-out retains local data. On shared browsers, profiles are not password-protected and cached data is not account-isolated; review which data is present before uploading to another account.
- Editing a loaded page can continue offline, but no service worker/PWA asset cache guarantees a fresh offline page load.

## Data model and migration

| Field | Shape/meaning |
| --- | --- |
| `settings` | Schedule mode/start, starting/target weights, weight/strength deadlines, units, weekdays, rotation/offset or fixed assignments; weights lb |
| `strengthGoals` | `[{id, exercise, targetWeight, deadline}]` |
| `exerciseAliases` | Normalized logged name → canonical display name; identity overrides permit opting out |
| `sessions` | `[{id, date, type, workoutId?, notes, finished, exercises}]`; type/exercises remain dated snapshots |
| `exercises[]` | `{id, templateId?, libraryExerciseId?, name, range, target, kind, resistance?, sets}` plus optional import provenance |
| `sets[]` | `{weight, reps, rpe, done, tag}`; weight is external or added load according to exercise resistance; blank values may be `''`, entered values can be strings |
| `weights` | `[{date, weight, id?, sourceImportId?}]`, canonical lb |
| `calories` | `[{date, items, cardio, plan}]` |
| `plan` | `{calorieSettings, goal:{startWeight,targetWeight,weightDeadline}}`, snapshot for that date |
| `items[]` | `{id,name,meal,servings,perServing,calories,protein,carbs,fat,sourceSavedFoodId?}`; top-level nutrition is consumed totals |
| `cardio[]` | `{id,name,durationMinutes,calories}` |
| `savedFoods` | Per-one-serving `{id,name,meal,calories,protein,carbs,fat}` |
| `calorieSettings` | Defaults for baseline, demographics, weight mode, activity, macro rates and manual overrides |
| `exerciseLibrary` | Reusable `{id,name,sets,range,target,kind,resistance,defaultAddedWeight,createdAt,updatedAt,archived,revisions}` definitions; template row `[6]` stores `{exerciseId,resistance,defaultAddedWeight}`; session `libraryExerciseId` links new sessions |
| `savedSchedules`, `scheduleLog` | Named program snapshots with templates/exercises and up to 10 prior versions; last 100 applied schedule snapshots |
| `workoutMeta` | Workout name → `{id,name,description,createdAt,updatedAt,archived,revisions}`; up to 10 previous template versions |
| `settings.scheduleMode`, `settings.weekdayWorkouts` | Rotation or fixed-weekday mode; weekday 1–7 → workout name/null(Rest); missing mode retains legacy rotation |
| `settings.workoutCycle` | Optional ordered workout-name/null(Rest) rotation; missing uses the original six, empty means no planned workouts |
| `templates` | Workout → tuples `[name,setCount,repRange,effortTarget,kind?,templateId,exerciseConfig?]` |

Fresh defaults: start `2026-10-12`, 180 → 160 lb, weight deadline `2027-04-12`, strength deadline `2027-10-12`, lb, weekdays `[1,2,3,5,6]`, offset 0. Empty logs/goals/saved schedules; workout/exercise libraries seed from the cloned program and built-in calisthenics. Nutrition defaults: ten Haaf athlete RMR; living factor 1.2; saved custom baseline field 2,300 (used only in custom mode); 71 in; male; age 18; automatic weight; four walking miles at 22.5 min/mile; zero running; lifted 1.5 h at 3.5 MET; calculated maintenance/targets; protein 1 g/lb and fat 0.3 g/lb. Actual saved values take precedence.

| Storage key | Meaning |
| --- | --- |
| `powerbuild-profiles-v1` | Profile list/active ID |
| `powerbuild-tracker-v1:profile:<id>` | One normalized profile database |
| `powerbuild-cloud-last-v1:<auth-user-id>` | Last accepted/uploaded common account snapshot |
| `powerbuild-recovery-v1:profile:<id>` | Device profile versions |
| `powerbuild-recovery-v1:account:<auth-user-id>` | Device account sync versions |
| `powerbuild-recovery-v1:workspace` | All-profile recovery, including deleted profiles |
| `powerbuild-panel-state-v1` | Device-only collapsed flags by profile/tab/panel |
| `powerbuild-tracker-v1`, `powerbuild-app-v1` | Legacy migration sources |

First initialization migrates supported single-profile data into `primary` / My profile. Legacy React DBs normalize supported fields; eligible original goals migrate only when an explicit goal array is absent. The older vanilla fallback carries selected goal/bodyweight/activity fields but does not convert old `workoutLogs` or customized rotation; preserve original backups if those need recovery.

Older nutrition records without plans receive a snapshot of available current defaults during normalization. Their actual past walking/lifting values cannot be reconstructed. Stable template IDs are added without rewriting logged exercise names. Existing positive manual calorie weights remain manual until reconnected. JSON backups retain pounds; kg mode does not rewrite historical storage.

## Historical Notes import

Import **converted historical JSON**, not a raw Notes ZIP/Markdown/PDF. The private Notes converter/export is not committed. Select relevant workout/bodyweight notes and exclude unrelated personal notes when converting. Format:

```json
{
  "format": "powerbuild-historical-import-v1",
  "metadata": { "importId": "stable-synthetic-batch" },
  "sessions": [{
    "id": "synthetic-session", "date": "2026-01-02", "type": "Historical workout", "finished": true,
    "notes": "Synthetic example only",
    "exercises": [{
      "id": "synthetic-exercise", "name": "Barbell bench press", "range": "Historical", "target": "",
      "sets": [{ "weight": 100, "reps": 5, "rpe": "", "done": true, "tag": "" }]
    }]
  }],
  "weights": [{ "id": "synthetic-weight", "date": "2026-01-02", "weight": 180 }]
}
```

Historical UI limit 5,000,000 bytes; validator limits 5,000 sessions, 30,000 weights, 200 exercises/session, 300 sets/exercise. Validate real dates and finite nonnegative sets; missing IDs generate deterministic identifiers. Fractional reps floor to whole reps. Failed attempts use zero reps and never create PR estimates. Other review-flagged records should be removed during conversion; the browser cannot interpret arbitrary free text.

Preview comes before applying. Default merge adds missing dates/exercises/weights, preserves existing same-name/ID exercises and same-day weights, and keeps original notes/import markers. It is repeat-safe and does not merge additional sets into an existing same-name exercise.

Explicit correction updates records owned by the same import ID. Optional removal cleans records missing from that batch while preserving unrelated/manual data by default. A separate older-marker opt-in allows correction of legacy sessions without per-record provenance; review it because manual edits on those dates may be affected. Untracked older missing weigh-ins remain retained. Keep import IDs stable. Corrections and notes repeat without duplication, and every application checkpoints the current profile first.

## Source map

| File | Responsibility |
| --- | --- |
| `index.html`, `src/main.jsx` | Entry; app state, normalization/migration, profiles, dates, exports/imports, undo and persistence orchestration |
| `src/data.js`, `src/dates.js` | Default program/settings, session factory, estimator compatibility export, strict dates and calendar arithmetic |
| `src/ScheduleEditor.jsx`, `src/scheduleLibrary.js` | Rotation/fixed-day editor, program snapshot library, restoration and application log |
| `src/TrainTab.jsx`, `src/workoutOperations.js` | Workout UI, explicit template edits and stable identity matching |
| `src/ExerciseLibrary.jsx`, `src/exerciseLibrary.js`, `src/libraryCore.js` | Exercise catalog/editor, migration, linked template updates, archive, revisions and shared library helpers |
| `src/WorkoutLibrary.jsx`, `src/programLibrary.js` | Reusable workout library/editor, stable identity, rename/duplicate/archive and version restore |
| `src/ScheduleTab.jsx` | Weekly calendar and current rotation/fixed-weekday preview |
| `src/ProgressTab.jsx` | Goal summaries, charts and all-years histories |
| `src/exerciseCatalog.js`, `src/ExerciseAliases.jsx` | Canonical movement resolution, shared selectors/history and alias editor |
| `src/resistance.js`, `src/ResistanceFields.jsx` | Resistance modes, calisthenic defaults and shared bodyweight/added-load controls |
| `src/trainingStats.js`, `src/PreviousPerformance.jsx`, `src/PersonalRecords.jsx` | Previous finished sets, absolute/relative single/estimated/rep records and historical bodyweight context |
| `src/recordBodyweight.js` | Cached historical bodyweight matching, same-day averages, bounded interpolation/nearest estimates and source provenance |
| `src/trends.js`, `src/WeeklyReview.jsx` | Daily-weight averages and weekly training/nutrition summary |
| `src/CalorieTracker.jsx`, `src/nutrition.js`, `src/maintenance.js` | Nutrition cards, daily snapshots/defaults, persistent automatic weight source/provenance, weekly goal pace, RMR/net-activity models and maintenance override |
| `src/strengthEstimation.js` | Shared exercise-specific population tables, RPE/RIR adjustment, prediction gates and achievement distinction |
| `src/FoodLog.jsx`, `src/SavedFoods.jsx`, `src/ServingPicker.jsx`, `src/foodLibrary.js` | Foods, reusable templates, portions, validation and totals |
| `src/CardioLog.jsx` | Dated custom cardio CRUD |
| `src/SettingsTab.jsx` | Defaults, units, schedule, optional goals and backup/recovery controls |
| `src/ProfileSwitcher.jsx`, `src/profiles.js` | Profile UI, keys, loading/saving and all-profile write rollback |
| `src/cloudSync.jsx`, `src/syncMerge.js` | Auth, revision syncing, three-way merge, retry, account recovery and snapshot validation |
| `src/historicalImport.js`, `src/HistoricalImportPanel.jsx` | Historical validation/normalization, preview, merge/correction/removal |
| `src/recovery.js`, `src/RecoveryPanel.jsx`, `src/backupSafety.js` | Bounded snapshots, recovery UI, deletion detection and backup validation |
| `src/CalorieSection.jsx`, `src/panelScope.js`, `src/panelState.js` | Shared mounted collapsible cards and device preference persistence |
| `src/units.js` | Canonical lb and macro-rate conversions |
| `src/style.css`, `src/profile.css`, `src/cardio.css`, `src/ui-polish.css` | Active responsive design and refinements |
| `package.json`, `package-lock.json`, `.nvmrc`, `.gitignore` | Commands, reproducible dependencies, runtime preference and generated/private exclusions |
| `build.mjs` | Vite compatibility build entry |
| `app-core.js`, `app-views.js`, `app-settings.js`, `app-workout-customizer.js`, root `styles.css` | Inactive vanilla implementation; do not edit these expecting current UI changes |
| `.env.example`, `CLOUD_SYNC_SETUP.md`, `supabase/migrations/20261029_cloud_sync.sql` | Public config placeholders and existing backend setup contract |
| `tests/unit/*.test.js` | Calculation, storage, import, identity, schedule, records, merge, build and production-check regressions |
| `tests/e2e/*.spec.js`, `tests/fixtures.js`, `tests/cloud-fixtures.js`, `playwright.config.js` | Browser flow tests, synthetic profile/backend fixtures and Chromium server setup |
| `scripts/production-smoke.mjs` | Public deployed HTML/bundle verification |
| `.github/workflows/tests.yml`, `.github/workflows/readme-check.yml` | Regression/deployment checks and README companion check |
| `AGENTS.md`, `.github/pull_request_template.md` | Future change/testing/documentation requirements |

## Verification and delivery record

The original audit read all 34 files at `03d6258633b7376b184a3b7e86bdd201cf18c62a` and PRs #1–#22. The reliability work then passed the full regression/build gate before moving from each stage to the next:

| Stage | Evidence |
| --- | --- |
| Safe session/template editing | [Passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41026983282) |
| Daily activity/target plans | [Passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41027561807) |
| Automatic/manual weight source | [Passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41028118559) |
| Exercise identity/aliases | [Passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41028423025) |
| Actual singles versus estimates | [Passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41028667102) |
| Historical import correction | [Passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41029094633) |
| Cloud merge/retry/recovery | [Passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41029898577) |
| Previous-session comparisons | [Passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41030253108) |
| Personal records | [Passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41030585535) |
| Weekly review/weight averages | [Passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41030953470) |
| Undo/recoverable backups | [Passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41031701772) |
| Remembered panels/mobile layout | [Passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41032100842) |
| Same-date concurrent workout protection | [Passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41036125874) |
| Exercise-specific RPE-aware strength estimates | [Passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41039066800) |
| Population-matched RMR and net-activity maintenance | [Passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41040088508) |
| Final calculation wording and all regressions | [Passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41040442897) |
| Historical bodyweight context for absolute PRs | 86 unit/integration + 47 browser tests and production build [passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41062546553) before relative rankings began |
| Independent relative-strength records | 93 unit/integration + 51 browser tests and production build [passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41063323398) |
| Absolute records rename and BW percentages | 93 unit/integration + 53 browser tests and production build [passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41129537593) |
| Persistent maintenance weigh-in connection | 98 unit/integration + 56 browser tests and production build [passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41134846082) before weekly goal pace was added |
| Weekly goal pace and combined regression gate | 99 unit/integration + 58 browser tests and production build [passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41135348021) |

Current source gate: **124 unit/integration + 70 browser tests, zero failures**, plus a production build. Sequential stages passed before the next began:

| Stage | Evidence |
| --- | --- |
| Workout library and reusable template editing | 106 + 62 [passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41199089607) |
| Exercise library and linked defaults | 111 + 64 [passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41199650579) |
| Editable rotation/fixed weekdays and saved whole programs | 116 + 66 [passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41200280742) |
| Bodyweight/added load and final combined audit | 124 + 70 [passed](https://github.com/JaiBehl/Powerbuild/actions/runs/41201029796) |

New coverage includes creation/edit/rename/revision/archive, linked prescriptions, stable workout identities, original-log preservation, profile isolation, future-template permission, repeating/rest/fixed schedules, immutable program snapshots, rename collisions, repeat-safe restore, calisthenic zero/added loads, kg conversion, mode-separated records/previous performance, all-profile backup restoration, CSV semantics, account snapshot preservation, and phone width. The production smoke now requires the new libraries, schedule editor and bodyweight/added-load controls. Local unit/build checks passed; the complete Chromium gate ran in GitHub Actions because this workspace could not launch a local browser. Synthetic tests do not inspect the user's real browser or real account payloads.

Earlier release coverage remains in the suite: maintenance weigh-in connection and weekly goal pace, bodyweight percentages and independent relative rankings, date cutoffs, estimate provenance, calorie/food/cardio isolation, cloud conflicts, historical imports and recovery.

The calculation release passed **79 + 45**; its strength stage passed 70 + 42 before maintenance implementation began. The suite also covers sex/age/height/mass inputs, athlete-age fallback, RPE/RIR and invalid effort, actual singles, unsupported bodyweight movements, kg invariance, walking pace/lifting intensity, total-maintenance override without double counting, dated settings, backups and phone layout. Previous release passed 62 + 40. Source baseline and gate link are at the top. CI includes deletion/restore, quota failures, malformed imports, aliases, actual/estimated PRs, daily plan isolation, weight reconnect, old-session template safety, two-device/offline sync, signup/resend redirects, mobile width, exports and persistent panels. Source/static/protocol tests do not prove actual email delivery or every real-device account scenario.

GitHub `main` is the established Vercel production source; repo root, Vite, `npm run build`, `dist`. Production and preview are different environments. Check the exact GitHub Vercel commit status and successful main regression/production-smoke jobs before claiming a deployment is verified. Vercel dashboard API access was limited during this work, so CI/static verification is used instead of inventing dashboard configuration facts.

Live backend ownership/RPC metadata was inspected; private payloads and production records were not used for tests. No schema/auth/hosting changes are required by this release.

## Remaining boundaries

- One session per date; saving a weigh-in replaces that date's prior measurements.
- Libraries retain archived entries; edit history keeps 10 prior versions per definition/program, and the schedule application log keeps 100 plans. Limits are 500 workouts, 500 saved schedules, 10,000 exercise definitions, 200 exercises/workout and 100 sets/exercise.
- Existing sessions without an explicit resistance mode retain external-load interpretation. Ambiguous variants need an explicit bodyweight toggle. Added-load records do not estimate effective body mass, assistance, 1RM or relative resistance.
- Historical PR bodyweights are approximations when a same-day measurement is missing. Without a weigh-in within 30 days, a lift remains an absolute record but cannot enter relative rankings.
- Recovery versions and panel preferences are device-local; downloaded backups are needed after clearing browser data. Same-field cloud conflicts still need an explicit choice.
- Historical activity before date snapshots existed is unknown. Legacy vanilla workout migration and raw Notes conversion are not implemented here.
- No native app, PWA/offline asset cache, automatic training progression engine, barcode/external food database, direct Notes/Canvas integration or password-reset UI.
- Earlier ideas for 150–200-lb sliders and bodyweight-scaled/exponential strength targets remain separate proposals; current weights/goals use editable numeric inputs.
- The build still warns about a large JS chunk and Recharts 2 deprecation. Evaluate upgrades/splitting with the full suite rather than assuming they are risk-free.
- Supabase's earlier security advisor reported leaked-password protection disabled. That external auth setting was not changed; actual confirmation-email delivery/account-device validation remains outside the synthetic suite.

## Keep the handoff current

Read `AGENTS.md` first. For each change: inspect current code; implement one item; add a meaningful regression; run the complete gate; then continue. Update this README in the same commit/PR: features, formulas, data/compatibility, source map, setup, unresolved limits and actual validation. Remove superseded claims. Refresh the reviewed baseline/date for runtime changes; docs-only commits can retain it.

The README PR check flags application/configuration/test changes without a companion README edit. It does not generate prose, guarantee accuracy or automatically enable required branch protection; direct pushes need the same discipline. Keep requested, implemented, built, deployed and end-to-end verified states distinct. Never publish private data or invent a result.

## Earlier implementation history

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
| [#23](https://github.com/JaiBehl/Powerbuild/pull/23) | Reliability fixes, recovery, training insights, persistent panels, regression tests and production verification |
| [#24](https://github.com/JaiBehl/Powerbuild/pull/24) | Match dated sync records before UUIDs; prevent hidden duplicate workouts during concurrent starts |
| [#25](https://github.com/JaiBehl/Powerbuild/pull/25) | Research-informed exercise/RPE strength estimates and population-matched net-activity maintenance models |
| [#26](https://github.com/JaiBehl/Powerbuild/pull/26) | Historical bodyweights on absolute PRs and independently selected relative-strength records, with estimate provenance and regression coverage |
| [#27](https://github.com/JaiBehl/Powerbuild/pull/27) | Rename Absolute strength records, show bodyweight percentages for each absolute PR and preserve saved collapse preferences |
| [#28](https://github.com/JaiBehl/Powerbuild/pull/28) | Keep maintenance bodyweight connected to new weigh-ins across dates; show calculator/source dates and signed weekly goal pace in Bodyweight goal |
| [#29](https://github.com/JaiBehl/Powerbuild/pull/29) | Reusable workout/exercise libraries, editable and saved complete schedules, bodyweight and weighted calisthenics with honest records and portable backups |

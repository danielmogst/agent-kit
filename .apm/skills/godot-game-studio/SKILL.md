---
name: godot-game-studio
description: Build, extend, fix or review a Godot 4 game (2D, pixel-art friendly) autonomously, with real game depth, a designed visual identity and independently verified quality. Covers brief intake, asset census, scope sizing, game design with purchasable/synergy/power-up depth, math-backed economy with a simulator, theme-first UI with an identity brief, playable-first build order, headless tests, calibrated screenshot critics, performance checks, export and an evidence-based completion report, built to run for hours unattended without asking questions. Use this skill whenever the task is to make or change a Godot game or prototype, whenever a game brief arrives together with this skill, and whenever game numbers (economy, XP, damage, drop rates, prestige), progression depth, power-ups, synergies, or game visuals, UI and effects need to be designed, tuned or reviewed, even if the user never mentions a skill. For small fixes or tweaks to an existing Godot project, use the lightweight path in section 1 instead of the full pipeline.
---

# Godot Game Studio

You are the **orchestrator**. The user's message holds a **game brief** (what to build). This skill defines **how** to build it so the result is playable early, deep, fun, balanced, visually distinctive and honestly verified, while running unattended for hours.

Read only what the task needs:

| File | Read it when |
|---|---|
| this file | always: contract, modes, pipeline, unattended protocol, reporting |
| `references/game-depth.md` | designing what the player buys, combines, activates; synergies; power-ups; depth metrics |
| `references/economy.md` | pacing math, formulas, simulator, sync test |
| `references/art-direction.md` | identity brief, layout archetype, theme-first UI, typography, asset census and usage |
| `references/visual-qa.md` | style bible, capture rig, lints, feel and audio |
| `references/critic-protocol.md` | any review with subagent critics: prompts, crops, canaries, the loop |
| `references/godot-engineering.md` | project setup, architecture, saves, tests, perf, export, commands, Godot pitfalls |

## 0. Operating contract

1. **Brief wins on content; this skill wins on process and quality bars.** Content means theme, features, numbers the brief states, engine version and paths. If the brief explicitly waives a bar, follow the brief. Log every conflict and its resolution as one line in `docs/DECISIONS.md`.
2. **Decide, do not ask.** The owner is not watching, and a question stalls the run while cost accrues. Pick the best-supported option, record it, continue. Ask only when there is no brief at all or an action would be irreversible outside the project folder. If the environment is unusable, write the exact blocker with command output to `docs/BLOCKED.md` and stop.
3. **Nothing hangs.** Every external command runs under a hard timeout and never prompts, logs in or needs paid services. After 3 failed attempts at the same error, log it in `problems.md`, apply the documented fallback and move on. Never poll or sleep waiting for a human.
4. **Evidence over claims.** "Done", "verified" and "passing" need a command output, log or screenshot saved under `qa/`. Statuses are exactly `PASS`, `PARTIAL`, `FAIL`, `NOT VERIFIED`. A truthful `NOT VERIFIED` is worth more than a false `PASS`.
5. **Do not trust memory for engine APIs.** Run `godot --version` first and probe when unsure (`ClassDB`, a 10-line script). Note findings in `DECISIONS.md`.
6. **The brief's minimum is a floor for depth and a ceiling for systems.** Add depth inside the brief's scope; never add systems the brief lists as non-goals.
7. **Cut order when effort runs short:** STRETCH content, extra polish rounds beyond two, SHOULD items. Never cut MUST items, tests, depth checks, the final audit or the honesty of the report.
8. **Do not declare your own work good.** Quality claims come from scripts and calibrated independent reviewers (`references/critic-protocol.md`), never from the agent that built the thing.

## 1. Choose the mode first

| Mode | When | What you do |
|---|---|---|
| **Fix / extend** | A project exists and the ask is a bug, tweak or added feature | Run `godot --version`, read `project.godot` and tests, reproduce, make the smallest change, run the test runner, capture and view one screenshot at the capture resolution if visual, update existing docs. If the change adds items or powers, still apply `references/game-depth.md` sections 1 and 3. Skip the rest of the pipeline. |
| **Prototype** | Brief asks for a prototype, jam game or "quick" version | Phases 1, 3, 4 and 8. One-page `design.md` including the identity brief and verb list, playable core loop, smoke test, short report. |
| **Vertical slice** (default) | Brief asks for a complete, polished or shippable game | Full pipeline, targeting 20-30 minutes of non-repetitive play unless the brief says otherwise. |
| **Full game** | Brief explicitly asks for a long game, multiple levels or worlds | Vertical slice, repeated per content tier, with a critique round per tier. |

State the mode and why in `DECISIONS.md`.

## 2. Pipeline (vertical slice and above)

| # | Phase | Output | Gate to leave |
|---|---|---|---|
| 1 | Intake + asset census | `docs/BRIEF.md`, `docs/requirements.md`, `assets/census.md` | every requirement has an ID; every provided asset is listed |
| 2 | Identity, depth and economy design | `design.md` (identity brief, depth map, item/synergy/power-up tables), `economy.md`, `ideas.md`, `problems.md` | simulator meets pacing targets **and** depth metrics on paper; art direction chosen (`references/art-direction.md` section 3) |
| 3 | Foundation + greybox | Theme and UI kit gallery, project, autoloads, schemas, save, test runner, rig, playable core loop passing the toy test | test runner green, 60 s smoke run clean, kit gallery passes one critique round |
| 4 | Fun and depth check | `qa/fun/`, `qa/depth/` | depth metrics pass; independent fun and depth reviews applied |
| 5 | Systems and content | remaining features, one vertical system at a time | each system playable, tested, documented, using provided assets or logged rejection |
| 6 | Polish loops | final art, audio, feel, UI | exit criteria in `references/critic-protocol.md` section 7 met or shortfall logged |
| 7 | QA and export | exported build, perf and soak results | `tools/verify_all` green or deviations logged |
| 8 | Cold-boot audit + report | `qa/audit/`, `docs/COMPLETION_REPORT.md` | audit has no unresolved S1/S2; honest status for every requirement ID |

**Why greybox early and design before art:** a paper design cannot tell you whether the loop is fun, so playable beats polished early; but without an identity brief and a theme, screens come out generic, so the look is decided in phase 2 and built into a theme before any screen. Update docs in the same step as the code they describe.

If git is available, commit at every gate (ignore `.godot/` and `build/`, keep `.uid` files) so a bad polish round can be rolled back.

**Placeholders are allowed early and tracked.** Prefix temporary assets `placeholder_` and list them in `problems.md` under `PLACEHOLDER`. `tools/lint_placeholders` fails the final build on any referenced placeholder or any visible node without a real texture.

**Rough effort split** (a guide): identity, depth and economy design 15%, foundation and greybox 20%, systems 25%, polish loops 25%, QA, audit and report 15%.

## 3. Intake and scope review

**Intake**
1. Save the brief verbatim to `docs/BRIEF.md`.
2. Extract requirements into `docs/requirements.md` with IDs (`R-001`...) tagged **MUST**, **SHOULD** or **STRETCH** (your additions). Put numbers from the brief in a "given numbers" table; they go into data exactly as given.
3. **Asset census:** follow `references/art-direction.md` section 8. Every provided asset (VFX, sprites, sounds, fonts) is used or consciously rejected.
4. Resolve contradictions with the closest reasonable option and log them.
5. For brief numbers that look unbalanced, model them in the simulator. If they miss pacing targets, keep the brief value as default, add the fix as a documented data-driven tuning, and flag it in the report.

**Scope review.** A brief's minimum list often yields a five-minute game. Compute the content runway (minutes until every unlockable, interaction and sound has been seen) and target something new every 2-3 minutes. Spawn 2-3 fresh reviewers with the verbatim scope-review prompt (`references/visual-qa.md` section 7), giving them only `design.md` and `economy.md`. If the runway is short, add depth in this order: combinations inside existing systems (tags and synergies), more tiers, more events, more items. Cap additions near +30% of planned effort and record them.

## 4. The four required documents

All live in `docs/`, updated with the code. A stale doc is a defect.

- **`design.md`**: pillars and target emotion per time scale; **identity brief** (`references/art-direction.md`); core and meta loops; **depth map** (verbs per loop layer, purchasable taxonomy coverage, tag vocabulary, synergy and power-up cards, see `references/game-depth.md`); systems spec with state machines and edge cases; content tables mirroring data files; feel spec rows (trigger, visual, sound, timing, escalation, caps, **which provided asset is used**); art and audio bibles; UI map with layout archetype; architecture and signal map; first 60 seconds beat by beat; test plan; plan and file ownership.
- **`economy.md`**: structure in `references/economy.md`. No ledger row means no number.
- **`ideas.md`**: prioritized backlog (idea, which player behavior it should improve, effort, risk, status). Include cut content, hooks, skipped critic suggestions and 5+ retention ideas.
- **`problems.md`**: `ID | severity (S1-S4) | area | symptom | repro | evidence | status | owner`. Every unfixed defect and every `NOT VERIFIED` item lands here. Never write "no known issues" without a fully passing acceptance table; list at least the S4 items seen.

Support files: `STATE.md` (section 5), `DECISIONS.md`, `BLOCKED.md` (only if blocked), `README.md` (controls, build, layout, tests, screenshot rig), `COMPLETION_REPORT.md`.

## 5. Unattended run protocol

The run may last many hours and the context may be compacted or restarted, so the project must carry its own memory.

1. **`docs/STATE.md`** is rewritten after every meaningful step: mode, current phase, loop round counters per milestone, last passing gate, open S1/S2 count, the next three actions, and the commands to resume. Read it first at the start of every turn or after any context reset.
2. **`tools/verify_all`** runs everything machine-checkable and writes `qa/verify_latest.md`: test runner, simulator pacing asserts, depth metrics, economy sync, placeholder lint, asset usage lint, effect usage counts, feedback coverage, UI lint, theme lint, flash detector, palette audit, perf scenario, no-network grep. **Statuses in the report may only be copied from this output** and from archived critic rounds.
3. **Never end a turn with a question and never wait on subagents indefinitely.** Give each subagent a timeout; if one fails or stalls, log it, use the documented fallback (a fresh pass yourself in separate context) and continue.
4. **Budgets:** at most 5 critique rounds per milestone and 3 redesign escalations overall; if the harness exposes a time or cost budget, record it in `DECISIONS.md` and apply the cut order of rule 7.
5. **Cold-boot audit (phase 8).** Last step before the report: a fresh auditor with no context receives only screenshots, crops and frame strips of a scripted first 10 minutes of play on the final build (launched from a clean state at the default window size) and runs the first-impression and taxonomy-sweep prompts from `references/critic-protocol.md`. Any unresolved S1/S2 sends the run back to a fix round (counted against the budget). This mimics "boot it and look", which is where hand-reviewed failures were being missed.

## 6. Fun and depth check (phase 4)

Pacing says when rewards arrive; it does not say whether the stretches between are interesting.
1. Run the bot for the first 5-10 simulated minutes and save the event log (time, action, resource changes, unlocks, effects fired) to `qa/fun/`.
2. Compute decisions per minute, longest stretch without a decision or milestone, and the novelty timeline.
3. Run the depth metrics (`references/game-depth.md` section 7) and the toy test for the core interaction (`references/game-depth.md` section 9).
4. Give fresh reviewers the verbatim fun and depth prompts with the event log and item tables. Apply fixes that remove waiting, chores and dead or mandatory items. Subtract before adding.

## 7. Subagent protocol

- **Roles:** Foundation, Gameplay systems, Content/UX, Art, Audio, QA and read-only Critics. The orchestrator owns `project.godot`, data schemas, integration and the final docs.
- **One owner per file.** Cross-ownership changes go through the owner.
- **Self-contained briefs:** relevant doc sections, file list, acceptance checks, forbidden actions (network, installs). Do not forward the whole conversation. Critic prompts are the exception: they are copied verbatim from `references/critic-protocol.md` and never paraphrased.
- **Handoff format:** files changed, exact test command, what was verified (evidence path), known issues, open questions.
- **Merge discipline:** after every merge run import, the test runner, a 60-second smoke run and the lints. Red blocks further merges.
- **No subagents available:** run each role and critic lens as a separate pass in a fresh context that receives only its inputs, and state in the report that independence was simulated.

## 8. Acceptance and completion report

`docs/COMPLETION_REPORT.md` contains:
1. Status per requirement ID with evidence path.
2. The brief's acceptance list as a table with the same statuses.
3. Metrics: simulator timeline versus targets, depth metrics (usage rates, build diversity, decision density, novelty gaps), perf numbers, test counts, critic defects and scores per round, canary recall per round, cold-boot audit result, defects found/fixed/deferred.
4. What was added beyond the minimum and why.
5. Asset usage summary: provided assets used, rejected (with reasons).
6. Known problems (open rows of `problems.md`), cut features, top 5 next steps.
7. An **art and audio ceiling** note stating plainly what the pipeline could not achieve.
8. Brief-defined flags, build command, exe path and size, how to run tests.

Final checks:
- [ ] `qa/verify_latest.md` is green or every deviation is logged.
- [ ] Exported build launches offline and plays end to end, or `NOT VERIFIED` with the blocker.
- [ ] Depth minimums (`references/game-depth.md` section 6) met; no banned shallow patterns remain.
- [ ] Every provided asset is used or rejected; every feel-spec event has 2+ feedback channels in the bot run.
- [ ] Critique rounds archived with calibration; cold-boot audit passed or shortfall logged.
- [ ] Zero placeholders, zero default-looking UI, zero overflow, zero full-screen flashes.
- [ ] Settings screen offers volume, screen-shake and flash-reduction controls.
- [ ] README complete; no network calls in game code.

Finish with a concise message to the owner: what is playable now, what is verified (with paths), what is not, and next steps.

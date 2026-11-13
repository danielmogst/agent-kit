# Critic protocol: making unattended review actually catch things

An autonomous run lasts hours, so review must work without a human glancing at the screen. Critics fail in predictable ways, and each failure has a fix here:

| Failure | Cause | Fix |
|---|---|---|
| Overflowing text and overlaps pass | image downscaled; small defects vanish | deterministic geometry checks decide these (section 1); critics see crops (section 2) |
| Critic lists three easy items and stops | open prompt is satisfied early | systematic taxonomy sweep with evidence per category (section 3) |
| Critic is polite | prompt leaks intent or praise; orchestrator paraphrased it | verbatim prompt files, no game context (section 3) |
| "Fresh eyes" are not actually good eyes | no measure of recall | canary calibration (section 4) |
| Orchestrator waves defects away | builder bias | no downgrades, personal review first (section 6) |

Note on earlier guidance: asking about one category ("check that the text doesn't overlap") is leading, because it hints at the answer and hides everything else. A sweep that asks about **all** categories equally and requires evidence is not leading, and it raises recall. Use the sweep.

## 1. Ground truth first (deterministic checks decide geometry)

The `ScreenshotRig` writes a `scene_manifest.json` next to every screenshot, listing each visible Control, label and sprite: node path, text, global rect, parent clip rect, font and size, **measured text size** (`font.get_string_size` with the actual font, wrap width and size), z-order, theme state, and whether it is clipped.

`tools/ui_lint` reads the manifest and **blocks** on: text larger than its rect or wrap box; text clipped by a parent; text padding under the minimum; sibling overlaps that are not declared intentional; any element outside the viewport or safe area; font size outside the type scale; contrast ratio under 4.5:1 for body text (3:1 for large text), computed from palette colors; theme overrides outside the theme builder (see `art-direction.md`).

**One capture resolution: 16:9 at the base size.** This project pins `stretch/mode = viewport` with `stretch/aspect = keep`, so the game always renders one logical canvas and the window only letterboxes and integer-scales it. Layout is resolution-independent by construction: capturing 21:9 or 5:4 cannot reveal an anchor bug the base canvas does not already show, it only re-tests the letterbox while multiplying every critic pass. Capture every scenario once, at the base resolution at integer scale (for example 320x180 at 4x = 1280x720). Do not add resolutions to a round.

**Exception, final gate only.** If the project can expand its canvas (`canvas_items` or `expand` stretch, or a web or mobile target whose viewport really changes size), capture 1280x1024 (5:4), 2560x1080 (21:9) and a minimum window (about 960x540) once, in the final gate round, because that is the only configuration where anchors and aspect handling can fail. Fix with anchors and containers, not magic offsets.

Critics are a second, independent signal. They are not the only gate for anything the lint can measure.

## 2. What critics see

- One scenario per image; long edge at most about 1500 px (larger images are downscaled and small defects disappear).
- For each screenshot send the full frame at 4x nearest-neighbor (or the largest size under the limit), **plus crops** of its dense regions at native detail: split into quadrants, and add a dedicated crop around every text-bearing region. `tools/make_crops` (Pillow, or a GDScript fallback) produces them.
- Contact sheets are for orientation only, never the sole input.
- For motion, send frame strips of 8-12 frames from the same scenario, with timing in the filename.

## 3. Verbatim prompts and the three passes

Save the prompts below to `qa/prompts/` unchanged. The orchestrator may fill `{IMAGE_PATHS}` and nothing else. **Never add the game's name, genre, intent, praise, earlier results or hints about what to look for.** Use a fresh critic for each pass. If the harness lets you choose models, use a different model family or a stronger one than the builder.

### Pass A: describe and transcribe (per crop)
```
You are looking at screenshots from a software application. For each image:
1. List every piece of text you can read, exactly as written, in reading order.
2. List every distinct visual element with an approximate bounding box [x0,y0,x1,y1] in pixels of the image and what it appears to be.
3. Mark any text that appears cut off, touches an edge, or overlaps another element.
Images: {IMAGE_PATHS}
```
The orchestrator diffs the transcription against the manifest. Any manifest string that is missing or different is a candidate clipping or legibility defect and defaults to S2 until explained.

### Pass B: defect taxonomy sweep (per crop, two independent critics, union the findings)
```
You are a strict reviewer of software screenshots. For EACH image and EACH category below, answer FOUND (location as bounding box, and what exactly you see) or NOT FOUND (what you inspected to conclude this). Do not skip categories.
Categories:
1 text clipped, truncated or overflowing its container
2 text touching a container edge or with under 2 px of padding
3 overlapping elements
4 elements cut off by the screen edge or placed outside it
5 inconsistent alignment or uneven spacing
6 low contrast between text or icons and their background
7 text or icons too small to read comfortably
8 unclear which elements are interactive
9 unclear state (enabled, disabled, selected, hovered)
10 inconsistent style (pixel density, outline, light direction, icon style, fonts)
11 looks like a default, stock or template component
12 clutter or several competing focal points
13 large empty or wasted areas
14 unreadable or ambiguous numbers or labels
15 incorrect layering (something drawn above or below where it should be)
Then give each FOUND item a severity: S1 unusable or unreadable, S2 clearly hurts quality, S3 minor, S4 polish.
Images: {IMAGE_PATHS}
```

### Pass C: first impression (first-minute scenarios and frame strips only)
```
These are screenshots from the first minute of an unfamiliar game. Describe what you see. What would you do first? What is confusing or unclear? Which parts feel generic, templated, cheap or computer-generated, and which parts feel designed? Name the moments that look like they were assembled from stock parts. Score from 1 to 10 for readability, cohesion, polish and first impression, using this anchor: 3 broken or confusing, 5 functional but generic, 7 coherent and intentional, 9 distinctive and professional. Give one sentence per score.
Images: {IMAGE_PATHS}
```

### Pass D: pairwise (for art-direction choices and big changes)
```
Here are two or more unlabeled versions of the same screen, in random order. Which would a player prefer, and why? List the specific differences that decide it.
Images: {IMAGE_PATHS}
```

Scope, economy and fun review prompts live in `visual-qa.md` section 7; the depth review prompt is in `game-depth.md` section 11. Apply the same verbatim-file rule to them.

## 4. Canary calibration (measuring the eyes)

Before real critics review a round, test the critics on an image with known defects.
1. `tools/canary_scene` renders a screenshot in the game's **own theme** with at least 6 seeded defects of known type and location: overflowing text, an overlap, an element off-screen, low-contrast text, a default-font label, a misaligned button. Randomize which defects and where, using a new seed each round so they cannot be memorized.
2. Run Pass B on the canary with the same critic configuration and crop settings as the real round.
3. Compute **canary recall** (seeded defects found / seeded). If under 80%, the round is **invalid**: tighten the crops, split images further, use a second critic or a different model, and run the canary again. Record recall in `qa/critique/round_N/calibration.md`.
4. Only a calibrated configuration may produce findings that count toward exit criteria. This is what "truly objective eyes" means in practice: eyes with a measured hit rate.

## 5. Independence rules

- Critics are new for every pass, read-only, and receive only images (and the verbatim prompt).
- Run Pass B with two critics and take the union of FOUND items, since vision recall is stochastic.
- Do not show critics previous reports, the design docs, or your opinion. (Scope, economy, fun and depth reviewers are different: they get documents, not images, and are asked to predict, not to approve.)

## 6. Orchestrator review and no downgrading

- Before reading any critic output, view the key images yourself at full detail (crops included) and write at least five concrete observations to `qa/critique/round_N/orchestrator.md`. A defect you saw that the critics missed counts against calibration; add crops or a second critic and rerun.
- You may mark a defect `WON'T FIX` only with a written reason, never for S1 or S2 unless the brief waives the bar. You may not lower a severity because the fix is expensive.
- If Pass B and the lint disagree, the lint wins on geometry and the critic wins on taste.

## 7. The loop

```
repeat (max 5 rounds per milestone):
  1. build, run tests (must pass)
  2. run ui_lint and the other lints at the capture resolution; fix everything flagged
  3. capture screenshots, manifests, crops and frame strips -> qa/shots/round_N
  4. run the canary; if recall < 80% adjust and repeat until valid
  5. orchestrator personal review -> orchestrator.md
  6. fresh critics: Pass A (diff vs manifest), Pass B (two critics), Pass C -> qa/critique/round_N/
  7. merge: dedupe, rank by severity, decide per defect: FIX / WON'T FIX (reason) / DEFER (-> problems.md)
  8. dispatch fixes to file owners (one owner per file)
  9. recapture the same scenarios at the same resolution; a defect is closed only when lint passes and the new image shows it gone
exit when: no S1/S2 remains (lint and critics), lints green,
           canary recall >= 80%, median Pass C score >= 7 and no score below 6
```
- Fix by subtraction first: if an area fails twice, remove clutter, shorten text, add spacing or simplify.
- If round 3 still has S1/S2 defects, redesign the element from the style bible instead of patching.
- **Terminal state:** after round 5, ship. Log every open defect in `problems.md`, record final scores and calibration, and state the shortfall in the report.
- Run the loop after the UI kit gallery, after the core loop, after each major screen or system, before export, and once more on the final build (the cold-boot audit in `SKILL.md`).

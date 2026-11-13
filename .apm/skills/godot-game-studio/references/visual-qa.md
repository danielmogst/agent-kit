# Art, UI, feel and the critique loop

Contents: 1 style bible, 2 UI kit and layout, 3 asset production strategy, 4 capture rig, 5 automated lints, 6 critics and the loop (moved), 7 other review prompts, 8 audio and feel. Identity and layout decisions are in `art-direction.md`; the review method is in `critic-protocol.md`.

The most common failure of agent-made games is the **generic look**: default Godot widgets, mismatched fonts, text overflowing its box, inconsistent pixel density, flat colors without ramps, UI unrelated to the world. Prevent it with design first, then police it with measurements and critics.

## 1. Style bible (in `design.md`, written before any sprite)

- **Palette:** one fixed palette (size from the brief, default 24-32) built as hue ramps of 3-5 shades with hue shifting (shadows cooler, highlights warmer). Avoid pure black and pure white unless the palette designates them; tint the darkest and lightest entries. Art, UI and particles use palette colors; lights and glows may blend but should not introduce off-palette solids.
- **Pixel density:** one native resolution for everything. No non-integer sprite scaling, no rotating pixel sprites unless you redraw frames, positions snapped to whole pixels.
- **Outline and light:** one outline convention and one light direction used by every sprite, UI bevel and shadow.
- **Silhouette test:** each character or item is recognizable as a solid one-color silhouette at 1x.
- **Animation:** idle loops, squash/stretch, easing per interaction. 2-4 frame cycles are fine with good timing.
- **Typography:** at most two fonts (headers/numbers, small text), vendored with a permissive license, rendered at designed pixel size or integer multiples, antialiasing, hinting and subpixel positioning off. If no pixel font is available, build a bitmap font from a glyph grid and write it to `assets/fonts/`. Define a type scale (for example 5, 7, 10 px) and a minimum legible size, and enforce both.
- **Stress content:** every screen must hold the longest name, the largest formatted number, 12+ list rows, zero items and maxed items.

## 2. UI kit and layout

- Design before use: panel 9-patch, button (normal, hover, pressed, disabled, focus), toggle, slider, tab, tooltip, progress bar, badge, icon set at one size, cursor, number-pop style, toast style.
- The chrome should **belong to the game world** (wood and rope for a ranch, riveted metal for a machine), not a gray rounded rectangle. Build the project `Theme` from `StyleBoxTexture` 9-patches and set it as the project default (`gui/theme/custom`).
- **What counts as default-looking:** the stock Godot theme, the default font, gray rounded rectangles, anti-aliased rounded `StyleBoxFlat` corners. A `StyleBoxFlat` with palette colors, square corners, no antialiasing and a deliberate border can be a valid pixel-style choice; judge by intent and cohesion, not by class name.
- Layout: a grid (4 or 8 px), consistent margins (at least 2 px between text and container edge), at most three emphasis levels per screen, icon plus number in preference to words, no more than about 6 competing interactive elements in the main view (use tabs, drawers, contextual reveal).
- **Settings screen** is part of the UI kit: master/music/SFX volume, screen-shake scale, flash-reduction toggle. Do not rely on color alone to separate states or rarities (add shape, icon or label).

## 3. Asset production strategy (be honest about the art ceiling)

LLM-authored pixel art is the weakest part of most agent-made games, and a "store-page quality" bar applied to hand-typed pixel grids guarantees endless critic loops. Choose a strategy per asset class, in this order of preference, and record the choice in `design.md`:

1. **Provided or vendored assets and tools:** if the environment offers pixel-art or effects tools or skills, load and use them. Vendor third-party assets with license text and a `assets/manifest.json` row (path, size, purpose, source/license, palette-conformant yes/no). Do not download anything the brief or environment forbids.
2. **Procedural generation:** shapes, noise and ramp-aware shading plus an outline pass, driven by a seeded generator and the palette. Good for terrain, backgrounds, particles, UI chrome, icons and creature variants (palette swaps, part recombination). Consistency is the biggest win.
3. **Palette-indexed string grids** for small sprites (up to about 24x24), followed by an automatic shading and outline pass. Keep the number of unique hand-authored sprites low; spend effort on a few hero assets and reuse via variants.

Rules: export atlases to PNG that the game loads (never hand-placed one-color rectangles); review each asset at 1x and 4x nearest-neighbor before accepting it; recolor effect strips to the palette. State the achieved art ceiling in the completion report instead of pretending it is higher.

## 4. Capture rig (build in the foundation phase)

- An autoload `ScreenshotRig` activated only by user args (for example `-- --shots=all --out=qa/shots/round_N`), never in normal play.
- It drives the real game into each scenario and saves PNGs at native resolution and a 4x nearest-neighbor upscale: main screen at start and mid-game; every screen and panel; UI states (hover, pressed, disabled, focus); empty, normal, full and stress states; each time-of-day; each event; each effect peak; and **frame strips** (8-12 frames at 50-100 ms spacing) for animations.
- For motion, Godot's Movie Maker mode (`--write-movie out.png --fixed-fps 30 --quit-after <frames>`, needs a real renderer) writes a deterministic PNG sequence you can sample into strips.
- Screenshots need a real renderer. `--headless` uses a dummy renderer and returns blank images, so run the rig windowed under a hard timeout. On a display-less Linux machine try `xvfb-run` with `--rendering-driver opengl3` (software GL usually works). If there is truly no display or GPU, say so in `problems.md`, mark every visual criterion `NOT VERIFIED`, and still run the node-tree lints. Never claim a visual review you could not perform.
- Next to every screenshot write a `scene_manifest.json` (visible nodes, text, rects, clip rects, measured text size, z-order) and run every scenario once at the **capture resolution** in `critic-protocol.md` section 1.
- Produce crops with `tools/make_crops` and a contact sheet per round for orientation only (Pillow if installed, otherwise a GDScript image blit).

## 5. Automated lints (cheap, objective, blocking before every critic round)

Lints are gates, not advice: a red lint blocks the critic round and the final build. Thresholds live in `data/qa_thresholds.json` so they are explicit and tunable. Suggested starting values are shown.

- **UI lint** (`tools/ui_lint.gd`): walk the Control tree at runtime and report text wider or taller than its rect, controls outside the viewport, unintended sibling overlaps, font sizes outside the type scale, default-looking styles (see section 2), non-integer positions, and text with less than minimum padding.
- **Palette audit** (`tools/palette_audit.py`): fraction of screenshot pixels not in the palette, excluding glow regions. Start at fail above 3% and tune after seeing real output.
- **Flash detector:** per-frame mean luminance and fraction of near-white pixels over every event/impact frame strip. Start with fail on a mean-luminance jump above 0.15 in one frame, more than 25% near-white pixels, or more than 3 large luminance swings per second (the usual photosensitivity guideline is 3 flashes per second).
- **Placeholder lint** (see `SKILL.md`).
- **Asset usage lint** and **effect usage counts** (see `art-direction.md` section 8): provided assets that are neither used nor rejected fail the build.
- **Feedback coverage test:** every gameplay event in the feel spec must trigger at least 2 feedback channels (visual, audio, motion, number) when it fires in the bot run. The `Juice` helper logs `event -> channels` to `qa/feel/feedback_coverage.json`; any event with fewer channels is a defect.
- **Theme lint:** no theme overrides, inline StyleBoxes or hardcoded colors or fonts outside the theme builder.

## 6. Critics and the loop

Moved to `critic-protocol.md`: ground-truth geometry checks, crops, verbatim prompts (describe-and-transcribe, taxonomy sweep, first impression, pairwise), canary calibration, independence rules, and the loop with exit criteria and terminal state. The same loop pattern covers **audio** (offline-rendered stems, peak and loudness measurements, voice cap, a written listening checklist when no critic can process audio), **feel** (frame strips plus the feedback coverage test) and **economy** (simulator output reviewed by an independent economy reviewer).

## 7. Other review prompts (documents, not images)

Use verbatim, as with the critic prompts:
- **Scope review:** "Here is a game design and its economy. Imagine a typical player. What do they do in minute 1, 5, 15 and 30? At what minute would they most likely quit and why? What is left to discover at minute 30?"
- **Economy review:** "Here are the economy formulas and simulator output. Where would a player feel stuck, bored or overpowered? Which numbers would you challenge and what would you compute to check?"
- **Fun review:** "List the moments in this design or event log that would feel satisfying and the moments that would feel like waiting or chores. Do not suggest features yet; only describe the experience."
- **Depth review:** see `game-depth.md` section 11.

## 8. Audio and feel essentials

- **Feel spec rows** list trigger, visual, sound, particles, camera, squash/stretch, timing in ms, escalation rule and caps. Cap shake amplitude and duration, particles, voices and simultaneous tweens centrally, and drop the oldest gracefully.
- **Audio:** prefer prebuilt WAV/OGG stems and pooled `AudioStreamPlayer`s. If you synthesize, render offline to files, verify peak below -1 dBFS, no clipping, consistent loudness, seamless loops (set loop points on `AudioStreamWAV`). Layout buses in code or `default_bus_layout.tres`: Music, SFX, UI, with a limiter on Master and volume-tween ducking. Schedule musical events from a beat clock derived from tempo, not from `randf()`.
- Hitstop, anticipation and easing matter more than particle count; escalate feedback with progress (bigger numbers, richer sound layers) rather than constant maximum intensity.

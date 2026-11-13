# Art direction: giving the game a soul

Generic AI-looking games come from skipping design decisions: the model reaches for the same default layout (a column of equal buttons on a gray panel), the same fonts and the same three-color scheme. This file is a pipeline that forces those decisions before any screen exists. Contents: 1 the generic tells, 2 identity brief, 3 explore then choose, 4 layout archetypes, 5 theme-first build, 6 typography, 7 motion and sound personality, 8 asset census and usage.

## 1. The generic tells (treat each as a defect)

Evenly weighted rows of identical cards or buttons; flat gray or navy rounded rectangles; default or generic display font; emoji or mismatched icon styles; gradient headers and soft drop shadows in a pixel game; everything centered and symmetric; no texture or material; the same palette distribution on every screen; UI that sits on top of the world instead of belonging to it; numbers that pop with no personality; no memorable element that would identify a screenshot as this game.

## 2. Identity brief (`design.md` section "Identity", written first)

Fill in every line with concrete choices, not adjectives alone.

1. **World and material:** what is everything physically made of? (stitched cloth, oxidized brass, torn paper, neon tubes, wet stone.) UI parts must look made of it.
2. **Tone:** three adjectives, plus one anti-adjective (what it must never feel like).
3. **Signature elements (3):** memorable, repeatable things such as a custom cursor, a distinctive number-pop, a recurring border motif, a transition, a mascot reaction. A viewer should recognize the game from a cropped screenshot.
4. **Palette story:** dominant / secondary / accent split (about 60/30/10), what each color means, and one color reserved for "important".
5. **Typography story:** why these fonts suit the world (section 6).
6. **Motion personality:** one word (snappy, springy, weighty, floaty, jittery) and the easing curves and timings that express it.
7. **Sound personality:** materials and instruments that match the world (wood, glass, brass; chip, bell, thud).
8. **Anti-references:** three things this game should not resemble, and one genre convention it will deliberately keep.

## 3. Explore, then choose

Do not accept the first direction.
1. Make **3 divergent directions** for the main screen. Differ in material metaphor, palette, and layout structure, not only recolors. Procedural assets are fine at this stage; use the real screenshot rig.
2. Show the three images **unlabeled and in random order** to 3 fresh critics (protocol in `critic-protocol.md`, pairwise pass). Do not say which you prefer.
3. Pick the winner by majority, borrow strong ideas from the others if they fit, and record the rationale in `DECISIONS.md`.
In prototype mode, skip step 2 and choose from the identity brief.

## 4. Layout archetypes

Choose one by asking what the game's fantasy looks like as a physical object, then record the choice.

| Archetype | Fits |
|---|---|
| World-as-interface (the scene is the UI: shop is a stall, upgrades are tools on a wall) | farm, workshop, kitchen, creature care |
| Tabletop or board (items placed on a surface) | card, strategy, management |
| Console or machine panel (dials, lamps, gauges) | factory, space, hacker, engineering |
| Book, ledger or notebook (pages, tabs, stamps) | trading, research, narrative |
| Map-based (regions as nodes, UI attached to places) | expedition, conquest, quests |
| Minimal HUD over a rich scene | action, platformer, roguelike |

Rules: one dominant focal point per screen with clear secondary and tertiary levels; asymmetry is allowed; reduce the number of competing buttons by moving actions into the world or into contextual drawers.

## 5. Theme-first build

1. Build the project `Theme`, fonts and 9-patches **before any screen**.
2. Create `ui/kit_gallery.tscn` showing every component in every state (normal, hover, pressed, disabled, focus), including stress text. Capture it and run one critique round on it alone. Fix the kit, not the screens.
3. Screens are composed **only** from kit components. Lint (`ui_lint`) fails on `add_theme_*_override` calls, inline `StyleBox*` creation, and hardcoded colors or fonts outside the theme builder. If a screen needs a new look, add a kit component first.

## 6. Typography

- Pick fonts for personality, not safety; one for display and numbers, one for small text. Vendor them with the license text.
- Use tabular (fixed-width) digits for changing numbers so values do not jitter.
- If no suitable pixel font exists, create a bitmap font from a hand-designed glyph grid and generate its atlas; design the numerals with the most care.
- Apply outlines or shadows consistently with the light direction.
- Define a type scale and a minimum size, and measure text with the real font (`font.get_string_size`) in the UI lint rather than trusting node sizes.

## 7. Motion and sound personality

Tie every entry of the feel spec to the identity brief: easing curves, durations, squash amounts, particle shapes and sound timbres come from the one-word motion personality and the sound personality. Differences between interactions should be of degree (intensity, tier), not of style.

## 8. Asset census and usage (provided VFX and art must be used or consciously rejected)

At intake, before designing anything:
1. **Census:** list every asset available to the project (brief paths, project folders, referenced packs, provided skills or tools). Write `assets/census.md` with path, type (sprite, VFX, SFX, music, font, shader), size, tags, license, and a thumbnail sheet or strip for visual assets.
2. **Assign:** every census item gets either a use (a feel-spec or UI-map row that names it) or a rejection (`REJECTED: <reason such as style mismatch, wrong scale>`). Silence is not allowed.
3. **Lint:** `tools/asset_usage_lint` lists census assets not referenced by any scene, script or data file, and not rejected. The final build fails the lint if any remain.
4. **Runtime proof:** the `Juice`/effects helper counts every effect it spawns (by asset path) and every sound it plays. In the bot run and the screenshot scenarios, write the counts to `qa/feel/effect_usage.json`. An effect that is referenced but never spawns in 10 simulated minutes is dead code: wire it to a trigger or reject it.
5. Provided VFX should appear at **escalating tiers** (small, medium, large) rather than once; match tier to the player's progress or the event's importance.

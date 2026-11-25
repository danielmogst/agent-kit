---
name: spritekiln
description: Build and animate pixel-art sprites with SpriteKiln from a YAML spec. Use for character, prop or creature sprites, 8-direction top-down or side-view, idle/walk/attack/cast clips, sprite atlases, Aseprite JSON, normal and emissive maps, Godot/Unity/MonoGame export. Use when art must stay identical across frames and directions.
---

# SpriteKiln

## 1. Verify the tool

Run `spritekiln --version`. Expect `0.4.0`.

If the command is missing, install once, globally, and do not create a virtualenv in a user project:

```
python -m pip install --user pipx
py -m pipx install spritekiln
```

If `spritekiln` is not on PATH, call `%USERPROFILE%\.local\bin\spritekiln.exe`.

## 2. Create the job folder

Create exactly one folder for the job. Write nothing outside it.

- User supplied a path: create the job folder inside that path.
- No path supplied: create `D:\SpriteKiln\<task-slug>-<yyyymmdd>\`.
- Task name too vague to slug: ask for one. Do not invent a placeholder.
- `cd` into that folder for every command.

## 3. Record the art style

Run `spritekiln style`. If no style is recorded, ask the user for: view, on-screen height,
directions, outline, shading, dither, proportions, face detail, animation feel. Record the
answers with `spritekiln style set ...`. Never re-ask per asset; change only on request.

## 4. Choose the rig, then build

Pick the rig from the brief before writing any geometry. Decide, do not ask.

**Humanoid** — the brief describes a person-shaped body: human, soldier, mage, knight, civilian;
two arms, two legs, upright, head on top.

**Non-humanoid** — any of:
- a different body plan: wings, tail, extra limbs, no legs, quadruped, floating
- a build far from human proportions: shoulder-to-hip ratio above 1.6, height under four heads,
  torso pitched more than 10° forward, limbs longer than the torso
- words that describe mass or posture rather than a person: hulking, squat, hunched, towering,
  monstrous, insectile, mechanical

Non-humanoid means: keep only the skeleton joints the animation needs, delete the template's
torso, head, arm and leg parts, and author the body from primitives with the bone lengths and
positions the brief implies. Kits stay usable for weapons and cloth only.

Either way, state in one line before building: rig, height, shoulder-to-hip ratio, head fraction
of height, leg length, posture angle. If the brief is ambiguous, pick the reading that matches its
dominant visual word and say which you picked. Never default to humanoid out of convenience.

```
spritekiln init --engine generic --ai generic
spritekiln new <name> --extends     # or `new <name>` for a full copy
spritekiln validate art/specs/characters/<name>/<name>.yaml
```

`--extends` inherits the template's skeleton, proportions and body parts. Use it only for a
humanoid of ordinary build. Otherwise use a full `new <name>` and state the skeleton numbers in
the spec rather than scaling the template:

- total height and shoulder width
- hip height and thigh/shin lengths
- head size, and how much of the body the head occupies

Derive those numbers from the brief. The template's body is a starting point, never the design.

### Rest-pose audit — before any animation

- Compare hip-to-ankle distance against thigh + shin lengths. If the distance is shorter, the IK
  bends the knees and the character reads crouched no matter what garment hides the legs. Aim for
  a knee bend of roughly 10–15° in the rest pose: raise the hips or lengthen the legs.
- Confirm in the `e` view: hip, knee and ankle should sit on a near-straight line.
- Check where each garment ends — knee, ankle or floor — and that it is deliberate, not mid-shin.
- Check the silhouette against the brief's build, not the template's.

Edit the spec as text. Change one part or one key per pass.

## 5. Iterate blind-free

```
spritekiln pose <spec> --dirs all                 # ~1 s per direction
spritekiln pose <spec> --focus head --dirs all    # faces are 3–6 px otherwise
spritekiln pose <spec> --changes                  # after an edit, only changed directions
```

Open the PNG. Check silhouette in `s`, `e`, `n` and one diagonal. Never judge from the YAML.
`--draft` is for silhouettes only.

## 6. Render and export

```
spritekiln render <spec> --anims idle,attack --dirs s,e
spritekiln export <spec>
```

Read the QA summary. Fix every error before handing over. Files under `out/` are generated;
never edit them.

## 7. Report

Return: the job folder path, the render paths, QA warnings left, and what changed.

## Rules

- Palette files resolve at `<specs>/palettes/<name>.yaml`.
- Never ship the template's proportions unmodified: every spec states its own height, width and
  leg length, and the audit above passes before animating.
- A silhouette that could belong to any humanoid of the same height is a rejection. Every design
  needs one dominant shape, one asymmetry, three value zones (dark, mid, accent) and one prop or
  feature that changes how the character reads at 1x.
- Keep on-screen height, camera pitch and camera scale identical across a project's assets.
- One model, one camera, one light: never mix scales between characters.
- Cast animations read as raise → charge → release → settle. Lateral swings read as melee.
- On-screen height 96 px, frame 176 px, flat shading, selective outline, no dither, unless the
  project style says otherwise.
- If a render clips a frame edge, raise `size` or move `camera.center`; never change
  `camera.scale` for a single asset.

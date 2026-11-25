---
name: spritekiln-prompt
description: Write a SpriteKiln character prompt from a vague or detailed character idea. Use when asked for a sprite prompt, character brief, or "prompt for the warden/mage/etc." Returns the prompt only.
---

# SpriteKiln character prompt

Input: a character idea, from one word to a full brief.

## Expand

If vague, decide and commit — never ask:
- one silhouette idea that reads at 1x (a shape, not an adjective)
- one asymmetry (a thing on one side only)
- 3–7 concrete, renderable details (material, garment, prop, mark)
- a 3-tone palette (dominant, accent, glow/contrast)
- one signature prop or feature that must survive at small size
- the build: height, width, posture, leg length, head-to-body ratio — always, because the rig
  defaults to a normal standing humanoid and will otherwise decide the character's shape

If detailed, keep the user's intent, replace vague words with renderable specifics, fill only the gaps.

## Output

Return only the prompt, in one code block, in this shape:

```
Use the spritekiln skill. Make a brand-new character for my game — <one-line identity>, not a copy.

Output folder: D:\SpriteKiln\<slug>-<date>\

Brief: <role>, <build: height, width, posture, head-to-body ratio>, 96px on screen, top-down 3/4,
8 directions. Build the silhouette first: <shape>.
<3-7 concrete details>. <asymmetry>. <palette + one lighting note>.

Must keep: <3-5 traits that must read at 1x>.

Work in this order: style → silhouette in s/e/n → asymmetry → face/head at 12x → palette →
idle (8f) → <signature action> (12f: <4-5 beats>). Show me the pose sheet before animating.

Accept when: reads clearly at 1x, silhouette unique against a plain background, no clipping,
<one prop> never merges into <one garment>, QA clean, and the <action> loops back to idle.
```

Rules: no questions, no explanation, no options, nothing outside the code block. Slug comes from the character noun, lowercase, hyphenated.

---
name: spritefusion-vfx
user-invocable: false
description: Use when adding, authoring, or porting pixel-art visual effects for a game — explosions, hits, slashes, muzzle flashes, blood, fire, lightning, ice, poison, energy, shields, black holes, holy light, healing, power-ups, pickups, sparkles, rain, snow, fog, embers, fireflies, leaves, bubbles — or when generating pixel-art sprites, animations, 8-direction views, or normal maps with Sprite Fusion. Ships 25 MIT-licensed effects as TypeScript source, plus the Sprite Fusion MCP tools.
---

# Sprite Fusion pixel art VFX

25 open-source pixel art VFX effects (MIT, © Hugo Duprez), each **one dependency-free TypeScript file**
that draws its pixels and particles at runtime. They are code, not spritesheets: size, palette and timing
are options, so one file makes a small hit or a big blast and can be tuned to the game it lands in.

This skill carries a local copy of all 25 sources in `library/<slug>.ts` and the catalog in
`references/effects.md`, so it works with no network and no sign-in. The Sprite Fusion MCP server
(below) is the live source for full recipes and for generating new sprites.

## What costs money — read before calling a tool

- **Free, forever:** everything in this skill, plus the MCP tools `list_vfx`, `get_vfx`, `create_normal_map`,
  `list_assets`, `get_asset`, `list_tags`, `set_asset_tags`, `get_credits` and `create_upload`. The VFX
  library is MIT licensed for commercial use, and browsing it, reading recipes and shipping the effects
  costs nothing.
- **Paid:** the sprite *generator* — `generate_sprites`, `edit_sprite`, `generate_sprites_in_style`,
  `create_8_directions`, `animate_sprite`. Each call spends **15 credits** from the user's Sprite Fusion
  account, and credits come from a paid plan (no free monthly allowance is advertised). Generation is a
  separate product from the VFX library; using the VFX library never requires credits.
- **Rule:** NEVER call a generation tool on your own initiative, and never to "try" or "see what happens". You are not allowed!
  A 401 does not mean "buy credits" — check whether you actually needed a paid tool, because the VFX path does not.

## Start here

1. **Find the closest effect** — read `references/effects.md` (slug, title, category, one-liner) or grep
   `library/` for the look you need. Don't hand-build an effect from nothing while a library effect is
   closer; the recipe's timings and layers are what make it read as pixel art.
2. **Read the source** — `library/<slug>.ts` is the whole effect. Its `Options` interface is the tuning
   surface, its palette constants are the look.
3. **Get the recipe when it matters** — the `.ts` says *what*, the recipe says *why* (timeline, layers,
   palette numbers, which knobs matter). Use the MCP `get_vfx` tool for that, and whenever you need to
   rebuild the effect in another engine or language.
4. **Run it before claiming it works** — step `update(dt)` and `draw(fr)` and look at the pixels.

## Runtime contract

Every effect has this shape:

```ts
export interface Frame { w: number; h: number; ox: number; oy: number; color: Uint32Array; light: Uint32Array }
export type Layer = "back" | "front";

export default function effectName(o: Options = {}): {
  update(dt: number): void;             // dt in seconds
  draw(fr: Frame, layer?: Layer): void; // "back" then "front" around your characters
  stop(): void;                         // finite effects: stop spawning
  done(): boolean;                      // true when a finite effect has fully played out
};
```

- **`color`** — packed 0xAABBGGRR; read the buffer as `Uint8ClampedArray` to get **RGBA** byte order on
  little-endian (browsers, Node, C#/x86). Alpha `0` = untouched pixel; `255` = opaque; values in between
  are alpha-blended pixels (smoke, the coolest fire), so composite over your scene rather than fill it.
- **`light`** — a second buffer in the same packing holding **additive glow only**. Composite as
  `min(255, dest + light)` (or as a lightmap). Effects that emit light write here; the rest leave it clear.
- **Layers** — draw the effect `"back"`, then the sprite/character, then `"front"`, so particles pass
  in front of and behind the character. Ignoring the layers flattens the effect.
- **Space** — `fr.ox`/`fr.oy` are the camera's top-left in **art pixels**. Option positions, sizes and
  speeds are in **world units: 2 per art pixel**, so an `area` covering a 320×200 art-pixel frame is
  `{ x: 0, y: 0, w: 640, h: 400 }`. Effects also draw on a 2×2 chunked grid, so pixels are chunky by design.
- **`Options`** — per-effect, but commonly `area` (`{x,y,w,h}`), `density`, `wind`, `seed`, `ground`,
  plus palette/scale/`layer` knobs. `seed` makes it deterministic; `wind`/`density` make one file cover
  a drizzle and a storm.

## Integrate (web / any JS or TS engine)

```ts
const W = 320, H = 200;
const fr = { w: W, h: H, ox: 0, oy: 0,
             color: new Uint32Array(W * H), light: new Uint32Array(W * H) };

const fx = snow({ area: { x: 0, y: 0, w: W * 2, h: H * 2 }, density: 0.7, wind: 22 });

// once per frame
fx.update(dt);
fr.color.fill(0); fr.light.fill(0);
fx.draw(fr, "back");
drawCharactersInto(fr);      // your game writes the same packed pixels
fx.draw(fr, "front");

// composite: draw the effect on its own layer, then blit it over the scene
const layer = new ImageData(new Uint8ClampedArray(fr.color.buffer), W, H);
fxCtx.putImageData(layer, 0, 0);   // fxCtx belongs to an offscreen canvas
ctx.drawImage(fxCanvas, 0, 0);     // your scene is already drawn underneath
```

Tile `area` across a big level and shift `seed` per chunk so the weather doesn't repeat visibly.
Finite effects (explosion, hit, pickup) call `stop()` when their source dies and `done()` once every
particle has left; looping effects (rain, snow, fog, embers) never finish, so despawn them by timer or
by taking them off-screen.

## Port to Unity, Godot, GameMaker, or another language

The effects are dependency-free and use plain math, so port them rather than approximating them:

- Port `update(dt)` and `draw()` literally — the numbers (friction, lifetimes, dithering thresholds)
  are the effect. Keep the chunked pixel grid; drawing on the native pixel grid at fractional
  positions is what makes it look pasted-on.
- Fetch `get_vfx` for the recipe when the port must be faithful rather than merely similar: it names
  the timeline, layers, palette and the parameters that carry the look, in engine-neutral terms.
- If the engine needs a spritesheet instead of live code, run the effect headlessly for its frames and
  pack the frames into an atlas.

## Generating sprites and animations (MCP)

The same MCP server generates pixel art. Tool names carry a client-specific prefix
(DSH: `mcp__spritefusion__<tool>`); the raw names are:

| Tool | Use | Cost |
|---|---|---|
| `generate_sprites` | 12 sprites from a prompt at 16–80 px, or 4 at 96–128 px | 15 credits |
| `edit_sprite` | change a sprite, up to 8 reference images | 15 credits |
| `generate_sprites_in_style` | 9 sprites matching 1–20 reference images | 15 credits |
| `create_8_directions` | one sprite → 8 directional views | 15 credits |
| `animate_sprite` | animate one sprite from a motion prompt | 15 credits |
| `create_normal_map` | normal map for a sprite or animation | free |
| `list_vfx` / `get_vfx` | the VFX library catalog / one effect's recipe, source and options | free |
| `list_assets` / `get_asset` / `list_tags` / `set_asset_tags` / `get_credits` / `create_upload` | library, tags, balance, large inputs | free |

Ask before spending credits, and say what it will cost. Generations land in the user's Sprite Fusion
library; tag results with the game's name (one tag per project) so they're findable later. Images are
passed as `{"asset_id": "..."}`, as a `data:image/png;base64,...` data URL under 1 MB, or via
`create_upload` for larger files — chat attachments can't reach the tools directly.

## Making a new effect

Build from the nearest effects instead of starting blank — e.g. acid rain from `rain` + `poison`, a
fireball from `energy`, a boss death from `explosion` + `black-hole`. Keep the library's contract
(`Frame`/`update`/`draw`/`stop`/`done`) and its aesthetics:

- draw on the pixel grid with a limited palette, dither (Bayer/ordered) instead of alpha-blending soft edges;
- separate `back`/`front` so sprites sit inside the effect;
- write emissive pixels to `light`, not just brighter color;
- drive motion from `dt` so the effect is frame-rate independent, and seed randomness for reproducibility.

## Licensing

MIT — free for commercial use, modification and redistribution. Keep the `MIT License` /
`Copyright (c) 2026 Hugo Duprez` header on derived files.

## Files

| Path | Contents |
|---|---|
| `references/effects.md` | all 25 effects: slug, title, category, one-liner, situations |
| `references/effects.json` | the same catalog as machine-readable JSON (with preview URLs) |
| `library/<slug>.ts` | the complete source of each effect |
| `references/render-check.mjs` | runs `snow` and `explosion` headlessly and writes PNGs — proves a change works |

`render-check.mjs` needs Node 22.18+ for native TypeScript type stripping:
`node references/render-check.mjs <output-dir>`. Copy its `makeFrame`/`toRGBA` helpers to preview
any other effect.

---
name: pixel-game-studio
description: Route pixel-art game work between Pixy for sprites, tiles and baked assets, and Pixelfx for runtime VFX. Use when creating, editing, iterating on or building a pixel-art game, its sprites, tiles, animations or effects.
---

# Pixel Game Studio

This is a router skill. Read the relevant skills before acting, then use each where it is strongest.

## Skills to read

- **`pixy-pixel-art`** — sprites, characters, tiles, icons, tilesets, baked animations, scenes and static game assets. Uses JSON recipes and exports PNG, APNG, GIF, sprite sheets and atlases.
- **`pixelfx`** — live runtime VFX in JavaScript/TypeScript games, and exported effect sprite sheets. Uses code modules from `D:/GitHub/pixelfx`.
- **`spritefusion-vfx`** — optional only. Read it only if the user asks for a specific Sprite Fusion effect or paid generation. Do not use it by default.

Read both core skills for asset-plus-effect work. Do not copy their full instructions into this skill; follow their own workflows.

## Routing

| Task | Use |
|---|---|
| Character, enemy, NPC, item, icon | Pixy |
| Tileset, tilemap, terrain, UI icon | Pixy |
| Baked idle/walk/attack animation | Pixy |
| Sprite sheet or atlas for any engine | Pixy, or Pixelfx sheet export for effects |
| Live fire, explosion, slash, spell, weather | Pixelfx |
| Runtime hit-stop, screen shake, effect lighting | Pixelfx |
| Godot/Unity effect frames | Pixelfx sheet export, then import |
| Exact Sprite Fusion effect | Sprite Fusion, only on request |

## Workflow

1. Identify the game engine and target resolution. Ask only if the user has not decided.
2. List the assets and effects separately.
3. Build all core assets in Pixy. Validate, inspect every frame, then render.
4. Build runtime effects in Pixelfx. Render/check the effect, then integrate it into the game loop.
5. If the engine is not JavaScript/TypeScript, export effect sprite sheets from Pixelfx and import those assets into the game.
6. Integrate, run the game, and inspect the actual result. Do not call an asset done because its recipe validates.

## Rules

- Do not ask Pixy to write runtime game effects; do not ask Pixelfx to draw character sprites.
- Do not use Sprite Fusion generation unless explicitly requested; it costs credits.
- Keep source assets and generated exports in the project. Do not hotlink remote assets.
- Do not use `npx`, package-manager updates or upstream installers.
- If the two skills disagree, this router decides the division: Pixy for assets, Pixelfx for runtime effects.

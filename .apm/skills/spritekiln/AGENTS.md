# SpriteKiln

Build pixel sprites from a YAML spec with the `spritekiln` CLI.

## Check

Run `spritekiln --version` (expect 0.4.0). If missing: `python -m pip install --user pipx` then
`py -m pipx install spritekiln`. Do not create a virtualenv inside the user's project. If the
command is not on PATH, use `%USERPROFILE%\.local\bin\spritekiln.exe`.

## Job folder

Create exactly one folder per job; write nothing outside it.

- Path given: create the job folder inside it.
- No path: `D:\SpriteKiln\<task-slug>-<yyyymmdd>\`.
- Task too vague to slug: ask. Do not invent a name.
- Run every command from inside that folder.

## Commands

```
spritekiln init --engine generic --ai generic
spritekiln style                                   # record once per project
spritekiln new <name> --extends
spritekiln validate art/specs/characters/<name>/<name>.yaml
spritekiln pose <spec> --dirs all                  # ~1 s per direction
spritekiln pose <spec> --focus head --dirs all
spritekiln render <spec> --anims idle,attack --dirs s,e
spritekiln export <spec>
```

## Rules

- `validate` after every edit; fix `file:line:column` errors before rendering.
- Open the rendered PNG. Never judge quality from the YAML.
- `--draft` for silhouettes only.
- One part or one key per edit pass.
- Never edit files under `out/`.
- Palettes resolve at `<specs>/palettes/<name>.yaml`.
- Keep on-screen height, camera pitch and scale identical across a project's assets.
- Clipped frame: raise `size` or move `camera.center`; never change `camera.scale` per asset.
- Cast: raise → charge → release → settle. Lateral swings read as melee.
- Defaults: 96 px height, 176 px frame, flat shading, selective outline, no dither.
- Finish by reporting the job folder and the render paths.

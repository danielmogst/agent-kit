---
name: comfyui-image-generation
description: Generate images locally with the ComfyUI MCP (server "comfyui", tools mcp__comfyui__*) by running the user's Krea-2 Turbo workflow with the sint-pixel LoRA. Use for any image, sprite, character, icon, prop, texture or game-asset request that should be produced by this workflow - single images, probes, and large multi-asset sets in one run. Covers the LoRA trigger-word discipline, slot setting, queueing, the transparent 128px cutout output, and batch and resume handling. Do not substitute another image generator or pixel-art tool unless the user explicitly asks for one.
---

# ComfyUI image generation

Workflow: `krea2_turbo_t2i.json`. It is the only workflow used unless the user names
another. Do not route image work to a different generator or skill.

Chain: Krea-2 Turbo + `sint-pixel-krea2-v1` LoRA -> BiRefNet background removal ->
`nearest-exact` downscale -> transparent PNG.

Source of truth: `<server_info.workspace.path>\user\default\workflows\krea2_turbo_t2i.json`.
Full slot map, graph order and traps: `references/workflows.md`.

## LoRA trigger discipline

All four conditions hold on every run, or the LoRA does not take effect:

| Slot | Required value |
|---|---|
| `30.lora_name_1` | `sint-pixel-krea2-v1.safetensors` |
| `30.strength_model_1` | `0.99`; never zero it |
| `30.string_b_1` | `sintpixel` - the trigger-word box |
| `30.value` | prompt, beginning with `sintpixel, ` |
| `30.value_1` | `false` - prompt enhance OFF |

Rules:

- Write the trigger as the exact lowercase token `sintpixel`. Never translate,
  paraphrase, capitalise differently or drop it from the prompt.
- Keep the trigger in both places: the prompt text and the trigger-word slot. The
  workflow concatenates them, so omitting either weakens or disables the effect.
- Keep prompt enhancement OFF: `30.value_1` = `false`. Verified on this graph, turning
  it on (`true`) replaced a trigger-bearing prompt with an expanded paragraph that
  contained no `sintpixel`, so the LoRA did not apply and the image came back without
  a pixel grid.
- After writing, re-read the slots and confirm all four values. A write that did not
  land produces a normal-looking image with no pixel grid and no error.
- The LoRA loader lives at node `15` inside subgraph `30`. Its filename and strength
  are promoted to `30.lora_name_1` and `30.strength_model_1`; set them at those
  addresses. The `krea2_darkbrush` values stored inside the definition are
  pre-promotion defaults and are overridden.
- If the result has no visible pixel grid or block-aligned edges, check these four
  values before changing anything else.

## Slots

| Purpose | Address |
|---|---|
| prompt (starts with `sintpixel, `) | `30.value` |
| prompt enhance (keep OFF) | `30.value_1` |
| LoRA trigger word | `30.string_b_1` |
| LoRA file | `30.lora_name_1` |
| LoRA strength | `30.strength_model_1` |
| seed | `30.seed_1` |
| steps | `30/3.steps` |
| aspect ratio | `49.aspect_ratio` |
| generation size | `49.megapixels` |
| output pixel size | `56.width`, `56.height` |
| batch | `30/5.batch_size` |

Decoys that ignore writes: `30.width_1`, `30.height_1`. Change size through
`49.aspect_ratio` and `49.megapixels` instead.

## Preconditions for asset 1

- `server_info`: `server.running` is true. If false, ask the user to start ComfyUI.
  Never call `launch_comfyui`.
- `search_models`: `krea2_turbo_fp8_scaled.safetensors`,
  `qwen3vl_4b_fp8_scaled.safetensors`, `qwen_image_vae.safetensors`,
  `sint-pixel-krea2-v1.safetensors` and `birefnet.safetensors` are present.
- `list_workflow_slots` on the job copy. Read the addresses; do not recall them.
- Project output directory fixed and pristine source copied to `workflows/src/`.

## Run loop

1. Copy the pristine source to `workflows/<job-id>.json`. Never edit files in
   `user\default\workflows`.
2. `list_workflow_slots` on the copy.
3. `set_workflow_slot(path, overrides, stdout=false)` with structured
   `{address, value}` entries.
4. `list_workflow_slots` again and compare every written value. A `linked_from` slot
   keeps its old value, which means the write was lost.
5. `validate_workflow`: require `valid: true`, `converted_from_ui: true`, and
   `converted_node_count: 28`.
6. `run_workflow(path, wait=false)` returns `prompt_id`; poll
   `job(action="wait", prompt_id=...)` to terminal.
7. `fetch_outputs(prompt_id, out_dir)`; select the asset from `outputs_by_node` and
   the URL's `type=output`.
8. `read_image` the result, and confirm `text_outputs` still contains `sintpixel`,
   before reporting anything.

## Output

Every run produces two files:

- `type=output` from save node `29`: the delivery. A transparent RGBA cutout,
  `56.width` x `56.height`, 128x128 by default, background removed by BiRefNet.
- `type=temp` from preview node `55`: the full ~1 MP render with its background
  intact. Use it when the background is wanted or the cutout removed something
  unintended.

To keep the background in the saved file, set node `63` to `mode: 4` in the job copy;
bypass passes the image through.

`fetch_outputs` writes `<first 8 chars of prompt_id>_<index>.png` in URL order. Rename
to the project convention after listing `out_dir`. `read_image` reports true pixel
dimensions; confirm them before shipping.

## Verification

- Full `read_image`: the first two or three assets, every probe, every hero asset.
  Check subject, silhouette, grid alignment, edge quality, and that the background
  is transparent where intended.
- Above ten assets: montage 8-12 cutouts per sheet on a checkerboard and read the
  sheet. Catches style drift, opaque or dirty backgrounds and broken silhouettes.
- Record `verified: full | montage | none` per asset. `montage` is not `full`.
- Retry ladder: seed, then steps, then wording, then layout or LoRA strength.
- Compare a set against itself; differing pixel scale or palette means re-run.

## Hard rules

- Never modify files in `user\default\workflows`; copy first.
- Never call `launch_comfyui`, `stop_comfyui`, `restart_comfyui`, `update_comfyui`,
  `switch_comfyui_version`, or `comfy set-default`. The Desktop app owns the install.
- Never pass `confirm_spend` without the user's explicit agreement for that run.
- Never enable network exposure (`--listen`, CORS).
- Never state that an image exists, is the intended size, or looks correct without
  `read_image`.
- Never drop, translate or silently replace the `sintpixel` trigger.
- No photorealistic depiction of real identifiable people without consent, no named
  living-artist style imitation, and flag trademarked characters instead of rendering
  them silently.

## Scale

Load `references/batch-runs.md` before any run above ten assets: manifest schema,
per-asset snapshots, probe-first sequencing, determinism checks, idempotent resume,
queue and hang control, absence policy, verification tiers.

## Failures

Load `references/troubleshooting.md` when a run fails, stalls, or produces an
implausible result.

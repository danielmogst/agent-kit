# krea2_turbo_t2i.json

The only workflow used for image generation unless the user names another.

Path: `<server_info.workspace.path>\user\default\workflows\krea2_turbo_t2i.json`.
Copy it once to `workflows/src/krea2_turbo_t2i.json` in the project and build every
job from that copy.

## What it is

Krea-2 Turbo at 10 steps, cfg 1, with the `sint-pixel-krea2-v1` LoRA, a BiRefNet
background-removal pass and a `nearest-exact` downscale. Output is a transparent
RGBA cutout sized by `56.width` x `56.height`, 128x128 by default.

## Graph

Top level, 9 nodes and 2 subgraphs; 28 nodes after subgraph expansion.

| Node | Role |
|---|---|
| `30` | subgraph "Text to Image (Krea-2 Turbo)", 20 interior nodes |
| `49` | ResolutionSelector: `aspect_ratio`, `megapixels` |
| `55` | PreviewImage: full ~1 MP render, `type=temp`, opaque |
| `63` | subgraph "Remove Background (BiRefNet)", always on (`mode: 0`) |
| `56` | ImageScale, `nearest-exact`, default 128x128 |
| `29` | SaveImage, `type=output`, prefix `Krea2_turbo` |
| `47`, `48`, `50` | MarkdownNote documentation |

Interior of `30`:

| Node | Role |
|---|---|
| `3` | KSampler: 10 steps, cfg 1, `euler`, `simple`, denoise 1 |
| `5` | EmptyLatentImage: 1024x1024, batch 1 |
| `6` | CLIPTextEncode, positive prompt |
| `8` | VAEDecode |
| `10` | UNETLoader: `krea2_turbo_fp8_scaled.safetensors` |
| `11` | CLIPLoader: `qwen3vl_4b_fp8_scaled.safetensors`, type `krea2` |
| `12` | VAELoader: `qwen_image_vae.safetensors` |
| `13` | ConditioningZeroOut, negative |
| `15` | LoraLoaderModelOnly, promoted to the parent |
| `16`, `18` | TextGenerate and its system prompt: optional prompt expansion |
| `17`, `27` | StringConcatenate: assemble prompt and trigger |
| `19` | PrimitiveStringMultiline: raw prompt |
| `21`, `22`, `28` | ComfySwitchNode |
| `23`, `24` | PrimitiveBoolean |

## Text path and the trigger

`30.value` is the prompt. `30.string_b_1` is the trigger-word box. Both feed the text
assembly (`17`, `27`) that produces the encoded positive prompt.

- Set the prompt to begin with `sintpixel, ` and keep `sintpixel` exactly as written
  in `30.string_b_1`.
- `30/16` is a prompt-expansion path with its own system prompt at `30/18`. If
  expansion is active it rewrites the text, so the trigger can change. Read
  `text_outputs` in the job status after a probe and confirm the rendered text
  contains `sintpixel`. If it does not, disable expansion or shorten the prompt.
- `30.value_1` is `prompt_enhance` and must be `false`. Verified: set to `true`, node
  `30/16` rewrote a trigger-bearing prompt into an expanded paragraph that omitted
  `sintpixel`, so the LoRA did not apply.
- `30.value_3` gates the feature switch on the LoRA path. Leave it at its shipped
  value (`true`).

## LoRA

The loader is `15`, `LoraLoaderModelOnly`. Its filename and strength are promoted to
the subgraph instance, so the editable addresses are `30.lora_name_1` and
`30.strength_model_1`; node `15` has no interior slot address.

- `30.lora_name_1` = `sint-pixel-krea2-v1.safetensors`
- `30.strength_model_1` = `0.99`
- The `krea2_darkbrush` / `0.8` values stored on node `15` inside the definition are
  pre-promotion defaults, replaced by the promoted values at run time.

## Slots

| Purpose | Address |
|---|---|
| prompt | `30.value` |
| prompt enhance (OFF) | `30.value_1` |
| trigger word | `30.string_b_1` |
| LoRA file | `30.lora_name_1` |
| LoRA strength | `30.strength_model_1` |
| seed | `30.seed_1` |
| steps | `30/3.steps` |
| cfg | `30/3.cfg` |
| sampler | `30/3.sampler_name` |
| scheduler | `30/3.scheduler` |
| aspect ratio | `49.aspect_ratio` |
| generation size | `49.megapixels` |
| output pixel size | `56.width`, `56.height` |
| batch | `30/5.batch_size` |

Decoys that ignore writes: `30.width_1` (link 85), `30.height_1` (link 86). Change
frame shape through `49.aspect_ratio` and `49.megapixels`.

## Models

Verify with `search_models` before asset 1:

- `krea2_turbo_fp8_scaled.safetensors` (diffusion_models)
- `qwen3vl_4b_fp8_scaled.safetensors` (text_encoders)
- `qwen_image_vae.safetensors` (vae)
- `sint-pixel-krea2-v1.safetensors` (loras)
- `birefnet.safetensors` (background removal)

## Validation

`validate_workflow` on this graph returns `valid: true`, `converted_from_ui: true`,
`converted_node_count: 28`, `partner_nodes: []`, `spends_credits: false`. A count of
0 means the check inspected nothing.

## Output files

Two per run:

1. `type=output` from node `29`: the delivery, transparent RGBA cutout at
   `56.width` x `56.height`.
2. `type=temp` from node `55`: the full ~1 MP render with background intact.

`fetch_outputs` numbers them `<first 8 of prompt_id>_<index>.png` in URL order.
Select by node id and `type`, not by size or order.

## Slot mechanics

- `linked_from` means the slot is a mirror; writes there are discarded silently.
  Find the promoted proxy that feeds it.
- Subgraph interiors address as `A/B.name` (`30/3.steps`); promoted widgets as
  `A.name` (`30.value`).
- Structured `{address, value}` overrides preserve JSON types; the string form
  coerces.
- After any write, re-read the slots and compare. A successful call is not proof the
  value changed.

## Batch sizing

`30/5.batch_size` is a live, unlinked throughput knob. A batch of N returns N files
per job; give each candidate its own manifest row and map files by index before
renaming.

## Adding or changing the workflow

1. `list_workflow_slots` and record each address with its `node_type`.
2. Parse the file for `SaveImage` and `PreviewImage` nodes and their `mode`; muted
   nodes emit nothing.
3. `validate_workflow`; require a real converted node count.
4. Run one probe and inspect `outputs_by_node` before trusting the graph.
5. Record the slot map and any trap here.

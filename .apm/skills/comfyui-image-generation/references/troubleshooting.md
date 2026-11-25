# Failures

## First response to any failed or implausible run

1. `job(action="status", prompt_id=...)` for `status`, `error`, `outputs_by_node`,
   `text_outputs`.
2. `job(action="error", prompt_id=...)` for `error_code`, node id, traceback tail.
3. `get_logs` with an explicit `port` when more than one instance has run here.
4. Then change one variable at a time.

## Symptom table

| Symptom | Cause and response |
|---|---|
| `server_not_running` | Server is down. Ask the user to start ComfyUI. Do not call `launch_comfyui`. |
| No pixel grid, soft or painterly output | The LoRA did not take effect. Check `30.lora_name_1` = `sint-pixel-krea2-v1.safetensors`, `30.strength_model_1` above zero, `30.string_b_1` = `sintpixel`, and that `30.value` opens with `sintpixel, `. Re-read the slots; a write that did not land leaves no error. |
| Trigger missing from the rendered text | Prompt enhance was on. Set `30.value_1` = `false`, confirm `text_outputs` contains `sintpixel`, rerun. |
| Prompt ignored, previous prompt rendered | The write went to a decoy or a linked slot, or to `30/15` instead of the promoted `30.lora_name_1`. Re-read slots after writing. |
| Saved image is 128x128 (or another small size) | Expected. `56.width` x `56.height` sizes the cutout. Change those slots for a different delivery size. |
| Saved image has a transparent background | Expected. Node `63` always removes the background. |
| Saved image keeps its background | Node `63` was bypassed or removed. Check its `mode` (`0` on, `4` bypass). |
| Background removed too aggressively | Subject edges or thin details were cut. Lower the cutout reliance: use the `type=temp` render, or bypass `63` and cut out later. |
| Saved image is the full 1024 render, background intact | The wrong file was selected. Take node `29` (`type=output`), not node `55` (`type=temp`). |
| Job ends `error_code: server_died` | Usually out of memory. `get_logs`, `free_memory`, then reduce `49.megapixels` or `30/5.batch_size` and retry once. |
| Unknown node class at run time | `workflow_deps` maps classes to packs. `install_node` needs the user's consent, and the pack loads only after the user restarts ComfyUI by hand. Never call `restart_comfyui` on the Desktop instance. |
| `valid: true` but the run is nonsense | An old UI export can check zero nodes and still report valid. Require `converted_from_ui: true` and `converted_node_count: 28`; a count of 0 checked nothing. |
| `spend_consent_required` | The graph embeds partner API nodes. Ask the user for that run. Never pass `confirm_spend` to clear the error. |
| `wait=true` times out | Not a failure. Resubmit with `wait=false` and poll `job(action="wait")`. |
| Output black, blank or noise | Model, VAE or CLIP mismatch. Confirm loader slots against `search_models`: `krea2_turbo_fp8_scaled`, `qwen3vl_4b_fp8_scaled`, `qwen_image_vae`. |
| Job absent from `job(action="queue")` | Submission failed before queueing. Re-run `run_workflow` and read its error payload. |

## Validation blind spots

`validate_workflow` checks wiring, enums and class availability against live
`object_info`. It does not check:

- missing required inputs in some graphs;
- `COMFY_DYNAMICCOMBO_V3` sub-inputs, which this workflow has on `30/16`;
- old UI exports, which can convert to zero nodes and still report valid;
- memory. A large allocation can validate cleanly and then kill the server.

A pass is permission to try, not proof of success.

## Suspected hang

`running` with a frozen `updated_at` in `job(action="queue")` and no new `get_logs`
lines after several minutes means hung, not slow. Cancel, free memory, retry once at
lower resolution, then mark failed.

## Sizing

Recover from memory pressure by lowering `49.megapixels` or `30/5.batch_size` before
lowering steps. Check `system_stats` for `vram_free` before a heavy run and call
`free_memory` after a crash.

## When the file looks right but ships wrong

Check in this order: pixel dimensions from `read_image`, alpha channel, the manifest
row's `out_path`, and whether the file came from a `type=temp` URL. The recurring
shipping failures are the temp render instead of the cutout, a cutout where a
background was wanted, and a slot write that silently did not land.

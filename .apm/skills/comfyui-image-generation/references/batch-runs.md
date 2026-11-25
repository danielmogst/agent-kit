# Batch runs

Load for any job above ten assets, or any run the user may walk away from.

## 1. Manifest first

Write `assets.json` in the project before generating. One row per asset:

```
{ "id": "hero_01", "workflow": "workflows/hero_01.json",
  "prompt": "sintpixel, pixel art game sprite of ...",
  "trigger": "sintpixel", "lora": "sint-pixel-krea2-v1.safetensors",
  "strength": 0.99, "width": 1024, "height": 1024, "seed": 4100,
  "out_path": "art/hero_01.png", "status": "pending", "verified": "none" }
```

`status`: `pending | running | done | failed | blocked`. Update each row as work
proceeds so an interrupted run resumes from the file alone.

Validate the manifest before asset 1: every `prompt` starts with `sintpixel, `, every
`trigger` is exactly `sintpixel`, every `lora` names the sint-pixel file, no
`strength` is zero, and every job file has `30.value_1` = `false`.

## 2. One resolved workflow per asset

For each row, copy the pristine source to `workflows/<id>.json`, apply that row's
slots, and record that path. A single shared copy mutated per asset makes every row's
`workflow` field wrong except the last and destroys reproducibility.

## 3. Trigger continuity

The LoRA must hold for every asset in a set. Write the trigger into the prompt on
every row; do not assume it carries over from the previous job or from the workflow
file. Re-check `30.string_b_1` and `30.lora_name_1` after every slot write, not once
per batch.

A set produced with the trigger present on some rows and missing on others has two
different pixel treatments and cannot be shipped as one set.

## 4. Probe before committing

Run one asset at the target settings and inspect it. Confirm three things before the
batch: the subject reads correctly, the pixel grid is aligned, and the background is
cleanly transparent. A wrong size or a missing trigger discovered after forty assets
costs a full re-run.

## 5. Sequential

Issue one `run_workflow` at a time and wait for terminal status before the next.
Parallel submissions only queue behind each other and make progress unreadable.

## 6. Determinism

- Fix a seed per asset and record it. A seed family is a base plus a fixed offset
  (`base + 1000*i`); write the formula in the manifest.
- Verify once, early: same prompt, same seed, twice, compare pixels. If they differ,
  confirm the seed slot took the write, then check whether prompt expansion is active
  (`30/16`), because expansion rewrites the text independently of the seed.
- Compare pixels, not bytes; encoder differences are noise.

## 7. Idempotence

Skip any row whose `out_path` exists and is non-empty. A resumed run must not redo
finished work and must not overwrite a verified asset.

## 8. Naming

`fetch_outputs` names files from the prompt id. Rename each selected file to the row's
`out_path` immediately, then delete the unselected temp render. Never leave
deliverables in a temp directory.

## 9. Batching inside one job

`30/5.batch_size` returns N files per job in `outputs_by_node`, in URL order, and
`fetch_outputs` writes N files numbered `<prompt_id>_<index>.png`. Give each candidate
its own manifest row and map files by index before renaming. Do not batch when
per-asset prompts differ.

## 10. Variants

`vary_workflow(path, slots, out_dir)` writes one JSON per variant. comfy-cli zips the
value lists, so every list must be the same length. Every variant inherits the
trigger and LoRA from the source file; confirm they survived before running the set.

## 11. Liveness and cancellation

Two calls, two payloads:

- `job(action="queue")` returns `status`, `updated_at`, `queue_position`,
  `error_code`, `workflow_path` for every known job.
- `job(action="status", prompt_id=...)` returns `status`, `outputs`,
  `outputs_by_node`, `text_outputs`, `error`. No `updated_at`.

Rules:

- `queue_position` above zero means queued behind another job. Wait; do not cancel.
- `running` with `updated_at` unchanged across two polls several minutes apart and a
  flat `get_logs` tail means hung. `job(action="cancel")`, `free_memory`, then retry
  once at lower resolution.
- Retry budget per asset: one hang recovery plus one pass of the retry ladder. Then
  mark `failed` and continue.
- Never poll in an unbounded loop.

## 12. Absence policy

Decide before starting what happens if the user stops responding. Any step needing
consent or manual action is a hard stop, not a retry: `install_node`, `confirm_spend`,
or starting ComfyUI when the server is down.

On a hard stop: persist the manifest, mark the row `blocked` with the reason, report
which asset blocked and why, stop. Do not work around consent.

## 13. Progress

Report `n/total` between assets. State the plan and expected count before asset 1.

## 14. Set consistency

One prompt scaffold per project: same medium, framing, lighting and style words, with
`sintpixel` first. Vary the subject only, one variable per run, seeds from one family.
Reusing the scaffold is what keeps a set looking related.

## 15. Verification tiers

- `full`: `read_image` the file. Required for the first two or three assets, every
  probe, and every hero or client-facing asset. Check silhouette, grid alignment,
  transparency and palette.
- `montage`: contact sheets of 8-12 cutouts on a checkerboard, read as one image.
  Catches style drift, dirty or opaque backgrounds, broken silhouettes. Does not catch
  fine detail.
- `none`: not inspected. Never ship an asset marked `none`.

Write the tier performed into the manifest. Do not promote a montage to `full`.

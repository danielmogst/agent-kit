# Godot 4 engineering rules

Contents: 1 project setup, 2 architecture, 3 saves and time, 4 tweens/particles/input, 5 pitfalls checklist, 6 headless tests and bot, 7 performance, 8 export, 9 running commands safely.

## 1. Project setup

- **Renderer:** use what the brief says (often GL Compatibility). Verify every effect you plan to use (glow, Light2D, shaders, particles) actually renders in that renderer with a screenshot test; otherwise use the fallback (additive glow sprites, `CPUParticles2D`).
- **Pixel settings:** base size from the brief, `stretch/mode = viewport`, `stretch/aspect = keep` (integer scaling if available), default texture filter nearest, 2D transform and vertex snapping on (`rendering/2d/snap/...`), sane window size, `resizable` set deliberately.
- Run `godot --headless --path . --import` after adding or changing assets, and before the first run or export, or resources and `class_name` scripts will be missing.
- Use typed GDScript (`var x: int`, return types) and treat untyped/unused warnings as errors where practical. Parse-check scripts with `godot --headless --path . --check-only --script <file>` or load every script in a test.
- Pin the engine: record the exact `godot --version` string in `DECISIONS.md` and in `README.md`.

## 2. Architecture

- Autoload names must not equal any `class_name`. Typical autoloads: `EventBus` (signals only), `ContentDB`, `GameState`, `SaveManager`, `AudioDirector`, plus any the brief requests.
- **Separate simulation from presentation.** `GameState` and systems are plain scripts with no node dependencies, so they are unit-testable and the bot can drive them. Scenes render and send input.
- Communicate via `EventBus` signals; avoid circular references and `get_node("../../..")` chains (use exported node references or groups).
- **Data-driven:** content and tuning in `data/*.json` or `.tres`, loaded into typed structures at boot with schema validation that fails loudly on missing keys. No magic numbers in scenes or logic; each lives in data or a constants file with a comment pointing to its `economy.md` row.
- Route all randomness through one injectable `RandomNumberGenerator` so tests and bug reports are reproducible.

## 3. Saves and time

- Save to `user://save.json` (or beside the exe if the brief requires and it is writable). Include `save_version` and migration functions. Write **atomically**: write a temp file, flush/close, then `DirAccess.rename_absolute`, keeping a `.bak`. Load tolerantly (ignore unknown keys, default missing keys) and test with fixture saves from older versions. Autosave on an interval, on quit (`NOTIFICATION_WM_CLOSE_REQUEST`) and on focus loss.
- **JSON gotchas:** `JSON.parse_string` returns numbers as `float` (cast ints on load), dictionary keys become strings, and integers above 2^53 lose precision. Serialize Vector2, Color and similar types explicitly.
- **Offline progress:** use `Time.get_unix_time_from_system()`, clamp negative deltas, apply the brief's cap, and show a skippable count-up screen.
- Clamp `delta` in simulation (for example max 0.1 s) and use accumulated timers for fixed-step logic. Set `process_mode` deliberately so pausing does not break timers or tweens.

## 4. Tweens, particles, input

- Kill the previous tween on a node before creating one for the same property, and check `is_valid()`; overlapping tweens fighting over `scale` are a classic bug. Use a small `Juice` helper with named effects (`pop`, `squash`, `wobble`, `shake`) so feel is consistent and capped in one place.
- Pool frequently spawned nodes (number pops, particles). Enforce global budgets for particles, tweens, shake and audio voices.
- Handle mouse and touch (and gamepad if the brief asks). Set `Control.mouse_filter` deliberately so overlays do not eat clicks. Every interactive node needs hover, pressed, disabled and focus states. Dragging needs pickup feedback, snap-back on invalid drop, and must stop on window focus loss.
- Never `await` a signal that may never fire without a timeout fallback.

## 5. Pitfalls checklist

Check these before assuming your code is wrong or the engine is broken.

- **New `class_name` not found in headless runs:** the script class cache refreshes on import or editor scan; run `godot --headless --path . --import` (or `--editor --quit`) after adding scripts.
- **Autoloads in `-s` scripts:** a script extending `SceneTree` cannot reference autoload names as globals at parse time. Fetch with `root.get_node("/root/GameState")`.
- **Run tests from `_initialize()`**, then call `quit(failures)`; the exit code is how automation sees failure.
- **`Engine.time_scale` and timers:** `get_tree().create_timer(t)` follows time scale. For accelerated sims, either lean on that or pass `ignore_time_scale = true` (fourth argument) deliberately.
- **`@onready` and `_ready` order:** children are ready before parents. Do not read a parent's state from a child's `_ready` unless it is set earlier.
- **Freed nodes:** after an `await`, the node may be gone; check `is_instance_valid(self)` or use `is_inside_tree()`. Use `call_deferred`/`queue_free` for removals during signal emission.
- **Duplicate signal connections:** guard with `is_connected` or connect once in `_ready`.
- **`:=` inference on Variant:** `var x := dict["k"]` fails or warns; give the type explicitly.
- **Labels:** autowrap needs a minimum width; set `clip_text` or `text_overrun_behavior` deliberately, and test with the longest strings.
- **`.uid` files and `.godot/`:** commit `.uid` files (4.4+), ignore `.godot/`.
- **Imports:** reimport after changing texture import settings; set `filter` to nearest for pixel art at import or project level.

## 6. Headless tests and bot

- **Runner:** `godot --headless --path . -s res://tests/run_all.gd`, a script extending `SceneTree` that runs each test, prints `PASS name` / `FAIL name`, and ends with `quit(failures)`.
- **Required tests:** data schema validation; economy sync; number formatter; save/load round trip and migration fixtures; each system's state machine; loot/trait/RNG distributions with a seeded RNG and statistical tolerance; cap enforcement (units, voices, particles, shake); offline clamp; the bot playthrough; "load every scene and instantiate it without errors".
- **Bot** (`tests/bot_playthrough.gd`): drives `GameState` through its public API at accelerated time, logs the same metrics as the simulator, and produces the event log used by the fun check.

## 7. Performance and stability

- Measure with `Performance.get_monitor` in a worst-case scenario (maximum population, all effects on): average FPS, 1%-low FPS (compute from recorded frame times, there is no built-in monitor), draw calls, node count, orphan node count, memory.
- **Soak test:** run accelerated for the equivalent of 30+ minutes and verify memory, node count and orphan node count stay flat (no leaks from tweens, particles, audio players or signal connections). Log under `qa/perf/`.
- Target a stable 60 FPS at the brief's worst case on the dev machine; record the machine and results honestly.

## 8. Export

- Export templates must match the exact engine version. Typical locations: Windows `%APPDATA%\Godot\export_templates\<version>\`, Linux `~/.local/share/godot/export_templates/<version>/`, macOS `~/Library/Application Support/Godot/export_templates/<version>/`. If missing and not installable offline, deliver the runnable project, write the exact steps to `BLOCKED.md`, and mark export `NOT VERIFIED`.
- Create `export_presets.cfg` for the desktop preset with `binary_format/embed_pck=true`, icon and product metadata. Setting the Windows icon and metadata needs `rcedit`; if it is not available, set `application/modify_resources=false` rather than letting export fail.
- Build: `godot --headless --path . --export-release "Windows Desktop" build/<Game>.exe` under a timeout (Windows exports work from Linux or macOS with templates installed).
- **Smoke-test the exe:** launch with a log file under a timeout and confirm it ran N seconds with no `ERROR` or `SCRIPT ERROR` lines, ideally with a `--smoke-test` flag handled in your game code that quits after about 20 s of simulated play. Where the exe cannot run on the dev OS (for example Windows build on Linux), run the same smoke test via the project (`godot --path .`) and mark the exe launch `NOT VERIFIED`.
- Test from a clean folder with no Godot on `PATH`, offline.

## 9. Running commands safely

- Write `tools/run_timeout.py` (standard library only) that starts a process, waits up to N seconds, kills the whole process tree on expiry (process group on POSIX, `taskkill /T /F` on Windows) and exits with code 124. Use it for every Godot invocation, export, script and Python run. `timeout` on Linux/macOS or a PowerShell equivalent on Windows is fine if Python is unavailable.
- Useful Godot flags: `--headless`, `--quit-after <frames>`, `--fixed-fps`, `--log-file <path>`, `--path`, `-s`, `--write-movie`. Always pass a quit mechanism so a scene cannot run forever.
- Locate Godot in this order: path in the brief, `GODOT` environment variable, `PATH`, common install folders; record the resolved path and `--version` in `DECISIONS.md`.
- Capture stdout/stderr under `qa/logs/` and grep for `ERROR`, `WARNING`, `SCRIPT ERROR`, `Parse Error`. Treat unexpected errors as defects.
- Python tools use the standard library plus modules already installed (check with an import test). Do not `pip install` or `npm install`. If Pillow or NumPy is missing, fall back to pure-Python or GDScript implementations and note it in `DECISIONS.md`.

---
name: update-graphify
description: Updates the Graphify knowledge graph (graphify-out/) for this codebase. Use when the user asks to "update graphify", "refresh the graph", "rebuild the knowledge graph", "regenerate the graph report", or after code/docs changes so graphify-out stays in sync. Covers staleness checks, incremental code-only updates, semantic re-extraction of docs/images, and report/clustering regeneration.
---

<role>
You are the repository's Graphify maintainer. You keep `graphify-out/` — the pre-built knowledge graph this repo's agents query before reading source files — in sync with the actual state of the codebase, correctly, incrementally, and without wasting API credits.
</role>

<context>

**What Graphify is:** a local-first knowledge graph tool (PyPI package `graphifyy`, CLI `graphify`). Code is parsed locally with tree-sitter (no LLM); docs, PDFs, and images get a semantic pass that requires an LLM backend (this repo uses DeepSeek).

**Where the graph lives:** `graphify-out/` at the repo root:
- `graph.json` — the graph itself (nodes, edges, communities)
- `GRAPH_REPORT.md` — god nodes, communities, suggested questions
- `graph.html` — interactive visual explorer
- `manifest.json` — incremental-extraction manifest (do not delete; it enables cheap updates)

**CLI availability (Windows):** installed via `uv tool install graphifyy`. The binary is at `%USERPROFILE%\.local\bin\graphify.exe`, which is often NOT on PATH. Bootstrap it first:
```powershell
$env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"
```
If `graphify` still isn't found, run `uv tool update-shell` or ask the user to run `uv tool install "graphifyy[sql,openai]"`.

**API key:** the semantic (docs/images) pass needs DeepSeek. Use the `DEEPSEEK_API_KEY` env var if the session already has it; otherwise ASK THE USER for the key and set it only as a session-scoped env var:
```powershell
$env:DEEPSEEK_API_KEY = "<key from user>"
```
Never write the key to any file, commit it, or echo it into a command that gets logged persistently.

**PowerShell 5.1:** use `;` as command separator, not `&&`. Run `graphify .`, not `/graphify .` (the leading slash is a path separator in PowerShell).
</context>

<process>

## Step 1: Check whether an update is actually needed

1. Read `git rev-parse HEAD` and compare to "Built from commit" in `graphify-out/GRAPH_REPORT.md`. If they match AND there are no uncommitted changes to indexed files, the graph is current — say so and stop.
2. Check what changed: `git status --short` and `git diff --name-only HEAD`. Classify the changed paths:
   - **Code** (`.ts .tsx .js .jsx .json .sql` and other source/config files) → code-only update (Step 2a)
   - **Docs/PDFs/images** (`.md .mdx .html .txt .pdf .png .jpg .webp` and other non-code files) → semantic update (Step 2b)
   - Both → do Step 2b (it covers code too)
3. If the graph is missing entirely (`graphify-out/graph.json` absent) → full initial render (Step 2c).

## Step 2: Run the update

### 2a. Code-only update (incremental, no LLM, free)
```powershell
$env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"
graphify update .
```
Re-extracts only changed code files and merges into the existing graph. No API key needed.

### 2b. Semantic update (docs/PDFs/images changed; incremental)
```powershell
$env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"
$env:DEEPSEEK_API_KEY = "<key from user, if not already set>"
graphify extract . --backend deepseek
```
Incremental by default (manifest gate + semantic cache) — unchanged files are skipped, so reruns are cheap.

### 2c. Full initial render (graph missing)
```powershell
$env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"
$env:DEEPSEEK_API_KEY = "<key from user, if not already set>"
graphify extract . --backend deepseek
graphify cluster-only .
```

## Step 3: Regenerate report, labels, and visualization

`update` and `extract` only write `graph.json`. Run clustering to regenerate `GRAPH_REPORT.md`, community labels, and `graph.html`:
```powershell
$env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"
$env:DEEPSEEK_API_KEY = "<key from user, if not already set>"
graphify cluster-only .
```
Expected output: "Done - N communities. GRAPH_REPORT.md, graph.json and graph.html updated."

## Step 4: Verify

1. Confirm the write line from extract/update: `wrote ...graph.json: N nodes, M edges` — N and M should grow or stay stable, not collapse.
2. Confirm all three outputs exist and are fresh: `graphify-out/graph.json`, `GRAPH_REPORT.md`, `graph.html` (check timestamps).
3. Smoke-test the graph is queryable:
   ```powershell
   graphify god-nodes --top 5
   graphify explain "useThemeStore"
   ```
   Both must return data (god-nodes lists hubs; explain shows import chains with `file:line` sources).

## Step 5: Report back

State concisely: what changed (code-only vs semantic), the new node/edge/community counts, whether a DeepSeek pass ran (and its reported token cost, if shown), and any warnings.
</process>

<constraints>

## Must Do
- Check staleness BEFORE running anything; if the graph already matches HEAD and nothing changed, report that and stop.
- Prefer `graphify update .` (free, local) whenever only code changed.
- Always follow update/extract with `graphify cluster-only .` so `GRAPH_REPORT.md` and `graph.html` stay in sync.
- Keep `DEEPSEEK_API_KEY` session-scoped; never store it in files, configs, or committed commands.
- If the user's request is simply "update graphify", do the minimal correct update — don't rebuild from scratch.

## Must Not Do
- Do NOT delete `graphify-out/` or its `manifest.json`/`cache/` to "start fresh" — it forces a full rebuild.
- Do NOT pass `--force` unless the node count legitimately regressed (e.g. after deleting code) and a normal update refuses to overwrite.
- Do NOT run `graphify hook install` (adds git hooks that auto-rebuild on commit) unless the user explicitly asks.
- Do NOT run a full `graphify extract .` when `graphify update .` suffices.
- Do NOT modify `graphify-out/*.json` by hand — always let the CLI write them.

## Failure handling
- `Connection error.` during semantic chunks: transient — simply re-run the same command (extraction is incremental and retry-safe). Two consecutive failures on the same chunk with different errors → report to the user with the error text.
- `requires the 'openai' package`: run `uv tool install "graphifyy[openai,sql]" --force`, then retry.
- `graphify: command not found`: add `%USERPROFILE%\.local\bin` to PATH (see Context), or run `uv tool update-shell`, then retry. If uv is missing entirely, ask the user before installing (`winget install astral-sh.uv`).
- If a semantic chunk produces zero nodes for files ("model returned a response but omitted them"), re-run once — the retry path re-dispatches them. Persistent failures → report to the user, don't silently ignore.
</constraints>

<examples>

## Example 1: User says "update graphify" with only code changes
1. `git rev-parse HEAD` ≠ "Built from commit" in GRAPH_REPORT.md → update needed.
2. `git diff --name-only HEAD` shows only `.tsx`/`.ts`/`.sql` files → code-only.
3. Run `graphify update .` → "wrote graph.json: 892 nodes, 2031 edges".
4. Run `graphify cluster-only .` → "Done - 92 communities. GRAPH_REPORT.md, graph.json and graph.html updated."
5. `graphify god-nodes --top 5` → returns hubs. Report: code-only update, new counts.

## Example 2: User says "update graphify" and a doc changed
1. `git diff --name-only HEAD` includes `task.md` → semantic pass required.
2. `$env:DEEPSEEK_API_KEY` not set in session → ask the user for it, then set it session-scoped.
3. Run `graphify extract . --backend deepseek` → AST pass on changed code files + semantic pass on the changed doc.
4. Run `graphify cluster-only .`.
5. Verify and report, including the reported token cost of the semantic pass.

## Example 3: User says "update graphify" on a fresh clone (no graphify-out/)
1. Graph missing → full render: `graphify extract . --backend deepseek` (with key), then `graphify cluster-only .`.
2. Verify `graphify-out/graph.json`, `GRAPH_REPORT.md`, `graph.html` all exist; smoke-test `graphify explain "useThemeStore"`.
3. Report the full-render node/edge counts.
</examples>

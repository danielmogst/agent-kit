---
description: How and when to use the Gemini vision tooling - gemini-vision tool, vision subagent, API key setup and limits, troubleshooting
applyTo: "*"
---

# Vision (Google Gemini) - operational usage

## What's available

- **`gemini-vision`** - one-shot OpenCode tool (`.opencode/tools/gemini-vision.ts`). Preferred for single image/PDF descriptions. Rotates 4 free Gemini API keys automatically.
- **`vision`** - OpenCode subagent (`.opencode/agents/vision.md`, model `google/gemini-3.6-flash`). For open-ended multimodal analysis. Costs more requests; use sparingly.
- Full research, rationale, and troubleshooting: `vision.md` at the repo root (installed by the agent-kit bootstrap).

## When to use

- Any time an image, screenshot, mockup, PDF, diagram, or photo must be seen -> use `gemini-vision` (one shot) or the `vision` subagent (multi-file).
- UI review work: describe layout regions, exact text, hex colors, spacing, alignment, component types, states, platform hints.
- Descriptions must assume the reader cannot see the image.

## Usage

```
gemini-vision { image: "path/to/screenshot.png" }
gemini-vision { image: "path/doc.pdf", prompt: "Summarize the figures", model: "gemini-3.5-flash" }
```

Optional args: `prompt`, `model` (default `gemini-3.6-flash`; options `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`).

## Keys and limits (hard facts)

- Keys: `GEMINI_API_KEY_1..4`, loaded from process env -> `.env` (worktree/session dir) -> `~/.config/opencode/gemini.env`.
- Free tier: ~5 RPM / ~20 RPD per key. Tool caps: 15 uses/key/day, 13 s between calls on same key. RPD resets at midnight Pacific.
- Rotation is automatic (round-robin + 429/403 failover). State file: `~/.local/share/opencode/gemini-vision-rotation.json`.
- The `vision` subagent's key comes from `~/.config/opencode/gemini-current-key`, republished by the tool after every call. If the subagent auth-errors, run one `gemini-vision` call first.
- Never commit API keys. Never use preview Gemini models for vision calls.

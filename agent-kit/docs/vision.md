# Vision (Google Gemini) — research, choices, limits, operations

> Auto-loaded context: the "Vision (Gemini)" section of `AGENTS.md` is injected into every session and points here.
> This file is the single source of truth for HOW vision works in this project and WHY the current models were chosen.

**Last researched:** 2026-08-12 (fresh fetch of Google AI docs + models.dev + Vercel AI SDK source).

---

## 1. What we have

- 4 FREE Google Gemini API keys in `.env` (lines 21–24): `GEMINI_API_KEY_1..4`.
- Comment in `.env` states: *free keys, ~5 requests/minute and ~20 requests/day each, must be rotated when one reaches its limit.*
- Infrastructure (opencode):
  - **Project custom tool** `gemini-vision` → `.opencode/tools/gemini-vision.ts`. Committed to the repo, auto-discovered in EVERY session of this project. Reads keys directly from `.env`, rotates automatically, enforces budget caps, retries with the next key on 429/403, and publishes the last-working key to `~/.config/opencode/gemini-current-key` (used by the subagent, see below).
  - **Project subagent** `vision` → `.opencode/agents/vision.md` (model `google/gemini-3.6-flash`). For open-ended multimodal analysis. Fully automatic: no env vars needed — the provider reads the key file the tool publishes (see §6).
  - **Project provider config** → `.opencode/opencode.json` (google provider, whitelisted stable models, `apiKey: {file:~/.config/opencode/gemini-current-key}`).

## 2. Model lineup (official, fetched 2026-08-12)

Source: https://ai.google.dev/gemini-api/docs/models (official models page) + https://models.dev (opencode's model registry).

| Model | Status | Vision input | Context / Output | Free tier |
|---|---|---|---|---|
| **gemini-3.6-flash** | Stable | text, image, video, audio, pdf | 1M / 65k | Free of charge (standard) |
| **gemini-3.5-flash** | Stable | text, image, video, audio, pdf | 1M / 65k | Free of charge (standard) |
| gemini-3.5-flash-lite | Stable | text, image, video, audio, pdf | 1M / 65k | Free of charge |
| gemini-3.1-flash-lite | Stable | text, image, video, audio, pdf | 1M / 65k | Free of charge |
| gemini-3.1-pro-preview | **Preview** | text, image, video, audio, pdf | 1M / 65k | Free (restricted) |
| gemini-3-flash-preview | **Preview** | text, image, video, audio, pdf | 1M / 65k | Free (restricted) |
| gemini-2.5-pro / flash / flash-lite | Stable (2.5 family) | multimodal | 1M / 65k | Free |

Pricing page (https://ai.google.dev/gemini-api/docs/pricing): Gemini 3.6 Flash and 3.5 Flash standard tier are "Free of charge" on the free tier ($1.50/$7.50 per 1M tokens on paid). Flash-Lite family is cheaper.

## 3. Choice + rationale

- **Default model: `gemini-3.6-flash`** — newest STABLE Gemini (3.6 > 3.5), free tier, full multimodal input (images + PDFs), 1M context, 65k output. Google markets it as the "latest model balancing speed with intelligence… strong performance in agentic and multimodal tasks."
- **Fallback: `gemini-3.5-flash`** — also stable and free; slightly different positioning ("most intelligent… for sustained frontier performance on agentic and coding tasks"). Use it if 3.6 quota is exhausted or its output disappoints.
- **Cheap/high-throughput: `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`** — stable, free, cheaper; fine for quick classification/short answers.
- **Explicitly AVOIDED: `gemini-3.1-pro-preview` and `gemini-3-flash-preview`** — preview models. Google's rate-limits doc states: *"Rate limits are more restricted for experimental and preview models."* With a ~20 RPD per-key budget, preview models are too risky even though Pro is the "smartest."
- Vision-capable but out of scope: Nano Banana / image-gen models, TTS/Live/audio models, Veo.

## 4. Rate limits (facts)

- Official docs (https://ai.google.dev/gemini-api/docs/rate-limits, updated 2026-07-21):
  - Limits measured as RPM (requests/min), TPM (tokens/min), RPD (requests/day); exceeding ANY of them → 429 `RESOURCE_EXHAUSTED`.
  - **Rate limits are applied per project, not per API key.**
  - **RPD resets at midnight Pacific time.**
  - Limits vary per model; exact current numbers are only visible in AI Studio (https://aistudio.google.com/rate-limit, requires auth).
  - Free tier has no spend-based rate limit; Tier 1+ do (rolling 10-min window).
- User-observed limits for these 4 keys (from `.env` comment): **~5 RPM and ~20 RPD per key** → combined ~20 RPM / ~80 RPD across 4 keys.
- **Tool-enforced safety caps** (conservative, under the observed limits):
  - Max **15** uses per key per calendar day (buffer under 20).
  - Min **13 s** between calls on the same key (≈4.6 RPM, under 5).
  - On HTTP 429/403 the tool marks that key exhausted for the day and retries with the next key automatically.

## 5. How to use vision in any session

1. **One-shot description (preferred):** call the `gemini-vision` tool:
   ```
   gemini-vision { image: "path/to/screenshot.png" }
   ```
   Optional args: `prompt` (custom question), `model` (default gemini-3.6-flash).
   The tool returns the description plus meta: model, key slot used, token usage, remaining uses today.
2. **Open-ended analysis:** delegate to the `vision` subagent (task or `@vision`). It can read multiple files and answer questions, but costs more requests — use sparingly.
3. **In the TUI:** dragging an image into the prompt only works if the active model has vision (DeepSeek does not) — use the tool instead.

## 6. Key management / rotation

- The tool loads keys in this order (first hit wins per slot):
  1. Process env `GEMINI_API_KEY_1..4`
  2. `git worktree/.env`
  3. `session directory/.env`
  4. `~/.config/opencode/gemini.env`
- Rotation is automatic (round-robin on daily counter + 429 failover). Rotation state file: `~/.local/share/opencode/gemini-vision-rotation.json` (auto-created; delete to force-reset counters, or edit `date` to roll over).
- **The `vision` subagent needs no setup:** after every successful call the tool writes the key it just used to `~/.config/opencode/gemini-current-key`, and `opencode.json` points the google provider at that file (`{file:...}`). First use on a fresh machine: run one `gemini-vision` call (or seed the file with any valid key) before delegating to the `vision` subagent.
- To add/replace keys: update `.env` lines 21–24 (or `~/.config/opencode/gemini.env`). Slot order = key 1 → key 4.

## 7. Troubleshooting

- **"All keys are exhausted for today"** → quota hit; wait until midnight Pacific or add fresh keys to `.env`.
- **HTTP 429 / 403 on all slots** → RPD/RPM limit reached or key revoked; verify in AI Studio.
- **`vision` subagent errors (missing key)** → `~/.config/opencode/gemini-current-key` missing or stale. Run one `gemini-vision` tool call to republish the key (the tool also republishes the key on every 429 rotation).
- **Weird descriptions** → try `prompt` override, or switch `model` to `gemini-3.5-flash`.

## 8. Sources

- Google models: https://ai.google.dev/gemini-api/docs/models (fetched 2026-08-12)
- Google pricing: https://ai.google.dev/gemini-api/docs/pricing (fetched 2026-08-12)
- Google rate limits: https://ai.google.dev/gemini-api/docs/rate-limits (fetched 2026-08-12, last updated 2026-07-21)
- models.dev registry (opencode's own source): https://models.dev/api.json (fetched 2026-08-12)
- Vercel AI SDK google provider: apiKey is a single string, NO built-in key rotation (verified in source 2026-08-12) — hence the custom tool.

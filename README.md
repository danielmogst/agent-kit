# agent-kit

A ready-to-go AI agent toolkit package — the full personal skill collection, 25 Autoprompt subagents, a free Gemini vision setup, and OpenCode integration — installable into any repository with [APM (Microsoft's Agent Package Manager)](https://github.com/microsoft/apm).

One folder. Drop it in, point APM at it, done.

## Skills (all of them)

| Skill | What it does |
|---|---|
| `autoprompt` | Explicit-only (`/autoprompt`) useful-first orchestration: mission → executable ROADMAP.md → dependency-safe lanes → independent verification. Ships frameworks, playbooks, gate specs, and launcher scripts. |
| `orchestrator` | Project-manager orchestration for large multi-step tasks: decompose, brief subagents, run parallel lanes, verify, summarize. |
| `design-taste-frontend` | Anti-slop frontend design for landing pages, portfolios, redesigns; audit-first. |
| `gpt-taste` | Elite UX/UI + GSAP motion engineering: AIDA structure, bento grids, scroll-triggered motion. |
| `high-end-visual-design` | Agency-grade fonts, spacing, shadows, card structures, animation rules. |
| `industrial-brutalist-ui` | Swiss-print × military-terminal interfaces for data-heavy dashboards/editorials. |
| `minimalist-ui` | Clean editorial style: warm monochrome, flat bento grids, muted pastels. |
| `improve-prompt` | Analyzes and rewrites prompts to be more effective without over-engineering. |
| `update-graphify` | Keeps the Graphify knowledge graph (`graphify-out/`) in sync with the codebase. |
| `vision` | When/how to use the Gemini vision tooling (pairs with the `gemini-vision` tool and `vision` subagent). |
| `browser-automation` | Headless-browser QA loop: console errors, failed requests, DOM assertions, screenshots (`browser.mjs`). |
| `game-development` | Build → launch → watch the game loop for any engine; error-to-workspace path mapping (`game.mjs`). |

Every skill folder lands at `.agents/skills/<name>/` (whole folder copied, scripts included).

## Agents, instructions, and payload

| Thing | Source in this package | Where it lands after install |
|---|---|---|
| Autoprompt personas (`ap-*`, 25 agents) | `.apm/agents/autoprompt/ap-*.agent.md` | `.opencode/agents/ap-*.md` |
| `vision` subagent | `.apm/agents/vision.agent.md` | `.opencode/agents/vision.md` |
| Vision usage instructions | `.apm/instructions/vision-usage.instructions.md` | compiled into `AGENTS.md` by `apm compile` |
| `gemini-vision` OpenCode tool | `payload/opencode/tools/gemini-vision.ts` | `.opencode/tools/gemini-vision.ts` (bootstrap) |
| `graphify` OpenCode plugin | `payload/opencode/plugins/graphify.js` | `.opencode/plugins/graphify.js` (bootstrap) |
| Gemini provider config | `payload/opencode/opencode.fragment.json` | merged into `.opencode/opencode.json` (bootstrap) |
| Vision research doc | `docs/vision.md` | `vision.md` at repo root (bootstrap) |

## Autoprompt activation (optional)

Autoprompt works best with its activation profile, which pins `subagent_depth=4`, disables sharing, and limits primary task launches to the `ap-*` cast. The profile ships at `.agents/skills/autoprompt/autoprompt.opencode.json`; copy it to `~/.config/opencode/autoprompt.opencode.json`, then launch with:

```powershell
$env:OPENCODE_CONFIG = "$HOME/.config/opencode/autoprompt.opencode.json"
opencode
```

Or use the bundled wrapper: `.agents/skills/autoprompt/workflow/launch-opencode.ps1` (Windows) / `launch-opencode.sh` (macOS/Linux). Requires OpenCode >= 1.18.7. Without the profile the `ap-*` agents still load, but stay inert for cross-agent dispatch.

APM handles the skills/agent/instructions primitives natively. The OpenCode-specific payload (custom tool, plugin, provider config) has no APM primitive, so the included `scripts/bootstrap.ps1` / `scripts/bootstrap.sh` deploys it — run once per repo (it's idempotent).

## Install — 3 ways

### A. From a git host (recommended)

```powershell
# in the target repo, pinned to a release
apm install your_github_user/agent-kit #v1.1.0 --target opencode

# or track the latest main
apm install your_github_user/agent-kit --target opencode
```

Then deploy the OpenCode payload and compile root context:

```powershell
# find the bootstrap wherever the package was materialized
$b = Get-ChildItem apm_modules -Recurse -Filter bootstrap.ps1 | Select-Object -First 1; & $b.FullName
apm compile --target opencode   # writes AGENTS.md with the vision-usage instructions
```

### B. From a local folder (the "simply put into a repository" case)

If you copied this folder next to / into your repo (e.g. `../agent-kit`):

```powershell
apm install ../agent-kit --target opencode
powershell -NoProfile -File ../agent-kit/scripts/bootstrap.ps1
```

### C. Standalone bootstrap (no APM)

Just run the bootstrap directly — it copies everything APM would have deployed:

```powershell
powershell -NoProfile -File agent-kit/scripts/bootstrap.ps1   # Windows (5.1; pwsh also works)
bash agent-kit/scripts/bootstrap.sh                            # macOS / Linux
```

### Optional: auto-run bootstrap on every install

Paste into the target repo's `apm.yml` and trust it once (`apm lifecycle trust`):

```yaml
lifecycle:
  post-install:
    - type: command
      command: 'powershell -NoProfile -Command "$b = Get-ChildItem apm_modules -Recurse -Filter bootstrap.ps1 | Select-Object -First 1; if ($b) { & $b.FullName }"'
      timeoutSec: 60
```

(APM materializes local-path deps under `apm_modules/_local/` and git deps under `apm_modules/<package-name>/`; the command above finds either.)

## Set up your Gemini keys

The vision tool reads `GEMINI_API_KEY_1..4` from (in order): process env → `.env` in the worktree/session directory → `~/.config/opencode/gemini.env`. Free Google AI Studio keys, ~5 RPM / ~20 RPD each; rotation and daily caps are handled automatically. Never commit keys.

First use on a machine: run one `gemini-vision` call — it publishes the working key to `~/.config/opencode/gemini-current-key`, which the `vision` subagent's provider config reads.

## Notes

- OpenCode-only by design: `targets: [opencode]` in `apm.yml` restricts this package to OpenCode deployment, and APM skips it for other harnesses (e.g. `--target copilot` installs nothing). The skills use the cross-tool `SKILL.md` format and land in `.agents/skills/`, but the 25 `ap-*` agents, the `gemini-vision` tool, and the graphify payload are OpenCode-specific.
- Update flow: `apm update` refreshes primitives; re-run the bootstrap after updates to sync the payload.
- `apm pack` bundles include `.apm/`, `payload/`, `scripts/`, and `docs/` (see `includes:` in `apm.yml`).
- Keep `scripts/bootstrap.ps1` ASCII-only: PowerShell 5.1 misparses BOM-less UTF-8 scripts.

# agent-kit

A ready-to-go AI agent toolkit package — skills, a free Gemini vision setup, and OpenCode integration — installable into any repository with [APM (Microsoft's Agent Package Manager)](https://github.com/microsoft/apm).

One folder. Drop it in, point APM at it, done.

## What's inside

| Thing | Source in this package | Where it lands after install |
|---|---|---|
| `improve-prompt` skill | `.apm/skills/improve-prompt/SKILL.md` | `.agents/skills/improve-prompt/` |
| `update-graphify` skill | `.apm/skills/update-graphify/SKILL.md` | `.agents/skills/update-graphify/` |
| `vision` skill (when/how to use vision) | `.apm/skills/vision/SKILL.md` | `.agents/skills/vision/` |
| Vision usage instructions | `.apm/instructions/vision-usage.instructions.md` | compiled into `AGENTS.md` by `apm compile` |
| `vision` subagent | `.apm/agents/vision.agent.md` | `.opencode/agents/vision.md` |
| `gemini-vision` OpenCode tool | `payload/opencode/tools/gemini-vision.ts` | `.opencode/tools/gemini-vision.ts` (bootstrap) |
| `graphify` OpenCode plugin | `payload/opencode/plugins/graphify.js` | `.opencode/plugins/graphify.js` (bootstrap) |
| Gemini provider config | `payload/opencode/opencode.fragment.json` | merged into `.opencode/opencode.json` (bootstrap) |
| Vision research doc | `docs/vision.md` | `vision.md` at repo root (bootstrap) |

APM handles the skills/agent/instructions primitives natively. The OpenCode-specific payload (custom tool, plugin, provider config) has no APM primitive, so the included `scripts/bootstrap.ps1` / `scripts/bootstrap.sh` deploys it — run once per repo (it's idempotent).

## Install — 3 ways

### A. From a git host (recommended once this folder is its own repo)

```powershell
# in the target repo
apm install your-org/agent-kit --target opencode
# or add to apm.yml and pin a tag:
apm install your-org/agent-kit#v1.0.0 --target opencode
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

- `targets: [opencode]` in `apm.yml` restricts this package to OpenCode deployment. Skills still land in the shared `.agents/skills/` directory.
- `apm_modules/` is build output — gitignore it (APM adds this automatically).
- Update flow: `apm update` refreshes primitives; re-run the bootstrap after updates to sync the payload.
- `apm pack` bundles include `.apm/`, `payload/`, `scripts/`, and `docs/` (see `includes:` in `apm.yml`).
- Keep `scripts/bootstrap.ps1` ASCII-only: PowerShell 5.1 misparses BOM-less UTF-8 scripts.

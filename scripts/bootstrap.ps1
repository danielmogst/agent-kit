# agent-kit bootstrap (Windows / PowerShell 5.1+)
# Deploys the OpenCode-specific payload (tools, plugins, provider config)
# from this package into the consuming repository's .opencode/ directory.
#
# Usage (run from the target repo root):
#   powershell -NoProfile -File agent-kit/scripts/bootstrap.ps1
#   powershell -NoProfile -File apm_modules/agent-kit/scripts/bootstrap.ps1
#   ./agent-kit/scripts/bootstrap.ps1          # if the folder was copied in
#
# Idempotent: safe to re-run after apm install/update.
# NOTE: keep this file ASCII-only. PowerShell 5.1 misparses BOM-less UTF-8 scripts.

$ErrorActionPreference = "Stop"

$PkgRoot = Split-Path -Parent $PSScriptRoot
$RepoRoot = (Get-Location).Path

$Payload = Join-Path $PkgRoot "payload/opencode"
if (-not (Test-Path -LiteralPath $Payload)) {
    Write-Host "[agent-kit] payload not found at $Payload - is the package intact?" -ForegroundColor Red
    exit 1
}

$Target = Join-Path $RepoRoot ".opencode"

function Copy-IfChanged {
    param([string]$Src, [string]$Dst)
    if (-not (Test-Path -LiteralPath $Src)) {
        Write-Host "[agent-kit] WARN: missing $Src" -ForegroundColor Yellow
        return
    }
    $Dir = Split-Path -Parent $Dst
    if (-not (Test-Path -LiteralPath $Dir)) { New-Item -ItemType Directory -Path $Dir -Force | Out-Null }
    if ((Test-Path -LiteralPath $Dst) -and ((Get-FileHash -LiteralPath $Src).Hash -eq (Get-FileHash -LiteralPath $Dst).Hash)) {
        Write-Host "[agent-kit] up to date: $Dst"
    } else {
        Copy-Item -LiteralPath $Src -Destination $Dst -Force
        Write-Host "[agent-kit] deployed: $Dst"
    }
}

# 1. Tools, plugins, package.json
Copy-IfChanged (Join-Path $Payload "tools/gemini-vision.ts") (Join-Path $Target "tools/gemini-vision.ts")
Copy-IfChanged (Join-Path $Payload "plugins/graphify.js") (Join-Path $Target "plugins/graphify.js")
Copy-IfChanged (Join-Path $Payload "package.json") (Join-Path $Target "package.json")

# 2. vision.md reference doc at repo root
Copy-IfChanged (Join-Path $PkgRoot "docs/vision.md") (Join-Path $RepoRoot "vision.md")

# 3. Vision agent (guarantees OpenCode-native frontmatter, even if an APM
#    transformer strips it from the .apm/agents/ primitive)
Copy-IfChanged (Join-Path $PkgRoot ".apm/agents/vision.agent.md") (Join-Path $Target "agents/vision.md")

# 4. Merge provider/plugin config into .opencode/opencode.json (non-destructive)
$ConfigPath = Join-Path $Target "opencode.json"
$Fragment = Get-Content -LiteralPath (Join-Path $Payload "opencode.fragment.json") -Raw | ConvertFrom-Json

$Config = $null
if (Test-Path -LiteralPath $ConfigPath) {
    $Config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
} else {
    $Config = New-Object PSObject
}

$Changed = $false

# plugin: union of arrays, dedupe, keep order
$Plugins = @()
if ($Config.PSObject.Properties.Name -contains "plugin") { $Plugins += @($Config.plugin) }
$Plugins += @($Fragment.plugin)
$Plugins = @($Plugins | Select-Object -Unique)
if (-not ($Config.PSObject.Properties.Name -contains "plugin") -or (@($Config.plugin).Count -ne $Plugins.Count)) {
    $Config | Add-Member -MemberType NoteProperty -Name "plugin" -Value $Plugins -Force
    $Changed = $true
}

# provider.google: only add if the consumer hasn't defined it
if (-not ($Config.PSObject.Properties.Name -contains "provider")) {
    $Config | Add-Member -MemberType NoteProperty -Name "provider" -Value $Fragment.provider -Force
    $Changed = $true
} elseif (-not ($Config.provider.PSObject.Properties.Name -contains "google")) {
    $Config.provider | Add-Member -MemberType NoteProperty -Name "google" -Value $Fragment.provider.google -Force
    $Changed = $true
} else {
    Write-Host "[agent-kit] provider.google already configured - left untouched"
}

if ($Changed) {
    $Json = $Config | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($ConfigPath, $Json, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "[agent-kit] merged opencode.json: plugin + google provider"
} else {
    Write-Host "[agent-kit] opencode.json already merged"
}

Write-Host ""
Write-Host "[agent-kit] Bootstrap complete."
Write-Host "  - Set GEMINI_API_KEY_1..4 in .env (or ~/.config/opencode/gemini.env) if not already present."
Write-Host "  - One gemini-vision call seeds ~/.config/opencode/gemini-current-key for the vision subagent."
Write-Host "  - Run 'npm install' inside .opencode/ if the @opencode-ai/plugin import is unresolved."

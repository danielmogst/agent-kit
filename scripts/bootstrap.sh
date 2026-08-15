#!/usr/bin/env bash
# agent-kit bootstrap (Linux / macOS)
# Deploys the OpenCode-specific payload (tools, plugins, provider config)
# from this package into the consuming repository's .opencode/ directory.
#
# Usage (run from the target repo root):
#   bash agent-kit/scripts/bootstrap.sh
#   bash apm_modules/agent-kit/scripts/bootstrap.sh
#
# Idempotent: safe to re-run after apm install/update.

set -euo pipefail

PKG_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(pwd)"
PAYLOAD="$PKG_ROOT/payload/opencode"
TARGET="$REPO_ROOT/.opencode"

if [[ ! -d "$PAYLOAD" ]]; then
  echo "[agent-kit] payload not found at $PAYLOAD — is the package intact?" >&2
  exit 1
fi

copy_if_changed() {
  local src="$1" dst="$2"
  [[ -f "$src" ]] || { echo "[agent-kit] WARN: missing $src" >&2; return; }
  mkdir -p "$(dirname "$dst")"
  if [[ -f "$dst" ]] && cmp -s "$src" "$dst"; then
    echo "[agent-kit] up to date: $dst"
  else
    cp -f "$src" "$dst"
    echo "[agent-kit] deployed: $dst"
  fi
}

# 1. Tools, plugins, package.json
copy_if_changed "$PAYLOAD/tools/gemini-vision.ts" "$TARGET/tools/gemini-vision.ts"
copy_if_changed "$PAYLOAD/plugins/graphify.js" "$TARGET/plugins/graphify.js"
copy_if_changed "$PAYLOAD/package.json"        "$TARGET/package.json"

# 2. vision.md reference doc at repo root
copy_if_changed "$PKG_ROOT/docs/vision.md" "$REPO_ROOT/vision.md"

# 3. Vision agent (guarantees OpenCode-native frontmatter, even if an APM
#    transformer strips it from the .apm/agents/ primitive)
copy_if_changed "$PKG_ROOT/.apm/agents/vision.agent.md" "$TARGET/agents/vision.md"

# 4. Merge provider/plugin config into .opencode/opencode.json (non-destructive)
CONFIG_PATH="$TARGET/opencode.json"
FRAGMENT="$PAYLOAD/opencode.fragment.json"

node - "$CONFIG_PATH" "$FRAGMENT" <<'NODE'
const fs = require("fs");
const [configPath, fragmentPath] = process.argv.slice(2);

const fragment = JSON.parse(fs.readFileSync(fragmentPath, "utf8"));
let config = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, "utf8"))
  : {};

let changed = false;

const plugins = Array.isArray(config.plugin) ? [...config.plugin] : [];
for (const p of fragment.plugin || []) {
  if (!plugins.includes(p)) {
    plugins.push(p);
    changed = true;
  }
}
if (plugins.length && JSON.stringify(config.plugin || []) !== JSON.stringify(plugins)) {
  config.plugin = plugins;
  changed = true;
}

if (!config.provider) {
  config.provider = fragment.provider;
  changed = true;
} else if (!config.provider.google) {
  config.provider.google = fragment.provider.google;
  changed = true;
} else {
  console.log("[agent-kit] provider.google already configured — left untouched");
}

if (changed) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  console.log("[agent-kit] merged opencode.json: plugin + google provider");
} else {
  console.log("[agent-kit] opencode.json already merged");
}
NODE

echo ""
echo "[agent-kit] Bootstrap complete."
echo "  - Set GEMINI_API_KEY_1..4 in .env (or ~/.config/opencode/gemini.env) if not already present."
echo "  - One gemini-vision call seeds ~/.config/opencode/gemini-current-key for the vision subagent."
echo "  - Run 'npm install' inside .opencode/ if the @opencode-ai/plugin import is unresolved."

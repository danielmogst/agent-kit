import { tool } from "@opencode-ai/plugin"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { extname, join, resolve } from "node:path"

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
const MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]
const MAX_PER_KEY_PER_DAY = 15
const MIN_INTERVAL_MS = 13000
const STATE_FILE = join(homedir(), ".local", "share", "opencode", "gemini-vision-rotation.json")
const ACTIVE_KEY_FILE = join(homedir(), ".config", "opencode", "gemini-current-key")

const DEFAULT_PROMPT = `Analyze this image and produce an exhaustive written description. Assume the reader cannot see the image.
Cover, in this order:
1. Overall layout: orientation, aspect, number of distinct regions/panels, and how they are arranged (grid, stacked, columns).
2. For EVERY region: bounding position (top/left/bottom/right or percentage), background color (exact hex if determinable), and its role.
3. All visible text: exact string, position, approximate font size, weight, casing, and color.
4. Visual elements: shapes, icons, images, buttons, inputs, borders, shadows, dividers, scrollbars, overlays, cursors.
5. Colors: dominant palette with hex values, accents, gradients.
6. Spacing: paddings, margins, gaps between elements, alignment (left/center/right), z-order / stacking.
7. Component types: buttons, text fields, dropdowns, tabs, cards, lists, nav bars, toolbars, modals, toasts.
8. States: which elements look focused/hovered/disabled/selected/loading, any error states, empty states.
9. Platform hints: font rendering style, window chrome, scrollbars, mobile/tablet/desktop form factor, likely OS/framework.
10. Anything unusual, broken, overlapping, or worth flagging for a UI review.
Be precise and quantitative wherever possible. Use structured markdown with section headings.`

function loadKeys(context: { directory?: string; worktree?: string }): string[] {
  const keys: string[] = []
  for (let i = 1; i <= 4; i++) {
    const fromEnv = process.env[`GEMINI_API_KEY_${i}`]
    if (fromEnv) keys[i - 1] = fromEnv
  }
  const envFiles = [
    context.worktree ? join(context.worktree, ".env") : null,
    context.directory ? join(context.directory, ".env") : null,
    join(homedir(), ".config", "opencode", "gemini.env"),
  ].filter((p): p is string => !!p && existsSync(p))
  for (const file of envFiles) {
    const text = readFileSync(file, "utf8")
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*(GEMINI_API_KEY_[1-4])\s*=\s*["']?([^"'#\s]+)["']?/)
      if (m) {
        const idx = Number(m[1].slice(-1)) - 1
        if (!keys[idx]) keys[idx] = m[2]
      }
    }
  }
  return keys
}

interface RotationState {
  date: string
  count: number[]
  lastUsed: number[]
  exhausted: string[]
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function loadState(): RotationState {
  const blank: RotationState = { date: today(), count: [0, 0, 0, 0], lastUsed: [0, 0, 0, 0], exhausted: [] }
  try {
    if (existsSync(STATE_FILE)) {
      const s = JSON.parse(readFileSync(STATE_FILE, "utf8"))
      if (s.date !== blank.date) return blank
      return { ...blank, ...s }
    }
  } catch {}
  return blank
}

function saveState(state: RotationState) {
  try {
    mkdirSync(join(homedir(), ".local", "share", "opencode"), { recursive: true })
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
  } catch {}
}

function publishActiveKey(key: string) {
  try {
    mkdirSync(join(homedir(), ".config", "opencode"), { recursive: true })
    writeFileSync(ACTIVE_KEY_FILE, key)
  } catch {}
}

function pickKey(state: RotationState, keys: string[]): number | null {
  const now = Date.now()
  let best = -1
  let bestScore = Infinity
  for (let i = 0; i < keys.length; i++) {
    if (!keys[i] || state.exhausted.includes(`key${i + 1}`) || state.count[i] >= MAX_PER_KEY_PER_DAY) continue
    const idle = now - state.lastUsed[i]
    const busy = idle < MIN_INTERVAL_MS
    const score = state.count[i] * 100000 + (busy ? 1 : 0) * 1000 + i
    if (score < bestScore) {
      bestScore = score
      best = i
    }
  }
  return best >= 0 ? best : null
}

function mimeType(path: string): string {
  const ext = extname(path).toLowerCase()
  if (ext === ".png") return "image/png"
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg"
  if (ext === ".webp") return "image/webp"
  if (ext === ".gif") return "image/gif"
  if (ext === ".pdf") return "application/pdf"
  return "image/png"
}

async function callGemini(key: string, model: string, mime: string, data: string, prompt: string): Promise<{ text: string; status: number; usage: unknown }> {
  const body = {
    contents: [{ parts: [{ inlineData: { mimeType: mime, data } }, { text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
  }
  const res = await fetch(ENDPOINT.replace("{model}", model), {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => ({}))) as any
  if (!res.ok) {
    return { text: `HTTP ${res.status}: ${json?.error?.message ?? "unknown error"}`, status: res.status, usage: null }
  }
  const text = (json?.candidates?.[0]?.content?.parts ?? [])
    .filter((p: any) => typeof p.text === "string")
    .map((p: any) => p.text)
    .join("\n")
    .trim()
  return { text, status: res.status, usage: json?.usageMetadata ?? null }
}

export default tool({
  description:
    "Describe an image, screenshot, or PDF in exhaustive textual detail using Google Gemini vision (free API keys with automatic rotation). Use whenever visual input is needed: UI screenshots, mockups, diagrams, photos. Handles the 4 rotating free Gemini keys and their ~5 RPM / ~20 RPD limits automatically.",
  args: {
    image: tool.schema.string().describe("Path to the image file (png, jpg, webp, gif) or PDF. Relative paths resolve against the session directory."),
    prompt: tool.schema.string().optional().describe("Optional custom question/prompt. Defaults to an exhaustive structured description."),
    model: tool.schema
      .string()
      .optional()
      .describe("Gemini model to use. Defaults to gemini-3.6-flash (newest stable). Options: gemini-3.6-flash, gemini-3.5-flash, gemini-3.5-flash-lite, gemini-3.1-flash-lite."),
  },
  async execute(args, context) {
    const keys = loadKeys(context)
    if (keys.every((k) => !k)) {
      return "No Gemini API keys found. Expected GEMINI_API_KEY_1..4 in a .env file (project root or current directory), in the process environment, or in ~/.config/opencode/gemini.env"
    }
    const imagePath = resolve(context.directory ?? process.cwd(), args.image)
    if (!existsSync(imagePath)) return `Image not found: ${imagePath}`
    const model = MODELS.includes(args.model ?? "") ? args.model! : "gemini-3.6-flash"
    const mime = mimeType(imagePath)
    const data = Buffer.from(readFileSync(imagePath)).toString("base64")
    const prompt = args.prompt || DEFAULT_PROMPT

    const state = loadState()
    const results: string[] = []
    let lastError = ""
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const idx = pickKey(state, keys)
      if (idx === null) {
        results.push("All keys are exhausted for today (RPD cap reached) or cooling down. Try again after midnight Pacific or add fresh keys.")
        break
      }
      const slot = `key${idx + 1}`
      state.lastUsed[idx] = Date.now()
      const r = await callGemini(keys[idx], model, mime, data, prompt)
      if (r.status >= 200 && r.status < 300 && r.text && !r.text.startsWith("HTTP")) {
        state.count[idx] += 1
        saveState(state)
        publishActiveKey(keys[idx])
        const usage = typeof r.usage === "object" && r.usage
          ? `in:${(r.usage as any).promptTokenCount ?? "?"} out:${(r.usage as any).candidatesTokenCount ?? "?"}`
          : ""
        return `${r.text}\n\n---\nmodel: ${model} | key slot: ${slot} | ${usage} | uses today: ${state.count[idx]}/${MAX_PER_KEY_PER_DAY}`
      }
      lastError = r.text
      if (r.status === 429 || r.status === 403) {
        state.exhausted.push(slot)
        results.push(`slot ${slot} rejected (HTTP ${r.status}) — rotated to next key.`)
        continue
      }
      break
    }
    saveState(state)
    return `${results.join("\n")}\nLast error: ${lastError}`
  },
})

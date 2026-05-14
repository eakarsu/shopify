/**
 * Centralized OpenRouter AI client with:
 *   - Default + fallback model (auto-swap on 429/5xx)
 *   - Exponential-backoff retry
 *   - In-memory prompt cache (15 min TTL)
 *   - Lightweight call telemetry (request/error/cache counters)
 *   - JSON parsing helper that uses parseAIJson (3-strategy)
 *
 * Use this everywhere instead of calling fetch() directly so we get
 * consistent resilience and cost telemetry across all AI features.
 */

import { parseAIJson } from "./parse-ai-json"

const OPENROUTER_BASE = "https://openrouter.ai/api/v1"
export const DEFAULT_MODEL =
  process.env.OPENROUTER_DEFAULT_MODEL ||
  process.env.OPENROUTER_MODEL ||
  "anthropic/claude-3-5-sonnet-20241022"
export const FALLBACK_MODEL =
  process.env.OPENROUTER_FALLBACK_MODEL || "anthropic/claude-3-haiku"

const CACHE_TTL_MS = parseInt(process.env.AI_CACHE_TTL_MS || String(15 * 60 * 1000), 10)
const cache = new Map<string, { value: string; expiresAt: number }>()

const stats = { requests: 0, errors: 0, cacheHits: 0 }

export function getAIStats() {
  return { ...stats, cacheSize: cache.size }
}

function cacheKey(model: string, system: string, user: string, temperature: number) {
  return `${model}::${temperature}::${system.length}:${user.length}::${user.slice(0, 80)}`
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

export interface CallAIOptions {
  model?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: { type: "json_object" } | undefined
  useCache?: boolean
  maxRetries?: number
  timeoutMs?: number
}

export async function callAI(prompt: string, opts: CallAIOptions = {}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured")
  }

  const model = opts.model || DEFAULT_MODEL
  const systemPrompt = opts.systemPrompt || "You are a helpful assistant."
  const temperature = opts.temperature ?? 0.7
  const maxTokens = opts.maxTokens || 1200
  const useCache = opts.useCache !== false
  const maxRetries = opts.maxRetries ?? 2
  const timeoutMs = opts.timeoutMs ?? 30000

  const ck = cacheKey(model, systemPrompt, prompt, temperature)
  if (useCache) {
    const hit = cache.get(ck)
    if (hit && hit.expiresAt > Date.now()) {
      stats.cacheHits++
      return hit.value
    }
    if (hit) cache.delete(ck)
  }

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    temperature,
    max_tokens: maxTokens
  }
  if (opts.responseFormat) body.response_format = opts.responseFormat

  let currentModel = model
  let lastErr: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      stats.requests++
      const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
          "X-Title": "ShopifyClone"
        },
        body: JSON.stringify({ ...body, model: currentModel })
      })
      clearTimeout(timer)
      if (!res.ok) {
        const errText = await res.text().catch(() => "")
        const status = res.status
        if ((status === 429 || (status >= 500 && status < 600)) && attempt < maxRetries) {
          stats.errors++
          const delay = Math.min(2000 * Math.pow(2, attempt), 10000)
          console.warn(`[ai-client] ${status} on ${currentModel}, retry in ${delay}ms`)
          await sleep(delay)
          if (currentModel !== FALLBACK_MODEL) currentModel = FALLBACK_MODEL
          continue
        }
        throw new Error(`OpenRouter error ${status}: ${errText}`)
      }
      const json = await res.json()
      const content = json.choices?.[0]?.message?.content || ""
      if (useCache) cache.set(ck, { value: content, expiresAt: Date.now() + CACHE_TTL_MS })
      return content
    } catch (e: any) {
      clearTimeout(timer)
      lastErr = e
      stats.errors++
      if ((e?.name === "AbortError" || e?.code === "ECONNRESET") && attempt < maxRetries) {
        const delay = Math.min(2000 * Math.pow(2, attempt), 10000)
        await sleep(delay)
        continue
      }
      throw e
    }
  }
  throw lastErr || new Error("AI call failed")
}

export async function callAIJson<T = any>(prompt: string, opts: CallAIOptions = {}): Promise<{ raw: string; parsed: T | null }> {
  const raw = await callAI(prompt, { ...opts, responseFormat: opts.responseFormat || { type: "json_object" } })
  const parsed = parseAIJson<T>(raw, null)
  if (parsed === null) console.warn("[ai-client] parseAIJson returned null, raw len=", raw.length)
  return { raw, parsed }
}

/**
 * parseAIJson — 3-strategy resilient JSON parser for LLM outputs.
 *
 * Strategy 1: Direct JSON.parse on the raw response.
 * Strategy 2: Extract JSON from a fenced code block (```json ... ``` or ``` ... ```).
 * Strategy 3: Locate the first balanced { ... } or [ ... ] block in the text and parse.
 *
 * Returns the parsed value, or `fallback` (default null) if all strategies fail.
 */

function tryParse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

function extractFromCodeFence<T = unknown>(text: string): T | null {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (!m) return null
  return tryParse<T>(m[1])
}

function extractBalancedBlock<T = unknown>(text: string): T | null {
  for (const opener of ["{", "["] as const) {
    const closer = opener === "{" ? "}" : "]"
    const start = text.indexOf(opener)
    if (start === -1) continue
    let depth = 0
    let inString = false
    let escape = false
    for (let i = start; i < text.length; i++) {
      const ch = text[i]
      if (escape) { escape = false; continue }
      if (ch === "\\") { escape = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue
      if (ch === opener) depth++
      else if (ch === closer) {
        depth--
        if (depth === 0) {
          const candidate = text.slice(start, i + 1)
          const parsed = tryParse<T>(candidate)
          if (parsed !== null) return parsed
          break
        }
      }
    }
  }
  return null
}

export function parseAIJson<T = unknown>(rawText: string | null | undefined, fallback: T | null = null): T | null {
  if (rawText == null) return fallback
  const text = String(rawText)

  const direct = tryParse<T>(text)
  if (direct !== null) return direct

  const fenced = extractFromCodeFence<T>(text)
  if (fenced !== null) return fenced

  const block = extractBalancedBlock<T>(text)
  if (block !== null) return block

  return fallback
}

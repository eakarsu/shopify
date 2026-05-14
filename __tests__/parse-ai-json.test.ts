import { parseAIJson } from "../src/lib/parse-ai-json"

describe("parseAIJson — 3-strategy parser", () => {
  test("strategy 1: direct JSON parse", () => {
    expect(parseAIJson('{"a":1}')).toEqual({ a: 1 })
  })

  test("strategy 2: ```json fenced block", () => {
    const out = parseAIJson('Here:\n```json\n{"x":2}\n```')
    expect(out).toEqual({ x: 2 })
  })

  test("strategy 2: generic ``` fenced block", () => {
    const out = parseAIJson("```\n[1,2,3]\n```")
    expect(out).toEqual([1, 2, 3])
  })

  test("strategy 3: balanced { } block extraction", () => {
    const out = parseAIJson("Reasoning... result: { \"ok\": true } end.")
    expect(out).toEqual({ ok: true })
  })

  test("returns fallback when no JSON", () => {
    expect(parseAIJson("nothing", { default: 1 } as any)).toEqual({ default: 1 })
  })

  test("returns null on null input", () => {
    expect(parseAIJson(null)).toBeNull()
  })
})

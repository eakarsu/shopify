import { checkAIRateLimit } from "../src/lib/ai-rate-limit"

describe("checkAIRateLimit — 20/hr per user default", () => {
  test("allows requests under the limit", () => {
    for (let i = 0; i < 5; i++) {
      const r = checkAIRateLimit({ userId: "u-under", limit: 5 })
      expect(r.allowed).toBe(true)
    }
  })

  test("blocks the next request after limit reached", () => {
    for (let i = 0; i < 3; i++) checkAIRateLimit({ userId: "u-cap", limit: 3 })
    const r = checkAIRateLimit({ userId: "u-cap", limit: 3 })
    expect(r.allowed).toBe(false)
    expect(r.retryAfterSeconds).toBeGreaterThan(0)
  })

  test("separate user buckets", () => {
    checkAIRateLimit({ userId: "alice", limit: 1 })
    const bob = checkAIRateLimit({ userId: "bob", limit: 1 })
    expect(bob.allowed).toBe(true)
  })
})

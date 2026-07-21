import { OrderDomainError } from "@/lib/order/domain"
import { retrySafeJson } from "@/lib/order/providers"

describe("retry-safe provider transport", () => {
  it("retries transient responses with the same idempotency key and body", async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "quote" }), { status: 200 }))

    await expect(retrySafeJson<{ id: string }>(
      "/v1/quotes",
      { z: 1, a: 2 },
      "checkout-1",
      { baseUrl: "https://provider.example", apiKey: "test-key", fetchImpl },
      2,
    )).resolves.toEqual({ id: "quote" })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    for (const [, init] of fetchImpl.mock.calls) {
      expect((init.headers as Record<string, string>)["idempotency-key"]).toBe("checkout-1")
      expect(init.body).toBe('{"a":2,"z":1}')
    }
  })

  it("does not retry a permanent provider rejection", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response("bad request", { status: 400 }))
    await expect(retrySafeJson(
      "/v1/quotes",
      {},
      "checkout-2",
      { baseUrl: "https://provider.example", apiKey: "test-key", fetchImpl },
    )).rejects.toMatchObject({ code: "PROVIDER_REQUEST_FAILED", status: 502 })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it("bounds network retries", async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error("offline"))
    await expect(retrySafeJson(
      "/v1/quotes",
      {},
      "checkout-3",
      { baseUrl: "https://provider.example", apiKey: "test-key", fetchImpl },
      2,
    )).rejects.toThrow("offline")
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})

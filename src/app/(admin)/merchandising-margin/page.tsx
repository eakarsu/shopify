"use client";

import { useState } from "react";

const sample = JSON.stringify([
  { title: "Linen shirt", price: 68, cost: 29, discountPct: 15, inventoryDays: 44 },
  { title: "Canvas tote", price: 32, cost: 12, discountPct: 5, inventoryDays: 12 }
], null, 2);

export default function MerchandisingMarginPage() {
  const [payload, setPayload] = useState(sample);
  const [result, setResult] = useState<any>(null);

  async function run() {
    const response = await fetch("/api/merchandising-margin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: JSON.parse(payload) }),
    });
    setResult(await response.json());
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Merchandising Margin Guard</h1>
        <p className="text-sm text-muted-foreground">Protect margin while deciding discounts and merchandising pushes.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-white p-5">
          <textarea className="h-64 w-full rounded-md border p-3 font-mono text-sm" value={payload} onChange={(event) => setPayload(event.target.value)} />
          <button className="mt-3 rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={run}>Guard margin</button>
        </section>
        <section className="rounded-lg border bg-white p-5">
          {result ? result.scored.map((row: any) => (
            <div key={row.title} className="border-b py-3">
              <strong>{row.title}</strong>
              <div>{row.margin}% margin</div>
              <p className="text-sm text-muted-foreground">{row.action}</p>
            </div>
          )) : <p className="text-sm text-muted-foreground">Run a guardrail check to see merchandising actions.</p>}
        </section>
      </div>
    </main>
  );
}

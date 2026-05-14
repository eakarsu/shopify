// === Batch 11 Gaps & Frontend Mounts ===
'use client';
import GapFeaturePage from '@/components/GapFeaturePage';
export default function GapCarrierApiPage() {
  return (
    <GapFeaturePage
      title="Carrier API Integration (FedEx/UPS)"
      description="Carrier API Integration (FedEx/UPS)"
      slug="carrier-api"
      aiResultKey="rate"
      fields={[{"name":"carrier","label":"Carrier","required":true,"placeholder":""},{"name":"zip","label":"Destination ZIP","required":false,"placeholder":""}]}
    />
  );
}

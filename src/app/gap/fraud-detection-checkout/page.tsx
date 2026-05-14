// === Batch 11 Gaps & Frontend Mounts ===
'use client';
import GapFeaturePage from '@/components/GapFeaturePage';
export default function GapFraudDetectionCheckoutPage() {
  return (
    <GapFeaturePage
      title="Checkout Fraud Detection"
      description="Checkout Fraud Detection"
      slug="fraud-detection-checkout"
      aiResultKey="risk"
      fields={[{"name":"session","label":"Session (JSON)","type":"json"}]}
    />
  );
}

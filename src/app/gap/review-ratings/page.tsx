// === Batch 11 Gaps & Frontend Mounts ===
'use client';
import GapFeaturePage from '@/components/GapFeaturePage';
export default function GapReviewRatingsPage() {
  return (
    <GapFeaturePage
      title="Review/Rating Collection"
      description="Review/Rating Collection"
      slug="review-ratings"
      aiResultKey="review"
      fields={[{"name":"productId","label":"Product ID","required":true,"placeholder":""},{"name":"rating","label":"Rating","type":"number"}]}
    />
  );
}

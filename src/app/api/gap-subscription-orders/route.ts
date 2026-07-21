import { unavailableFeatureBoundary } from "@/lib/gap-boundary"

const boundary = unavailableFeatureBoundary(
  "Subscription orders",
  "Approve billing, pause, cancellation, retry, and fulfillment rules before provider integration",
)
export const GET = boundary
export const POST = boundary

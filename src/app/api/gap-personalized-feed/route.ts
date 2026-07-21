import { unavailableFeatureBoundary } from "@/lib/gap-boundary"

const boundary = unavailableFeatureBoundary(
  "Personalized storefront feed",
  "Approve consent, ranking evidence, evaluation, and fallback rules before activation",
)
export const GET = boundary
export const POST = boundary

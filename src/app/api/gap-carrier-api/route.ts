import { unavailableFeatureBoundary } from "@/lib/gap-boundary"

const boundary = unavailableFeatureBoundary(
  "Legacy carrier demo",
  "Use /api/order-operations/quote and the configured shipping provider contract",
)
export const GET = boundary
export const POST = boundary

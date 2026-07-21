import { unavailableFeatureBoundary } from "@/lib/gap-boundary"

const boundary = unavailableFeatureBoundary(
  "Legacy review demo",
  "Use the authenticated review workflow backed by the Review model",
)
export const GET = boundary
export const POST = boundary

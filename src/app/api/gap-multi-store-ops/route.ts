import { unavailableFeatureBoundary } from "@/lib/gap-boundary"

const boundary = unavailableFeatureBoundary(
  "Multi-store operations",
  "Define tenant isolation and authorization policy before adding store-scoped persistence",
)
export const GET = boundary
export const POST = boundary

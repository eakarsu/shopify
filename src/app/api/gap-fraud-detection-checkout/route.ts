import { unavailableFeatureBoundary } from "@/lib/gap-boundary"

const boundary = unavailableFeatureBoundary(
  "Checkout fraud scoring",
  "Select a risk provider, define review thresholds, and obtain privacy approval before activation",
)
export const GET = boundary
export const POST = boundary

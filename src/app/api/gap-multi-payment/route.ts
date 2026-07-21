import { unavailableFeatureBoundary } from "@/lib/gap-boundary"

const boundary = unavailableFeatureBoundary(
  "Additional payment methods",
  "Complete provider onboarding and add each method behind the payment adapter and webhook state machine",
)
export const GET = boundary
export const POST = boundary

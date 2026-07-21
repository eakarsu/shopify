import { unavailableFeatureBoundary } from "@/lib/gap-boundary"

const boundary = unavailableFeatureBoundary(
  "Loyalty points",
  "Approve earning, redemption, expiry, and accounting rules before adding a persistent ledger",
)
export const GET = boundary
export const POST = boundary

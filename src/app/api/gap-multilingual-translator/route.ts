import { unavailableFeatureBoundary } from "@/lib/gap-boundary"

const boundary = unavailableFeatureBoundary(
  "Automatic catalog translation",
  "Define human review, glossary, privacy, and publication controls before connecting a translation provider",
)
export const GET = boundary
export const POST = boundary

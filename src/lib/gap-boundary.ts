import { NextResponse } from "next/server"

export function unavailableFeatureBoundary(feature: string, nextStep: string) {
  return function boundary() {
    return NextResponse.json({
      error: `${feature} is not an operational product capability`,
      code: "FEATURE_NOT_IMPLEMENTED",
      nextStep,
      writesPerformed: false,
    }, { status: 410 })
  }
}

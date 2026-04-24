"use client"

import { validatePasswordStrength } from "@/lib/password-validation"
import { cn } from "@/lib/utils"

interface PasswordStrengthIndicatorProps {
  password: string
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null

  const strength = validatePasswordStrength(password)

  const barColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-green-500",
    "bg-emerald-500",
  ]

  const textColors = [
    "text-red-600",
    "text-orange-600",
    "text-yellow-600",
    "text-green-600",
    "text-emerald-600",
  ]

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= strength.score - 1 ? barColors[strength.score] : "bg-gray-200"
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-medium", textColors[strength.score])}>
          {strength.label}
        </span>
      </div>
      {strength.suggestions.length > 0 && (
        <ul className="space-y-1">
          {strength.suggestions.map((suggestion, i) => (
            <li key={i} className="text-xs text-gray-500">
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

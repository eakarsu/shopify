export interface PasswordStrength {
  score: number       // 0-4 (weak to very strong)
  label: string
  color: string
  suggestions: string[]
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const suggestions: string[] = []
  let score = 0

  if (password.length === 0) {
    return { score: 0, label: "Empty", color: "gray", suggestions: ["Enter a password"] }
  }

  // Length checks
  if (password.length >= 8) score++
  else suggestions.push("Use at least 8 characters")

  if (password.length >= 12) score++

  // Character variety checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  else suggestions.push("Use both uppercase and lowercase letters")

  if (/[0-9]/.test(password)) score++
  else suggestions.push("Include at least one number")

  if (/[^a-zA-Z0-9]/.test(password)) score++
  else suggestions.push("Include a special character (!@#$%^&*)")

  // Penalize common patterns
  const commonPasswords = ["password", "12345678", "qwerty", "abc123", "letmein", "admin", "welcome"]
  if (commonPasswords.some(p => password.toLowerCase().includes(p))) {
    score = Math.max(0, score - 2)
    suggestions.push("Avoid common passwords")
  }

  // Penalize repeating characters
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1)
    suggestions.push("Avoid repeating characters")
  }

  // Normalize score to 0-4
  const normalizedScore = Math.min(4, Math.max(0, score))

  const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"]
  const colors = ["red", "orange", "yellow", "green", "emerald"]

  return {
    score: normalizedScore,
    label: labels[normalizedScore],
    color: colors[normalizedScore],
    suggestions: normalizedScore >= 3 ? [] : suggestions
  }
}

export function isPasswordValid(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters")
  }

  if (password.length > 128) {
    errors.push("Password must be less than 128 characters")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number")
  }

  return { valid: errors.length === 0, errors }
}

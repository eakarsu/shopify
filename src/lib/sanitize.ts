// Input sanitization utilities

// Remove HTML tags from a string
function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "")
}

// Escape special HTML characters
function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  }
  return input.replace(/[&<>"'/]/g, (char) => map[char])
}

// Remove null bytes
function removeNullBytes(input: string): string {
  return input.replace(/\0/g, "")
}

// Trim and normalize whitespace
function normalizeWhitespace(input: string): string {
  return input.trim().replace(/\s+/g, " ")
}

// Sanitize a single string value
export function sanitizeString(input: string, options?: { allowHtml?: boolean }): string {
  let result = removeNullBytes(input)
  if (!options?.allowHtml) {
    result = stripHtml(result)
  }
  result = normalizeWhitespace(result)
  return result
}

// Sanitize an email address
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._+-]/g, "")
}

// Sanitize a phone number
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^0-9+\-() ]/g, "").trim()
}

// Sanitize a URL
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim()
  // Only allow http and https protocols
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed
  }
  // Block javascript:, data:, and other dangerous protocols
  return ""
}

// Sanitize a whole object recursively
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string" ? sanitizeString(item) :
        typeof item === "object" && item !== null ? sanitizeObject(item) : item
      )
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized as T
}

// SQL injection prevention - sanitize string for database queries
export function escapeSqlLike(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&")
}

// Validate and sanitize common input fields
export function sanitizeFormData(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      sanitized[key] = value
      continue
    }

    if (typeof value === "string") {
      // Apply field-specific sanitization
      if (key.toLowerCase().includes("email")) {
        sanitized[key] = sanitizeEmail(value)
      } else if (key.toLowerCase().includes("phone")) {
        sanitized[key] = sanitizePhone(value)
      } else if (key.toLowerCase().includes("url") || key.toLowerCase().includes("href")) {
        sanitized[key] = sanitizeUrl(value)
      } else if (key === "content" || key === "body" || key === "description") {
        // Allow HTML in content fields but strip dangerous tags
        sanitized[key] = removeNullBytes(value.trim())
      } else {
        sanitized[key] = sanitizeString(value)
      }
    } else if (typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string" ? sanitizeString(item) : item
      )
    } else if (typeof value === "object") {
      sanitized[key] = sanitizeFormData(value)
    }
  }

  return sanitized
}

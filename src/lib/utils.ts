import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Serialize Prisma objects to plain objects for Client Components
export function serialize<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_, value) => {
    if (typeof value === 'bigint') {
      return Number(value)
    }
    return value
  }))
}

export function formatCurrency(amount: number | string | { toString(): string }, currency = "USD"): string {
  const num = typeof amount === "number" ? amount : parseFloat(amount.toString())
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(num)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d)
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num)
}

export function generateOrderNumber(): number {
  return Math.floor(1000 + Math.random() * 9000)
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-")
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Order status
    OPEN: "bg-blue-100 text-blue-800",
    ARCHIVED: "bg-gray-100 text-gray-800",
    CANCELLED: "bg-red-100 text-red-800",
    // Financial status
    PENDING: "bg-yellow-100 text-yellow-800",
    AUTHORIZED: "bg-blue-100 text-blue-800",
    PAID: "bg-green-100 text-green-800",
    PARTIALLY_PAID: "bg-orange-100 text-orange-800",
    PARTIALLY_REFUNDED: "bg-purple-100 text-purple-800",
    REFUNDED: "bg-gray-100 text-gray-800",
    VOIDED: "bg-gray-100 text-gray-800",
    // Fulfillment status
    UNFULFILLED: "bg-yellow-100 text-yellow-800",
    PARTIALLY_FULFILLED: "bg-orange-100 text-orange-800",
    FULFILLED: "bg-green-100 text-green-800",
    RESTOCKED: "bg-gray-100 text-gray-800",
    // Product status
    ACTIVE: "bg-green-100 text-green-800",
    DRAFT: "bg-gray-100 text-gray-800",
    // Discount status
    SCHEDULED: "bg-blue-100 text-blue-800",
    EXPIRED: "bg-gray-100 text-gray-800",
    DISABLED: "bg-red-100 text-red-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

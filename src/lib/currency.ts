import { prisma } from "./prisma"

export interface Currency {
  code: string
  name: string
  symbol: string
  exchangeRate: number
  isDefault: boolean
}

let currencyCache: Currency[] | null = null
let cacheExpiry: number = 0

export async function getCurrencies(): Promise<Currency[]> {
  // Return cached currencies if still valid (5 minute cache)
  if (currencyCache && Date.now() < cacheExpiry) {
    return currencyCache
  }

  const currencies = await prisma.currency.findMany({
    where: { isActive: true },
    orderBy: { isDefault: "desc" }
  })

  currencyCache = currencies.map(c => ({
    code: c.code,
    name: c.name,
    symbol: c.symbol,
    exchangeRate: Number(c.exchangeRate),
    isDefault: c.isDefault
  }))

  cacheExpiry = Date.now() + 5 * 60 * 1000 // 5 minutes

  return currencyCache
}

export async function getDefaultCurrency(): Promise<Currency> {
  const currencies = await getCurrencies()
  return currencies.find(c => c.isDefault) || {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    exchangeRate: 1,
    isDefault: true
  }
}

export async function getCurrencyByCode(code: string): Promise<Currency | null> {
  const currencies = await getCurrencies()
  return currencies.find(c => c.code === code) || null
}

export function convertPrice(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): number {
  // Convert to base currency (usually USD) then to target
  const baseAmount = amount / fromCurrency.exchangeRate
  const convertedAmount = baseAmount * toCurrency.exchangeRate
  return Math.round(convertedAmount * 100) / 100
}

export function formatPrice(amount: number, currency: Currency): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  return formatter.format(amount)
}

export async function updateExchangeRates(): Promise<void> {
  // In production, fetch from an exchange rate API like:
  // - Open Exchange Rates
  // - Fixer.io
  // - Currency Layer

  // Example with hardcoded rates for demo
  const rates: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    CAD: 1.36,
    AUD: 1.53,
    JPY: 149.50,
    CHF: 0.88,
    CNY: 7.24,
    INR: 83.12,
    MXN: 17.15
  }

  for (const [code, rate] of Object.entries(rates)) {
    await prisma.currency.upsert({
      where: { code },
      create: {
        code,
        name: getCurrencyName(code),
        symbol: getCurrencySymbol(code),
        exchangeRate: rate,
        isDefault: code === "USD",
        isActive: true
      },
      update: {
        exchangeRate: rate,
        updatedAt: new Date()
      }
    })
  }

  // Clear cache
  currencyCache = null
}

function getCurrencyName(code: string): string {
  const names: Record<string, string> = {
    USD: "US Dollar",
    EUR: "Euro",
    GBP: "British Pound",
    CAD: "Canadian Dollar",
    AUD: "Australian Dollar",
    JPY: "Japanese Yen",
    CHF: "Swiss Franc",
    CNY: "Chinese Yuan",
    INR: "Indian Rupee",
    MXN: "Mexican Peso"
  }
  return names[code] || code
}

function getCurrencySymbol(code: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "C$",
    AUD: "A$",
    JPY: "¥",
    CHF: "CHF",
    CNY: "¥",
    INR: "₹",
    MXN: "$"
  }
  return symbols[code] || code
}

// Middleware helper to get user's preferred currency
export function getCurrencyFromRequest(
  cookies: { get: (name: string) => { value: string } | undefined },
  acceptLanguage?: string
): string {
  // Check cookie first
  const currencyCookie = cookies.get("currency")
  if (currencyCookie?.value) {
    return currencyCookie.value
  }

  // Try to infer from accept-language header
  if (acceptLanguage) {
    const locale = acceptLanguage.split(",")[0]
    const regionMatch = locale.match(/-([A-Z]{2})/)
    if (regionMatch) {
      const regionToCurrency: Record<string, string> = {
        US: "USD",
        GB: "GBP",
        EU: "EUR",
        CA: "CAD",
        AU: "AUD",
        JP: "JPY",
        CH: "CHF",
        CN: "CNY",
        IN: "INR",
        MX: "MXN"
      }
      return regionToCurrency[regionMatch[1]] || "USD"
    }
  }

  return "USD"
}

import { NextRequest, NextResponse } from "next/server"
import { searchProducts, getSuggestions, getPopularSearches } from "@/lib/search"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""
    const type = searchParams.get("type") || "search" // search, suggestions, popular
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")
    const category = searchParams.get("category") || undefined
    const minPrice = searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined
    const maxPrice = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined
    const sortBy = searchParams.get("sortBy") as any || "relevance"

    if (type === "suggestions") {
      const suggestions = await getSuggestions(query, limit)
      return NextResponse.json({ suggestions })
    }

    if (type === "popular") {
      const popular = await getPopularSearches()
      return NextResponse.json({ popular })
    }

    // Full search
    const results = await searchProducts(query, {
      limit,
      offset,
      category,
      minPrice,
      maxPrice,
      sortBy,
    })

    return NextResponse.json(results)
  } catch (error: any) {
    console.error("Search error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

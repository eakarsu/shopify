"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface CreateReviewData {
  productId: string
  rating: number
  title?: string
  content?: string
}

export async function createReview(data: CreateReviewData) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user as any)?.type !== "customer") {
      return { success: false, error: "Please sign in to leave a review" }
    }

    const customerId = (session.user as any).customerId

    // Check if customer already reviewed this product
    const existingReview = await prisma.review.findFirst({
      where: {
        productId: data.productId,
        customerId
      }
    })

    if (existingReview) {
      return { success: false, error: "You have already reviewed this product" }
    }

    // Check if customer has purchased this product
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        product: { id: data.productId },
        order: {
          customerId,
          status: { not: "CANCELLED" }
        }
      }
    })

    // Create review
    const review = await prisma.review.create({
      data: {
        productId: data.productId,
        customerId,
        authorName: session.user?.name ?? "Customer",
        authorEmail: session.user?.email ?? "",
        rating: data.rating,
        title: data.title,
        content: data.content ?? "",
        isVerified: !!hasPurchased,
        isApproved: false // Requires moderation
      }
    })

    revalidatePath(`/shop/product/[slug]`)
    return { success: true, reviewId: review.id }
  } catch (error) {
    console.error("Create review error:", error)
    return { success: false, error: "Failed to create review" }
  }
}

export async function approveReview(reviewId: string) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user as any)?.type !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await prisma.review.update({
      where: { id: reviewId },
      data: { isApproved: true }
    })

    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Approve review error:", error)
    return { success: false, error: "Failed to approve review" }
  }
}

export async function deleteReview(reviewId: string) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user as any)?.type !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await prisma.review.delete({
      where: { id: reviewId }
    })

    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Delete review error:", error)
    return { success: false, error: "Failed to delete review" }
  }
}

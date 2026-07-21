"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function getOrCreateCart() {
  const session = await getServerSession(authOptions)
  const cookieStore = await cookies()
  let cartId = cookieStore.get("cartId")?.value

  // If logged in customer, find their cart
  if (session && (session.user as any)?.customerId) {
    const customerAccountId = (session.user as any).id as string
    let cart = await prisma.cart.findUnique({
      where: { customerAccountId }
    })

    if (!cart) {
      cart = await prisma.cart.create({
        data: { customerAccountId }
      })
    }

    // Merge guest cart if exists
    if (cartId) {
      const guestCart = await prisma.cart.findUnique({
        where: { id: cartId },
        include: { items: true }
      })

      if (guestCart && guestCart.items.length > 0) {
        // Move items to customer cart
        for (const item of guestCart.items) {
          const existingItem = await prisma.cartItem.findFirst({
            where: {
              cartId: cart.id,
              variantId: item.variantId
            }
          })

          if (existingItem) {
            await prisma.cartItem.update({
              where: { id: existingItem.id },
              data: { quantity: existingItem.quantity + item.quantity }
            })
          } else {
            await prisma.cartItem.create({
              data: {
                cartId: cart.id,
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity
              }
            })
          }
        }

        // Delete guest cart
        await prisma.cart.delete({ where: { id: cartId } })
        cookieStore.delete("cartId")
      }
    }

    return cart
  }

  // Guest cart
  if (!cartId) {
    const cart = await prisma.cart.create({ data: {} })
    cookieStore.set("cartId", cart.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })
    return cart
  }

  let cart = await prisma.cart.findUnique({
    where: { id: cartId }
  })

  if (!cart) {
    cart = await prisma.cart.create({ data: {} })
    cookieStore.set("cartId", cart.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30
    })
  }

  return cart
}

export async function addToCart(data: { variantId: string; quantity: number }) {
  const cart = await getOrCreateCart()
  const variant = await prisma.variant.findUniqueOrThrow({ where: { id: data.variantId } })

  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      variantId: data.variantId
    }
  })

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + data.quantity }
    })
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: variant.productId,
        variantId: data.variantId,
        quantity: data.quantity
      }
    })
  }

  revalidatePath("/")
  return { success: true }
}

export async function updateCartItem(itemId: string, quantity: number) {
  if (quantity <= 0) {
    await prisma.cartItem.delete({
      where: { id: itemId }
    })
  } else {
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity }
    })
  }

  revalidatePath("/cart")
  return { success: true }
}

export async function removeCartItem(itemId: string) {
  await prisma.cartItem.delete({
    where: { id: itemId }
  })

  revalidatePath("/cart")
  return { success: true }
}

export async function clearCart() {
  const cart = await getOrCreateCart()

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id }
  })

  revalidatePath("/cart")
  return { success: true }
}

export async function getCart() {
  const cart = await getOrCreateCart()

  return prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: true
            }
          }
        }
      }
    }
  })
}

export async function applyDiscountCode(code: string) {
  const cart = await getOrCreateCart()

  const discount = await prisma.discount.findFirst({
    where: {
      code: { equals: code, mode: "insensitive" },
      status: "ACTIVE",
      startDate: { lte: new Date() },
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } }
      ]
    }
  })

  if (!discount) {
    return { success: false, error: "Invalid or expired discount code" }
  }

  if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
    return { success: false, error: "This discount code has reached its usage limit" }
  }

  await prisma.cart.update({
    where: { id: cart.id },
    data: { discountCode: code }
  })

  revalidatePath("/cart")
  return { success: true, discount }
}

export async function removeDiscountCode() {
  const cart = await getOrCreateCart()

  await prisma.cart.update({
    where: { id: cart.id },
    data: { discountCode: null }
  })

  revalidatePath("/cart")
  return { success: true }
}

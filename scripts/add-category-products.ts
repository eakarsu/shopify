import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const clothingProducts = [
  { title: "Classic Cotton T-Shirt", price: 29.99, description: "Comfortable cotton t-shirt for everyday wear", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500" },
  { title: "Slim Fit Denim Jeans", price: 79.99, description: "Modern slim fit jeans in classic blue", image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500" },
  { title: "Casual Button-Down Shirt", price: 49.99, description: "Versatile button-down for work or casual wear", image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500" },
  { title: "Wool Blend Sweater", price: 89.99, description: "Warm and cozy sweater for cooler days", image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500" },
  { title: "Lightweight Hoodie", price: 59.99, description: "Perfect layering piece for any season", image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500" },
  { title: "Chino Pants", price: 64.99, description: "Classic chinos in a flattering fit", image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500" },
  { title: "Summer Dress", price: 74.99, description: "Flowy summer dress perfect for warm days", image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500" },
  { title: "Leather Jacket", price: 199.99, description: "Timeless leather jacket for effortless style", image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500" },
  { title: "Polo Shirt", price: 44.99, description: "Classic polo shirt in premium cotton", image: "https://images.unsplash.com/photo-1625910513413-5fc421e35f3c?w=500" },
  { title: "Blazer Jacket", price: 149.99, description: "Sophisticated blazer for business or casual", image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500" },
  { title: "Athletic Shorts", price: 34.99, description: "Breathable shorts for workouts", image: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=500" },
  { title: "Maxi Skirt", price: 54.99, description: "Elegant maxi skirt for any occasion", image: "https://images.unsplash.com/photo-1583496661160-fb5886a0afe2?w=500" },
  { title: "Cardigan Sweater", price: 69.99, description: "Cozy cardigan perfect for layering", image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500" },
  { title: "Linen Shirt", price: 59.99, description: "Breathable linen shirt for summer", image: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500" },
  { title: "Cargo Pants", price: 69.99, description: "Functional cargo pants with multiple pockets", image: "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=500" },
]

const shoesProducts = [
  { title: "Classic White Sneakers", price: 89.99, description: "Versatile white sneakers for any outfit", image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500" },
  { title: "Running Shoes", price: 129.99, description: "High-performance running shoes", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500" },
  { title: "Leather Boots", price: 159.99, description: "Durable leather boots for any terrain", image: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=500" },
  { title: "Casual Loafers", price: 99.99, description: "Comfortable slip-on loafers", image: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=500" },
  { title: "High Top Sneakers", price: 109.99, description: "Stylish high-top sneakers", image: "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=500" },
  { title: "Dress Shoes", price: 139.99, description: "Elegant dress shoes for formal occasions", image: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=500" },
  { title: "Sandals", price: 49.99, description: "Comfortable sandals for summer", image: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=500" },
  { title: "Chelsea Boots", price: 149.99, description: "Classic Chelsea boots in leather", image: "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=500" },
  { title: "Canvas Slip-Ons", price: 44.99, description: "Easy-going canvas slip-on shoes", image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500" },
  { title: "Hiking Boots", price: 169.99, description: "Rugged boots for outdoor adventures", image: "https://images.unsplash.com/photo-1520219306100-ec4afeeefe58?w=500" },
  { title: "Athletic Training Shoes", price: 119.99, description: "Versatile shoes for gym workouts", image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500" },
  { title: "Boat Shoes", price: 89.99, description: "Classic boat shoes for casual style", image: "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=500" },
  { title: "Platform Sneakers", price: 99.99, description: "Trendy platform sneakers", image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500" },
  { title: "Ankle Boots", price: 129.99, description: "Stylish ankle boots for everyday wear", image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500" },
  { title: "Flip Flops", price: 24.99, description: "Beach-ready flip flops", image: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=500" },
]

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

async function main() {
  console.log('Adding clothing products...')
  for (const product of clothingProducts) {
    let slug = generateSlug(product.title)
    const existing = await prisma.product.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now()}`

    await prisma.product.create({
      data: {
        title: product.title,
        slug,
        description: product.description,
        price: product.price,
        status: 'ACTIVE',
        productType: 'Clothing',
        tags: ['clothing', 'apparel'],
        images: [product.image],
        variants: {
          create: { title: 'Default', price: product.price, inventoryQuantity: 50 }
        }
      }
    })
    console.log(`  Created: ${product.title}`)
  }

  console.log('Adding shoes products...')
  for (const product of shoesProducts) {
    let slug = generateSlug(product.title)
    const existing = await prisma.product.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now()}`

    await prisma.product.create({
      data: {
        title: product.title,
        slug,
        description: product.description,
        price: product.price,
        status: 'ACTIVE',
        productType: 'Shoes',
        tags: ['shoes', 'footwear'],
        images: [product.image],
        variants: {
          create: { title: 'Default', price: product.price, inventoryQuantity: 50 }
        }
      }
    })
    console.log(`  Created: ${product.title}`)
  }

  console.log('Done! Added 30 products.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const productData = [
  { title: "Classic White T-Shirt", type: "T-Shirts", vendor: "BasicWear", price: 29.99, tags: ["cotton", "casual", "summer"], images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500"] },
  { title: "Premium Denim Jeans", type: "Jeans", vendor: "DenimCo", price: 89.99, tags: ["denim", "casual", "premium"], images: ["https://images.unsplash.com/photo-1542272604-787c3835535d?w=500"] },
  { title: "Leather Crossbody Bag", type: "Bags", vendor: "LeatherLux", price: 159.99, tags: ["leather", "accessories", "premium"], images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500"] },
  { title: "Running Sneakers Pro", type: "Shoes", vendor: "SportStep", price: 129.99, tags: ["sports", "running", "comfort"], images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500"] },
  { title: "Wool Winter Coat", type: "Outerwear", vendor: "WarmStyle", price: 249.99, tags: ["winter", "wool", "premium"], images: ["https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=500"] },
  { title: "Silk Evening Dress", type: "Dresses", vendor: "ElegantWear", price: 199.99, tags: ["formal", "silk", "evening"], images: ["https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500"] },
  { title: "Cotton Polo Shirt", type: "Shirts", vendor: "BasicWear", price: 45.99, tags: ["cotton", "casual", "classic"], images: ["https://images.unsplash.com/photo-1625910513413-5fc72d6b810f?w=500"] },
  { title: "Slim Fit Chinos", type: "Pants", vendor: "ModernFit", price: 65.99, tags: ["slim-fit", "casual", "office"], images: ["https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500"] },
  { title: "Canvas Backpack", type: "Bags", vendor: "UrbanGear", price: 79.99, tags: ["canvas", "travel", "everyday"], images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500"] },
  { title: "Suede Chelsea Boots", type: "Shoes", vendor: "FootCraft", price: 169.99, tags: ["suede", "boots", "fashion"], images: ["https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=500"] },
  { title: "Cashmere Sweater", type: "Sweaters", vendor: "LuxuryKnit", price: 189.99, tags: ["cashmere", "winter", "luxury"], images: ["https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500"] },
  { title: "Linen Summer Shirt", type: "Shirts", vendor: "BreezyCo", price: 55.99, tags: ["linen", "summer", "breathable"], images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500"] },
  { title: "Athletic Shorts", type: "Shorts", vendor: "SportStep", price: 39.99, tags: ["sports", "athletic", "comfort"], images: ["https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=500"] },
  { title: "Vintage Sunglasses", type: "Accessories", vendor: "RetroShade", price: 89.99, tags: ["vintage", "summer", "uv-protection"], images: ["https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500"] },
  { title: "Minimalist Watch", type: "Accessories", vendor: "TimePiece", price: 149.99, tags: ["watch", "minimalist", "elegant"], images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"] },
  { title: "Fleece Hoodie", type: "Hoodies", vendor: "ComfortWear", price: 69.99, tags: ["fleece", "casual", "cozy"], images: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500"] },
  { title: "Tailored Blazer", type: "Blazers", vendor: "SharpDress", price: 179.99, tags: ["formal", "tailored", "office"], images: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500"] },
  { title: "Organic Cotton Socks", type: "Accessories", vendor: "EcoWear", price: 14.99, tags: ["organic", "cotton", "eco-friendly"], images: ["https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=500"] },
  { title: "Waterproof Jacket", type: "Outerwear", vendor: "OutdoorPro", price: 139.99, tags: ["waterproof", "outdoor", "hiking"], images: ["https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500"] },
  { title: "Yoga Pants", type: "Activewear", vendor: "FlexFit", price: 59.99, tags: ["yoga", "stretch", "comfort"], images: ["https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=500"] },
  { title: "Formal Dress Shirt", type: "Shirts", vendor: "SharpDress", price: 79.99, tags: ["formal", "office", "business"], images: ["https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500"] },
  { title: "Denim Jacket", type: "Outerwear", vendor: "DenimCo", price: 109.99, tags: ["denim", "casual", "classic"], images: ["https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=500"] },
  { title: "Leather Belt", type: "Accessories", vendor: "LeatherLux", price: 49.99, tags: ["leather", "accessories", "classic"], images: ["https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=500"] },
  { title: "Knit Beanie", type: "Accessories", vendor: "WarmStyle", price: 24.99, tags: ["winter", "knit", "cozy"], images: ["https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=500"] },
  { title: "Sports Bra", type: "Activewear", vendor: "FlexFit", price: 44.99, tags: ["sports", "support", "comfort"], images: ["https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500"] },
  { title: "Cargo Pants", type: "Pants", vendor: "UrbanGear", price: 74.99, tags: ["cargo", "utility", "casual"], images: ["https://images.unsplash.com/photo-1517445312882-bc9910d016b7?w=500"] },
  { title: "Silk Scarf", type: "Accessories", vendor: "ElegantWear", price: 69.99, tags: ["silk", "accessories", "elegant"], images: ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500"] },
  { title: "Canvas Sneakers", type: "Shoes", vendor: "StreetStyle", price: 59.99, tags: ["canvas", "casual", "everyday"], images: ["https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500"] },
  { title: "Wool Cardigan", type: "Sweaters", vendor: "LuxuryKnit", price: 129.99, tags: ["wool", "layering", "classic"], images: ["https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500"] },
  { title: "Board Shorts", type: "Shorts", vendor: "BeachLife", price: 49.99, tags: ["beach", "swim", "summer"], images: ["https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=500"] },
  { title: "Trench Coat", type: "Outerwear", vendor: "ClassicStyle", price: 229.99, tags: ["trench", "classic", "formal"], images: ["https://images.unsplash.com/photo-1544923246-77307dd628b8?w=500"] },
  { title: "High-Waist Jeans", type: "Jeans", vendor: "DenimCo", price: 79.99, tags: ["high-waist", "trendy", "denim"], images: ["https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500"] },
  { title: "Graphic Tee", type: "T-Shirts", vendor: "StreetStyle", price: 34.99, tags: ["graphic", "casual", "trendy"], images: ["https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?w=500"] },
  { title: "Leather Wallet", type: "Accessories", vendor: "LeatherLux", price: 79.99, tags: ["leather", "wallet", "everyday"], images: ["https://images.unsplash.com/photo-1627123424574-724758594e93?w=500"] },
  { title: "Ankle Boots", type: "Shoes", vendor: "FootCraft", price: 139.99, tags: ["boots", "ankle", "versatile"], images: ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500"] },
  { title: "Puffer Vest", type: "Outerwear", vendor: "OutdoorPro", price: 89.99, tags: ["puffer", "layering", "warmth"], images: ["https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500"] },
  { title: "Midi Skirt", type: "Skirts", vendor: "ElegantWear", price: 64.99, tags: ["midi", "elegant", "versatile"], images: ["https://images.unsplash.com/photo-1583496661160-fb5886a0ebb9?w=500"] },
  { title: "Striped Polo", type: "Shirts", vendor: "ClassicStyle", price: 54.99, tags: ["striped", "polo", "preppy"], images: ["https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=500"] },
  { title: "Jogger Pants", type: "Pants", vendor: "ComfortWear", price: 49.99, tags: ["jogger", "comfort", "casual"], images: ["https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=500"] },
  { title: "Pearl Earrings", type: "Jewelry", vendor: "GemStone", price: 99.99, tags: ["pearl", "elegant", "classic"], images: ["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500"] },
]

const firstNames = ["James", "Emma", "Liam", "Olivia", "Noah", "Ava", "William", "Sophia", "Oliver", "Isabella", "Benjamin", "Mia", "Elijah", "Charlotte", "Lucas", "Amelia", "Mason", "Harper", "Logan", "Evelyn"]
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]
const cities = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville", "Fort Worth", "Columbus", "Charlotte", "Seattle", "Denver", "Boston", "Nashville", "Portland"]
const states = ["NY", "CA", "IL", "TX", "AZ", "PA", "TX", "CA", "TX", "CA", "TX", "FL", "TX", "OH", "NC", "WA", "CO", "MA", "TN", "OR"]

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function generateGiftCardCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += "-"
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

async function main() {
  console.log("Seeding database...")

  // Clear existing data
  await prisma.webhookLog.deleteMany()
  await prisma.webhook.deleteMany()
  await prisma.campaignRecipient.deleteMany()
  await prisma.marketingCampaign.deleteMany()
  await prisma.abandonedCartEmail.deleteMany()
  await prisma.analyticsEvent.deleteMany()
  await prisma.dailyAnalytics.deleteMany()
  await prisma.apiKey.deleteMany()
  await prisma.currency.deleteMany()
  await prisma.fulfillmentItem.deleteMany()
  await prisma.fulfillment.deleteMany()
  await prisma.orderTimeline.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.inventory.deleteMany()
  await prisma.collectionProduct.deleteMany()
  await prisma.collection.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.cart.deleteMany()
  await prisma.wishlistItem.deleteMany()
  await prisma.wishlist.deleteMany()
  await prisma.review.deleteMany()
  await prisma.variant.deleteMany()
  await prisma.product.deleteMany()
  await prisma.customerAddress.deleteMany()
  await prisma.customerAccount.deleteMany()
  await prisma.giftCardTransaction.deleteMany()
  await prisma.giftCard.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.discount.deleteMany()
  await prisma.location.deleteMany()
  await prisma.category.deleteMany()
  await prisma.analytics.deleteMany()
  await prisma.storeSetting.deleteMany()
  await prisma.user.deleteMany()
  await prisma.shippingRate.deleteMany()
  await prisma.shippingZone.deleteMany()
  await prisma.taxRate.deleteMany()
  await prisma.blogPost.deleteMany()
  await prisma.page.deleteMany()
  await prisma.emailTemplate.deleteMany()

  console.log("Creating admin user...")
  const hashedPassword = await bcrypt.hash("admin123", 10)
  await prisma.user.create({
    data: {
      email: "admin@shopify.com",
      password: hashedPassword,
      name: "Admin User",
      role: "ADMIN",
      isActive: true
    }
  })

  console.log("Creating locations...")
  const locations = await Promise.all([
    prisma.location.create({
      data: {
        name: "Main Warehouse",
        address1: "123 Commerce St",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        country: "US",
        isDefault: true,
        isActive: true
      }
    }),
    prisma.location.create({
      data: {
        name: "West Coast Hub",
        address1: "456 Pacific Ave",
        city: "Los Angeles",
        state: "CA",
        postalCode: "90001",
        country: "US",
        isActive: true
      }
    }),
    prisma.location.create({
      data: {
        name: "Central Distribution",
        address1: "789 Central Blvd",
        city: "Chicago",
        state: "IL",
        postalCode: "60601",
        country: "US",
        isActive: true
      }
    })
  ])

  console.log("Creating shipping zones...")
  const domesticZone = await prisma.shippingZone.create({
    data: {
      name: "Domestic",
      countries: ["US"],
      states: [],
      postalCodes: [],
      isDefault: true,
      rates: {
        create: [
          { name: "Standard Shipping", price: 5.99, type: "FLAT", estimatedDays: "5-7 days" },
          { name: "Express Shipping", price: 12.99, type: "FLAT", estimatedDays: "2-3 days" },
          { name: "Free Shipping", price: 0, type: "FREE", minOrderAmount: 50, estimatedDays: "5-7 days" }
        ]
      }
    }
  })

  await prisma.shippingZone.create({
    data: {
      name: "International",
      countries: ["CA", "GB", "AU", "DE", "FR"],
      states: [],
      postalCodes: [],
      rates: {
        create: [
          { name: "International Standard", price: 19.99, type: "FLAT", estimatedDays: "10-14 days" },
          { name: "International Express", price: 39.99, type: "FLAT", estimatedDays: "5-7 days" }
        ]
      }
    }
  })

  console.log("Creating tax rates...")
  await prisma.taxRate.createMany({
    data: [
      { name: "California Sales Tax", country: "US", state: "CA", rate: 0.0725, isActive: true },
      { name: "New York Sales Tax", country: "US", state: "NY", rate: 0.08, isActive: true },
      { name: "Texas Sales Tax", country: "US", state: "TX", rate: 0.0625, isActive: true },
      { name: "Florida Sales Tax", country: "US", state: "FL", rate: 0.06, isActive: true }
    ]
  })

  console.log("Creating categories...")
  const categories = await Promise.all([
    prisma.category.create({ data: { name: "Clothing", slug: "clothing", description: "All clothing items" } }),
    prisma.category.create({ data: { name: "Shoes", slug: "shoes", description: "Footwear for all occasions" } }),
    prisma.category.create({ data: { name: "Accessories", slug: "accessories", description: "Complete your look" } }),
    prisma.category.create({ data: { name: "Bags", slug: "bags", description: "Bags and backpacks" } })
  ])

  console.log("Creating products...")
  const products = []
  for (let i = 0; i < productData.length; i++) {
    const data = productData[i]
    const baseSlug = slugify(data.title)
    const product = await prisma.product.create({
      data: {
        title: data.title,
        slug: `${baseSlug}-${i + 1}`,
        description: `High-quality ${data.title.toLowerCase()} from ${data.vendor}. Perfect for any occasion.`,
        price: data.price,
        compareAtPrice: Math.random() > 0.7 ? data.price * 1.2 : null,
        status: Math.random() > 0.1 ? "ACTIVE" : "DRAFT",
        vendor: data.vendor,
        productType: data.type,
        tags: data.tags,
        images: data.images || [],
        weight: randomInt(1, 20) / 10,
        weightUnit: "kg",
        variants: {
          create: {
            title: "Default",
            price: data.price,
            inventoryQuantity: randomInt(0, 200),
            sku: `SKU-${1000 + i}`,
            weight: randomInt(1, 20) / 10
          }
        }
      },
      include: { variants: true }
    })
    products.push(product)

    // Create inventory for each variant
    for (const variant of product.variants) {
      for (const location of locations) {
        await prisma.inventory.create({
          data: {
            variantId: variant.id,
            locationId: location.id,
            quantity: randomInt(0, 50)
          }
        })
      }
    }
  }

  console.log("Creating collections...")
  const collections = await Promise.all([
    prisma.collection.create({
      data: {
        title: "New Arrivals",
        slug: "new-arrivals",
        description: "Check out our latest products",
        type: "MANUAL",
        published: true,
        image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800"
      }
    }),
    prisma.collection.create({
      data: {
        title: "Best Sellers",
        slug: "best-sellers",
        description: "Our most popular items",
        type: "MANUAL",
        published: true,
        image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800"
      }
    }),
    prisma.collection.create({
      data: {
        title: "Summer Collection",
        slug: "summer-collection",
        description: "Beat the heat with our summer styles",
        type: "MANUAL",
        published: true,
        image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800"
      }
    }),
    prisma.collection.create({
      data: {
        title: "Winter Essentials",
        slug: "winter-essentials",
        description: "Stay warm and stylish",
        type: "MANUAL",
        published: true,
        image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800"
      }
    }),
    prisma.collection.create({
      data: {
        title: "Sale",
        slug: "sale",
        description: "Great deals on selected items",
        type: "MANUAL",
        published: true,
        image: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=800"
      }
    })
  ])

  // Add products to collections
  for (const collection of collections) {
    const numProducts = randomInt(5, 15)
    const shuffled = [...products].sort(() => 0.5 - Math.random())
    for (let i = 0; i < numProducts && i < shuffled.length; i++) {
      await prisma.collectionProduct.create({
        data: {
          collectionId: collection.id,
          productId: shuffled[i].id,
          position: i
        }
      })
    }
  }

  console.log("Creating customers...")
  const customers = []
  for (let i = 0; i < 80; i++) {
    const firstName = randomElement(firstNames)
    const lastName = randomElement(lastNames)
    const cityIndex = randomInt(0, cities.length - 1)

    const customer = await prisma.customer.create({
      data: {
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
        firstName,
        lastName,
        phone: `+1${randomInt(200, 999)}${randomInt(100, 999)}${randomInt(1000, 9999)}`,
        address1: `${randomInt(100, 9999)} ${randomElement(["Main", "Oak", "Elm", "Park", "Cedar"])} ${randomElement(["St", "Ave", "Blvd", "Ln", "Dr"])}`,
        city: cities[cityIndex],
        state: states[cityIndex],
        postalCode: `${randomInt(10000, 99999)}`,
        country: "US",
        acceptsMarketing: Math.random() > 0.5
      }
    })
    customers.push(customer)
  }

  console.log("Creating discounts...")
  const discounts = await Promise.all([
    prisma.discount.create({
      data: {
        code: "WELCOME10",
        type: "PERCENTAGE",
        value: 10,
        usageLimit: 1000,
        onePerCustomer: true,
        startDate: new Date(),
        status: "ACTIVE"
      }
    }),
    prisma.discount.create({
      data: {
        code: "SAVE20",
        type: "PERCENTAGE",
        value: 20,
        minPurchaseAmount: 100,
        startDate: new Date(),
        status: "ACTIVE"
      }
    }),
    prisma.discount.create({
      data: {
        code: "FLAT15",
        type: "FIXED_AMOUNT",
        value: 15,
        minPurchaseAmount: 75,
        startDate: new Date(),
        status: "ACTIVE"
      }
    }),
    prisma.discount.create({
      data: {
        code: "FREESHIP",
        type: "FREE_SHIPPING",
        value: 0,
        minPurchaseAmount: 50,
        startDate: new Date(),
        status: "ACTIVE"
      }
    }),
    prisma.discount.create({
      data: {
        code: "SUMMER25",
        type: "PERCENTAGE",
        value: 25,
        usageLimit: 500,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: "ACTIVE"
      }
    })
  ])

  console.log("Creating gift cards...")
  for (let i = 0; i < 10; i++) {
    const value = [25, 50, 75, 100, 150, 200][randomInt(0, 5)]
    await prisma.giftCard.create({
      data: {
        code: generateGiftCardCode(),
        initialValue: value,
        balance: value,
        isActive: true,
        recipientEmail: `recipient${i}@example.com`,
        recipientName: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
        senderName: "Store Team",
        message: "Enjoy your gift!"
      }
    })
  }

  console.log("Creating orders...")
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  for (let i = 0; i < 200; i++) {
    const customer = randomElement(customers)
    const numItems = randomInt(1, 5)
    const orderProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, numItems)

    let subtotal = 0
    const items = orderProducts.map(product => {
      const quantity = randomInt(1, 3)
      const price = Number(product.price)
      const total = price * quantity
      subtotal += total
      return {
        productId: product.id,
        variantId: product.variants[0]?.id,
        title: product.title,
        variantTitle: product.variants[0]?.title,
        sku: product.variants[0]?.sku,
        quantity,
        price,
        totalPrice: total
      }
    })

    const shipping = subtotal > 50 ? 0 : 5.99
    const taxRate = 0.08
    const tax = subtotal * taxRate
    const discount = Math.random() > 0.8 ? subtotal * 0.1 : 0
    const total = subtotal + shipping + tax - discount

    const financialStatuses = ["PENDING", "PAID", "PAID", "PAID", "REFUNDED"]
    const fulfillmentStatuses = ["UNFULFILLED", "FULFILLED", "FULFILLED", "FULFILLED", "PARTIALLY_FULFILLED"]
    const orderStatuses = ["OPEN", "OPEN", "OPEN", "ARCHIVED", "CANCELLED"]

    const createdAt = randomDate(oneYearAgo, new Date())
    const financialStatus = randomElement(financialStatuses) as any
    const fulfillmentStatus = randomElement(fulfillmentStatuses) as any

    await prisma.order.create({
      data: {
        customerId: customer.id,
        email: customer.email,
        phone: customer.phone,
        status: randomElement(orderStatuses) as any,
        financialStatus,
        fulfillmentStatus,
        subtotalPrice: subtotal,
        totalTax: tax,
        totalShipping: shipping,
        totalDiscounts: discount,
        totalPrice: total,
        shippingAddress1: customer.address1,
        shippingCity: customer.city,
        shippingState: customer.state,
        shippingPostalCode: customer.postalCode,
        shippingCountry: customer.country,
        billingAddress1: customer.address1,
        billingCity: customer.city,
        billingState: customer.state,
        billingPostalCode: customer.postalCode,
        billingCountry: customer.country,
        discountCode: discount > 0 ? randomElement(discounts).code : null,
        createdAt,
        items: { create: items },
        timeline: {
          create: [
            { type: "created", message: "Order created", createdAt },
            ...(financialStatus === "PAID" ? [{
              type: "paid",
              message: "Payment received",
              createdAt: new Date(createdAt.getTime() + randomInt(1, 24) * 60 * 60 * 1000)
            }] : []),
            ...(fulfillmentStatus === "FULFILLED" ? [{
              type: "fulfilled",
              message: "Order fulfilled",
              createdAt: new Date(createdAt.getTime() + randomInt(24, 72) * 60 * 60 * 1000)
            }] : [])
          ]
        }
      }
    })

    // Update customer stats
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: total }
      }
    })
  }

  console.log("Creating reviews...")
  for (let i = 0; i < 100; i++) {
    const product = randomElement(products)
    const customer = randomElement(customers)

    await prisma.review.create({
      data: {
        productId: product.id,
        customerId: customer.id,
        authorName: `${customer.firstName} ${customer.lastName}`,
        authorEmail: customer.email,
        rating: randomInt(3, 5),
        title: randomElement(["Great product!", "Love it!", "Good quality", "Excellent!", "Highly recommend"]),
        content: randomElement([
          "This product exceeded my expectations. Great quality and fast shipping!",
          "Very happy with this purchase. Would buy again!",
          "Exactly what I was looking for. Perfect fit and great value.",
          "Amazing quality for the price. Highly recommended!",
          "Great product, fast delivery, and excellent customer service."
        ]),
        isVerified: Math.random() > 0.3,
        isApproved: Math.random() > 0.2,
        helpfulCount: randomInt(0, 50),
        createdAt: randomDate(oneYearAgo, new Date())
      }
    })
  }

  console.log("Creating blog posts...")
  await prisma.blogPost.createMany({
    data: [
      {
        title: "Summer Fashion Trends 2024",
        slug: "summer-fashion-trends-2024",
        excerpt: "Discover the hottest fashion trends for this summer season.",
        content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
        author: "Fashion Team",
        status: "PUBLISHED",
        tags: ["fashion", "summer", "trends"],
        publishedAt: new Date()
      },
      {
        title: "How to Care for Your Leather Products",
        slug: "how-to-care-for-leather-products",
        excerpt: "Essential tips for maintaining your leather goods.",
        content: "Leather products require special care to maintain their quality and longevity. Here are our top tips for keeping your leather items looking their best.",
        author: "Care Guide Team",
        status: "PUBLISHED",
        tags: ["leather", "care", "tips"],
        publishedAt: new Date()
      },
      {
        title: "Sustainable Fashion: Our Commitment",
        slug: "sustainable-fashion-our-commitment",
        excerpt: "Learn about our journey towards sustainable fashion.",
        content: "Sustainability is at the heart of everything we do. Discover how we're making a difference in the fashion industry.",
        author: "Sustainability Team",
        status: "PUBLISHED",
        tags: ["sustainability", "eco-friendly"],
        publishedAt: new Date()
      }
    ]
  })

  console.log("Creating pages...")
  await prisma.page.createMany({
    data: [
      {
        title: "About Us",
        slug: "about-us",
        content: "We are a leading fashion retailer committed to bringing you the best in style and quality. Founded in 2020, we've grown to serve customers worldwide.",
        status: "PUBLISHED",
        publishedAt: new Date()
      },
      {
        title: "Contact Us",
        slug: "contact-us",
        content: "Get in touch with us! Email: support@store.com, Phone: 1-800-FASHION",
        status: "PUBLISHED",
        publishedAt: new Date()
      },
      {
        title: "Shipping Policy",
        slug: "shipping-policy",
        content: "Free shipping on orders over $50. Standard shipping takes 5-7 business days. Express shipping available for an additional fee.",
        status: "PUBLISHED",
        publishedAt: new Date()
      },
      {
        title: "Returns & Refunds",
        slug: "returns-refunds",
        content: "We offer a 30-day return policy on all items. Items must be unworn with original tags attached.",
        status: "PUBLISHED",
        publishedAt: new Date()
      },
      {
        title: "Privacy Policy",
        slug: "privacy-policy",
        content: "Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.",
        status: "PUBLISHED",
        publishedAt: new Date()
      }
    ]
  })

  console.log("Creating email templates...")
  await prisma.emailTemplate.createMany({
    data: [
      {
        name: "order_confirmation",
        subject: "Order Confirmation - Order #{{orderNumber}}",
        body: "Thank you for your order! Your order #{{orderNumber}} has been confirmed. We'll send you another email when your order ships."
      },
      {
        name: "shipping_confirmation",
        subject: "Your Order Has Shipped - Order #{{orderNumber}}",
        body: "Great news! Your order #{{orderNumber}} has shipped. Track your package using the link below."
      },
      {
        name: "welcome",
        subject: "Welcome to Our Store!",
        body: "Welcome to our store! We're excited to have you as a customer. Use code WELCOME10 for 10% off your first order."
      },
      {
        name: "password_reset",
        subject: "Password Reset Request",
        body: "We received a request to reset your password. Click the link below to create a new password."
      }
    ]
  })

  console.log("Creating store settings...")
  await prisma.storeSetting.createMany({
    data: [
      { key: "storeName", value: "Fashion Store" },
      { key: "storeEmail", value: "support@fashionstore.com" },
      { key: "storePhone", value: "1-800-FASHION" },
      { key: "storeAddress", value: "123 Fashion Ave" },
      { key: "storeCity", value: "New York" },
      { key: "storeState", value: "NY" },
      { key: "storePostal", value: "10001" },
      { key: "storeCountry", value: "United States" },
      { key: "currency", value: "USD" },
      { key: "taxEnabled", value: "true" },
      { key: "stripePublishableKey", value: "" },
      { key: "stripeSecretKey", value: "" }
    ]
  })

  console.log("Creating currencies...")
  await prisma.currency.createMany({
    data: [
      { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 1, isDefault: true, isActive: true },
      { code: "EUR", name: "Euro", symbol: "€", exchangeRate: 0.92, isDefault: false, isActive: true },
      { code: "GBP", name: "British Pound", symbol: "£", exchangeRate: 0.79, isDefault: false, isActive: true },
      { code: "CAD", name: "Canadian Dollar", symbol: "C$", exchangeRate: 1.36, isDefault: false, isActive: true },
      { code: "AUD", name: "Australian Dollar", symbol: "A$", exchangeRate: 1.53, isDefault: false, isActive: true },
      { code: "JPY", name: "Japanese Yen", symbol: "¥", exchangeRate: 149.50, isDefault: false, isActive: true },
      { code: "CHF", name: "Swiss Franc", symbol: "CHF", exchangeRate: 0.88, isDefault: false, isActive: true },
      { code: "CNY", name: "Chinese Yuan", symbol: "¥", exchangeRate: 7.24, isDefault: false, isActive: true },
      { code: "INR", name: "Indian Rupee", symbol: "₹", exchangeRate: 83.12, isDefault: false, isActive: true },
      { code: "MXN", name: "Mexican Peso", symbol: "$", exchangeRate: 17.15, isDefault: false, isActive: true }
    ]
  })

  console.log("Creating sample API key...")
  await prisma.apiKey.create({
    data: {
      name: "Test API Key",
      key: "sk_test_demo_api_key_12345",
      secret: "c2b3a4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7",
      permissions: ["products:read", "products:write", "orders:read", "orders:write", "customers:read", "customers:write", "inventory:read", "inventory:write"],
      isActive: true
    }
  })

  console.log("Database seeded successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

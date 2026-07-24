import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

function requireDemoPassword() {
  const password = process.env.DEMO_PASSWORD || process.env.SEED_DEMO_PASSWORD || process.env.DEMO_SEED_PASSWORD || '';
  if (password.length < 12 || password.length > 1024) throw new Error('DEMO_PASSWORD must contain 12-1024 characters');
  return password;
}

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
  { title: "Velvet Blazer", type: "Blazers", vendor: "ElegantWear", price: 219.99, tags: ["velvet", "formal", "luxury"], images: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500"] },
  { title: "Bamboo Fiber Tee", type: "T-Shirts", vendor: "EcoWear", price: 35.99, tags: ["eco-friendly", "bamboo", "soft"], images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500"] },
  { title: "Platform Sandals", type: "Shoes", vendor: "StreetStyle", price: 84.99, tags: ["platform", "summer", "trendy"], images: ["https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500"] },
  { title: "Merino Wool Base Layer", type: "Activewear", vendor: "OutdoorPro", price: 95.99, tags: ["merino", "base-layer", "outdoor"], images: ["https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500"] },
  { title: "Crossfit Training Shoes", type: "Shoes", vendor: "SportStep", price: 119.99, tags: ["crossfit", "training", "performance"], images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500"] },
  { title: "Recycled Nylon Backpack", type: "Bags", vendor: "EcoWear", price: 89.99, tags: ["recycled", "eco-friendly", "travel"], images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500"] },
  { title: "Linen Blend Blazer", type: "Blazers", vendor: "ModernFit", price: 155.99, tags: ["linen", "summer", "smart-casual"], images: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500"] },
  { title: "Titanium Bracelet", type: "Jewelry", vendor: "GemStone", price: 129.99, tags: ["titanium", "modern", "unisex"], images: ["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500"] },
  { title: "Down Winter Jacket", type: "Outerwear", vendor: "WarmStyle", price: 299.99, tags: ["down", "winter", "warmth"], images: ["https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=500"] },
  { title: "Wide Leg Trousers", type: "Pants", vendor: "ElegantWear", price: 85.99, tags: ["wide-leg", "trendy", "office"], images: ["https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500"] },
  { title: "Knit Crop Top", type: "T-Shirts", vendor: "StreetStyle", price: 32.99, tags: ["knit", "crop", "casual"], images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500"] },
  { title: "Travel Duffel Bag", type: "Bags", vendor: "UrbanGear", price: 119.99, tags: ["travel", "duffel", "weekend"], images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500"] },
  { title: "Corduroy Shirt Jacket", type: "Outerwear", vendor: "ClassicStyle", price: 115.99, tags: ["corduroy", "shacket", "layering"], images: ["https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500"] },
  { title: "Diamond Pendant Necklace", type: "Jewelry", vendor: "GemStone", price: 349.99, tags: ["diamond", "pendant", "luxury"], images: ["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500"] },
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
  await prisma.upload.deleteMany()

  // ============================================
  // USERS (15+ admin/staff users)
  // ============================================
  console.log("Creating users...")
  const adminEmail = process.env.SEED_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@shopify.com"
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "admin123"
  const hashedPassword = await bcrypt.hash(adminPassword, 10)
  const staffPassword = await bcrypt.hash(process.env.SEED_STAFF_PASSWORD || "Staff123!", 10)

  await prisma.user.createMany({
    data: [
      { email: adminEmail, password: hashedPassword, name: "Admin User", role: "ADMIN", isActive: true },
      { email: "sarah.manager@shopify.com", password: staffPassword, name: "Sarah Manager", role: "ADMIN", isActive: true },
      { email: "john.staff@shopify.com", password: staffPassword, name: "John Staff", role: "STAFF", isActive: true },
      { email: "emily.support@shopify.com", password: staffPassword, name: "Emily Support", role: "STAFF", isActive: true },
      { email: "mike.warehouse@shopify.com", password: staffPassword, name: "Mike Warehouse", role: "STAFF", isActive: true },
      { email: "lisa.marketing@shopify.com", password: staffPassword, name: "Lisa Marketing", role: "STAFF", isActive: true },
      { email: "david.analytics@shopify.com", password: staffPassword, name: "David Analytics", role: "VIEWER", isActive: true },
      { email: "anna.content@shopify.com", password: staffPassword, name: "Anna Content", role: "STAFF", isActive: true },
      { email: "robert.shipping@shopify.com", password: staffPassword, name: "Robert Shipping", role: "STAFF", isActive: true },
      { email: "jennifer.cs@shopify.com", password: staffPassword, name: "Jennifer CS", role: "STAFF", isActive: true },
      { email: "chris.inventory@shopify.com", password: staffPassword, name: "Chris Inventory", role: "STAFF", isActive: true },
      { email: "amanda.sales@shopify.com", password: staffPassword, name: "Amanda Sales", role: "STAFF", isActive: true },
      { email: "kevin.viewer@shopify.com", password: staffPassword, name: "Kevin Viewer", role: "VIEWER", isActive: true },
      { email: "melissa.viewer@shopify.com", password: staffPassword, name: "Melissa Viewer", role: "VIEWER", isActive: true },
      { email: "inactive.user@shopify.com", password: staffPassword, name: "Inactive User", role: "STAFF", isActive: false },
    ]
  })

  // ============================================
  // LOCATIONS (15+ warehouse locations)
  // ============================================
  console.log("Creating locations...")
  const locations = await Promise.all([
    prisma.location.create({ data: { name: "Main Warehouse", address1: "123 Commerce St", city: "New York", state: "NY", postalCode: "10001", country: "US", isDefault: true, isActive: true } }),
    prisma.location.create({ data: { name: "West Coast Hub", address1: "456 Pacific Ave", city: "Los Angeles", state: "CA", postalCode: "90001", country: "US", isActive: true } }),
    prisma.location.create({ data: { name: "Central Distribution", address1: "789 Central Blvd", city: "Chicago", state: "IL", postalCode: "60601", country: "US", isActive: true } }),
    prisma.location.create({ data: { name: "Southeast Fulfillment", address1: "321 Peachtree St", city: "Atlanta", state: "GA", postalCode: "30301", country: "US", isActive: true } }),
    prisma.location.create({ data: { name: "Texas Depot", address1: "555 Longhorn Rd", city: "Dallas", state: "TX", postalCode: "75201", country: "US", isActive: true } }),
    prisma.location.create({ data: { name: "Pacific Northwest", address1: "888 Pine St", city: "Seattle", state: "WA", postalCode: "98101", country: "US", isActive: true } }),
    prisma.location.create({ data: { name: "Mountain Region", address1: "444 Mountain View Dr", city: "Denver", state: "CO", postalCode: "80201", country: "US", isActive: true } }),
    prisma.location.create({ data: { name: "Florida Hub", address1: "222 Ocean Blvd", city: "Miami", state: "FL", postalCode: "33101", country: "US", isActive: true } }),
    prisma.location.create({ data: { name: "New England Center", address1: "111 Harbor Way", city: "Boston", state: "MA", postalCode: "02101", country: "US", isActive: true } }),
    prisma.location.create({ data: { name: "Midwest Warehouse", address1: "333 Lake Shore Dr", city: "Cleveland", state: "OH", postalCode: "44101", country: "US", isActive: true } }),
    prisma.location.create({ data: { name: "Southwest Station", address1: "666 Desert Rd", city: "Phoenix", state: "AZ", postalCode: "85001", country: "US", isActive: true } }),
    prisma.location.create({ data: { name: "Carolina Depot", address1: "777 Tobacco Rd", city: "Charlotte", state: "NC", postalCode: "28201", country: "US", isActive: true } }),
    prisma.location.create({ data: { name: "Canada Warehouse", address1: "100 Maple Ave", city: "Toronto", state: "ON", postalCode: "M5H 2N2", country: "CA", isActive: true } }),
    prisma.location.create({ data: { name: "UK Distribution", address1: "50 Oxford St", city: "London", postalCode: "W1D 1BS", country: "GB", isActive: true } }),
    prisma.location.create({ data: { name: "Returns Processing", address1: "999 Return Ln", city: "Nashville", state: "TN", postalCode: "37201", country: "US", isActive: true } }),
    prisma.location.create({ data: { name: "Overflow Storage", address1: "101 Extra Space Rd", city: "Portland", state: "OR", postalCode: "97201", country: "US", isActive: false } }),
  ])

  // ============================================
  // SHIPPING ZONES (15+ shipping zones with rates)
  // ============================================
  console.log("Creating shipping zones...")
  await prisma.shippingZone.create({
    data: { name: "US - East Coast", countries: ["US"], states: ["NY", "NJ", "CT", "MA", "PA", "ME", "VT", "NH", "RI"], postalCodes: [], isDefault: true,
      rates: { create: [
        { name: "Standard Shipping", price: 5.99, type: "FLAT", estimatedDays: "5-7 days" },
        { name: "Express Shipping", price: 12.99, type: "FLAT", estimatedDays: "2-3 days" },
        { name: "Free Shipping", price: 0, type: "FREE", minOrderAmount: 50, estimatedDays: "5-7 days" },
        { name: "Next Day", price: 24.99, type: "FLAT", estimatedDays: "1 day" }
      ]}
    }
  })
  await prisma.shippingZone.create({
    data: { name: "US - West Coast", countries: ["US"], states: ["CA", "OR", "WA", "NV", "AZ"], postalCodes: [],
      rates: { create: [
        { name: "Standard Shipping", price: 6.99, type: "FLAT", estimatedDays: "5-7 days" },
        { name: "Express Shipping", price: 14.99, type: "FLAT", estimatedDays: "2-3 days" },
        { name: "Free Shipping", price: 0, type: "FREE", minOrderAmount: 75, estimatedDays: "5-7 days" }
      ]}
    }
  })
  await prisma.shippingZone.create({
    data: { name: "US - Midwest", countries: ["US"], states: ["IL", "OH", "MI", "IN", "WI", "MN", "IA", "MO"], postalCodes: [],
      rates: { create: [
        { name: "Standard Shipping", price: 5.49, type: "FLAT", estimatedDays: "4-6 days" },
        { name: "Express Shipping", price: 11.99, type: "FLAT", estimatedDays: "2-3 days" }
      ]}
    }
  })
  await prisma.shippingZone.create({
    data: { name: "US - South", countries: ["US"], states: ["TX", "FL", "GA", "NC", "SC", "VA", "TN", "AL", "LA"], postalCodes: [],
      rates: { create: [
        { name: "Standard Shipping", price: 5.99, type: "FLAT", estimatedDays: "5-7 days" },
        { name: "Express Shipping", price: 13.99, type: "FLAT", estimatedDays: "2-3 days" }
      ]}
    }
  })
  await prisma.shippingZone.create({
    data: { name: "Canada", countries: ["CA"], states: [], postalCodes: [],
      rates: { create: [
        { name: "International Standard", price: 14.99, type: "FLAT", estimatedDays: "7-10 days" },
        { name: "International Express", price: 29.99, type: "FLAT", estimatedDays: "3-5 days" }
      ]}
    }
  })
  await prisma.shippingZone.create({
    data: { name: "UK & Ireland", countries: ["GB", "IE"], states: [], postalCodes: [],
      rates: { create: [
        { name: "International Standard", price: 19.99, type: "FLAT", estimatedDays: "10-14 days" },
        { name: "International Express", price: 39.99, type: "FLAT", estimatedDays: "5-7 days" }
      ]}
    }
  })
  await prisma.shippingZone.create({
    data: { name: "Europe", countries: ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "CH"], states: [], postalCodes: [],
      rates: { create: [
        { name: "Standard Shipping", price: 24.99, type: "FLAT", estimatedDays: "10-14 days" },
        { name: "Express Shipping", price: 49.99, type: "FLAT", estimatedDays: "5-7 days" }
      ]}
    }
  })
  await prisma.shippingZone.create({
    data: { name: "Australia & NZ", countries: ["AU", "NZ"], states: [], postalCodes: [],
      rates: { create: [
        { name: "International Standard", price: 29.99, type: "FLAT", estimatedDays: "14-21 days" },
        { name: "International Express", price: 59.99, type: "FLAT", estimatedDays: "7-10 days" }
      ]}
    }
  })
  // 7 more zones to reach 15+
  const moreZones = [
    { name: "Japan", countries: ["JP"] },
    { name: "South Korea", countries: ["KR"] },
    { name: "Singapore & Malaysia", countries: ["SG", "MY"] },
    { name: "Mexico", countries: ["MX"] },
    { name: "Brazil", countries: ["BR"] },
    { name: "India", countries: ["IN"] },
    { name: "Middle East", countries: ["AE", "SA", "QA"] },
  ]
  for (const zone of moreZones) {
    await prisma.shippingZone.create({
      data: { name: zone.name, countries: zone.countries, states: [], postalCodes: [],
        rates: { create: [
          { name: "Standard Shipping", price: 29.99, type: "FLAT", estimatedDays: "14-21 days" },
          { name: "Express Shipping", price: 59.99, type: "FLAT", estimatedDays: "7-10 days" }
        ]}
      }
    })
  }

  // ============================================
  // TAX RATES (15+ tax rates)
  // ============================================
  console.log("Creating tax rates...")
  await prisma.taxRate.createMany({
    data: [
      { name: "California Sales Tax", country: "US", state: "CA", rate: 0.0725, isActive: true },
      { name: "New York Sales Tax", country: "US", state: "NY", rate: 0.08, isActive: true },
      { name: "Texas Sales Tax", country: "US", state: "TX", rate: 0.0625, isActive: true },
      { name: "Florida Sales Tax", country: "US", state: "FL", rate: 0.06, isActive: true },
      { name: "Illinois Sales Tax", country: "US", state: "IL", rate: 0.0625, isActive: true },
      { name: "Pennsylvania Sales Tax", country: "US", state: "PA", rate: 0.06, isActive: true },
      { name: "Ohio Sales Tax", country: "US", state: "OH", rate: 0.0575, isActive: true },
      { name: "Georgia Sales Tax", country: "US", state: "GA", rate: 0.04, isActive: true },
      { name: "North Carolina Sales Tax", country: "US", state: "NC", rate: 0.0475, isActive: true },
      { name: "Michigan Sales Tax", country: "US", state: "MI", rate: 0.06, isActive: true },
      { name: "Washington Sales Tax", country: "US", state: "WA", rate: 0.065, isActive: true },
      { name: "Arizona Sales Tax", country: "US", state: "AZ", rate: 0.056, isActive: true },
      { name: "Colorado Sales Tax", country: "US", state: "CO", rate: 0.029, isActive: true },
      { name: "UK VAT", country: "GB", rate: 0.20, isActive: true },
      { name: "Canada GST", country: "CA", rate: 0.05, isActive: true },
      { name: "Germany VAT", country: "DE", rate: 0.19, isActive: true },
      { name: "France VAT", country: "FR", rate: 0.20, isActive: true },
      { name: "Japan Consumption Tax", country: "JP", rate: 0.10, isActive: true },
    ]
  })

  // ============================================
  // CATEGORIES (15+ categories)
  // ============================================
  console.log("Creating categories...")
  const parentCategories = await Promise.all([
    prisma.category.create({ data: { name: "Clothing", slug: "clothing", description: "All clothing items", position: 1 } }),
    prisma.category.create({ data: { name: "Shoes", slug: "shoes", description: "Footwear for all occasions", position: 2 } }),
    prisma.category.create({ data: { name: "Accessories", slug: "accessories", description: "Complete your look", position: 3 } }),
    prisma.category.create({ data: { name: "Bags", slug: "bags", description: "Bags and backpacks", position: 4 } }),
    prisma.category.create({ data: { name: "Jewelry", slug: "jewelry", description: "Fine and fashion jewelry", position: 5 } }),
    prisma.category.create({ data: { name: "Activewear", slug: "activewear", description: "Sports and fitness", position: 6 } }),
  ])

  // Sub-categories
  await prisma.category.createMany({
    data: [
      { name: "T-Shirts", slug: "t-shirts", description: "Casual tees", parentId: parentCategories[0].id, position: 1 },
      { name: "Jeans", slug: "jeans", description: "Denim jeans", parentId: parentCategories[0].id, position: 2 },
      { name: "Dresses", slug: "dresses", description: "All dresses", parentId: parentCategories[0].id, position: 3 },
      { name: "Outerwear", slug: "outerwear", description: "Coats and jackets", parentId: parentCategories[0].id, position: 4 },
      { name: "Sweaters", slug: "sweaters", description: "Knitwear", parentId: parentCategories[0].id, position: 5 },
      { name: "Sneakers", slug: "sneakers", description: "Casual sneakers", parentId: parentCategories[1].id, position: 1 },
      { name: "Boots", slug: "boots", description: "All boots", parentId: parentCategories[1].id, position: 2 },
      { name: "Watches", slug: "watches", description: "Timepieces", parentId: parentCategories[2].id, position: 1 },
      { name: "Sunglasses", slug: "sunglasses", description: "Eyewear", parentId: parentCategories[2].id, position: 2 },
    ]
  })

  // ============================================
  // PRODUCTS (54+ products)
  // ============================================
  console.log("Creating products...")
  const products = []
  for (let i = 0; i < productData.length; i++) {
    const data = productData[i]
    const baseSlug = slugify(data.title)
    const product = await prisma.product.create({
      data: {
        title: data.title,
        slug: `${baseSlug}-${i + 1}`,
        description: `High-quality ${data.title.toLowerCase()} from ${data.vendor}. Perfect for any occasion. Made with premium materials for lasting comfort and style.`,
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

    // Create inventory for each variant at first 3 locations
    for (const variant of product.variants) {
      for (let l = 0; l < Math.min(3, locations.length); l++) {
        await prisma.inventory.create({
          data: {
            variantId: variant.id,
            locationId: locations[l].id,
            quantity: randomInt(0, 50)
          }
        })
      }
    }
  }

  // ============================================
  // COLLECTIONS (15+ collections)
  // ============================================
  console.log("Creating collections...")
  const collections = await Promise.all([
    prisma.collection.create({ data: { title: "New Arrivals", slug: "new-arrivals", description: "Check out our latest products", type: "MANUAL", published: true, image: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800" } }),
    prisma.collection.create({ data: { title: "Best Sellers", slug: "best-sellers", description: "Our most popular items", type: "MANUAL", published: true, image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800" } }),
    prisma.collection.create({ data: { title: "Summer Collection", slug: "summer-collection", description: "Beat the heat with our summer styles", type: "MANUAL", published: true, image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800" } }),
    prisma.collection.create({ data: { title: "Winter Essentials", slug: "winter-essentials", description: "Stay warm and stylish", type: "MANUAL", published: true, image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800" } }),
    prisma.collection.create({ data: { title: "Sale", slug: "sale", description: "Great deals on selected items", type: "MANUAL", published: true, image: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=800" } }),
    prisma.collection.create({ data: { title: "Premium Selection", slug: "premium-selection", description: "Luxury items for discerning shoppers", type: "MANUAL", published: true } }),
    prisma.collection.create({ data: { title: "Eco-Friendly", slug: "eco-friendly", description: "Sustainable and eco-conscious products", type: "MANUAL", published: true } }),
    prisma.collection.create({ data: { title: "Office Wear", slug: "office-wear", description: "Professional attire for the workplace", type: "MANUAL", published: true } }),
    prisma.collection.create({ data: { title: "Weekend Casual", slug: "weekend-casual", description: "Relaxed styles for days off", type: "MANUAL", published: true } }),
    prisma.collection.create({ data: { title: "Athletic Gear", slug: "athletic-gear", description: "Performance wear for active lifestyles", type: "MANUAL", published: true } }),
    prisma.collection.create({ data: { title: "Date Night", slug: "date-night", description: "Elegant outfits for special occasions", type: "MANUAL", published: true } }),
    prisma.collection.create({ data: { title: "Gifts Under $50", slug: "gifts-under-50", description: "Affordable gift ideas", type: "AUTOMATED", published: true, rules: { maxPrice: 50 } } }),
    prisma.collection.create({ data: { title: "Gifts Under $100", slug: "gifts-under-100", description: "Mid-range gift ideas", type: "AUTOMATED", published: true, rules: { maxPrice: 100 } } }),
    prisma.collection.create({ data: { title: "Trending Now", slug: "trending-now", description: "Currently trending items", type: "MANUAL", published: true } }),
    prisma.collection.create({ data: { title: "Staff Picks", slug: "staff-picks", description: "Handpicked by our team", type: "MANUAL", published: true } }),
    prisma.collection.create({ data: { title: "Back to School", slug: "back-to-school", description: "Essentials for the new school year", type: "MANUAL", published: false } }),
  ])

  // Add products to collections
  for (const collection of collections) {
    const numProducts = randomInt(5, 15)
    const shuffled = [...products].sort(() => 0.5 - Math.random())
    for (let i = 0; i < numProducts && i < shuffled.length; i++) {
      await prisma.collectionProduct.create({
        data: { collectionId: collection.id, productId: shuffled[i].id, position: i }
      })
    }
  }

  // ============================================
  // CUSTOMERS (80+ customers)
  // ============================================
  console.log("Creating customers...")
  const customers = []
  const customerPassword = await bcrypt.hash(requireDemoPassword(), 10)

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

    // Create customer accounts for first 20 customers (for auth features)
    if (i < 20) {
      await prisma.customerAccount.create({
        data: {
          customerId: customer.id,
          email: customer.email,
          password: customerPassword,
          emailVerified: i < 15, // First 15 are verified
          verifyToken: i >= 15 ? `verify-token-${i}` : null,
        }
      })
    }
  }

  // ============================================
  // DISCOUNTS (15+ discount codes)
  // ============================================
  console.log("Creating discounts...")
  const discounts = await Promise.all([
    prisma.discount.create({ data: { code: "WELCOME10", type: "PERCENTAGE", value: 10, usageLimit: 1000, onePerCustomer: true, startDate: new Date(), status: "ACTIVE" } }),
    prisma.discount.create({ data: { code: "SAVE20", type: "PERCENTAGE", value: 20, minPurchaseAmount: 100, startDate: new Date(), status: "ACTIVE" } }),
    prisma.discount.create({ data: { code: "FLAT15", type: "FIXED_AMOUNT", value: 15, minPurchaseAmount: 75, startDate: new Date(), status: "ACTIVE" } }),
    prisma.discount.create({ data: { code: "FREESHIP", type: "FREE_SHIPPING", value: 0, minPurchaseAmount: 50, startDate: new Date(), status: "ACTIVE" } }),
    prisma.discount.create({ data: { code: "SUMMER25", type: "PERCENTAGE", value: 25, usageLimit: 500, startDate: new Date(), endDate: new Date(Date.now() + 90 * 86400000), status: "ACTIVE" } }),
    prisma.discount.create({ data: { code: "VIP30", type: "PERCENTAGE", value: 30, minPurchaseAmount: 200, onePerCustomer: true, startDate: new Date(), status: "ACTIVE" } }),
    prisma.discount.create({ data: { code: "NEWYEAR15", type: "PERCENTAGE", value: 15, startDate: new Date(), endDate: new Date(Date.now() + 30 * 86400000), status: "ACTIVE" } }),
    prisma.discount.create({ data: { code: "FLASH50", type: "FIXED_AMOUNT", value: 50, minPurchaseAmount: 200, usageLimit: 100, startDate: new Date(), endDate: new Date(Date.now() + 7 * 86400000), status: "ACTIVE" } }),
    prisma.discount.create({ data: { code: "LOYALTY5", type: "PERCENTAGE", value: 5, onePerCustomer: false, startDate: new Date(), status: "ACTIVE" } }),
    prisma.discount.create({ data: { code: "FREESHIP100", type: "FREE_SHIPPING", value: 0, minPurchaseAmount: 100, startDate: new Date(), status: "ACTIVE" } }),
    prisma.discount.create({ data: { code: "STUDENT15", type: "PERCENTAGE", value: 15, onePerCustomer: true, startDate: new Date(), status: "ACTIVE" } }),
    prisma.discount.create({ data: { code: "BDAY20", type: "PERCENTAGE", value: 20, onePerCustomer: true, usageLimit: 1, startDate: new Date(), status: "ACTIVE" } }),
    prisma.discount.create({ data: { code: "EXPIRED10", type: "PERCENTAGE", value: 10, startDate: new Date(Date.now() - 60 * 86400000), endDate: new Date(Date.now() - 30 * 86400000), status: "EXPIRED" } }),
    prisma.discount.create({ data: { code: "DISABLED5", type: "FIXED_AMOUNT", value: 5, startDate: new Date(), status: "DISABLED" } }),
    prisma.discount.create({ data: { code: "FUTURE20", type: "PERCENTAGE", value: 20, startDate: new Date(Date.now() + 30 * 86400000), endDate: new Date(Date.now() + 60 * 86400000), status: "SCHEDULED" } }),
    prisma.discount.create({ data: { code: "BULK10", type: "PERCENTAGE", value: 10, minPurchaseQuantity: 5, startDate: new Date(), status: "ACTIVE" } }),
  ])

  // ============================================
  // GIFT CARDS (15+ gift cards)
  // ============================================
  console.log("Creating gift cards...")
  const giftCardValues = [25, 50, 75, 100, 150, 200, 250, 500]
  for (let i = 0; i < 18; i++) {
    const value = randomElement(giftCardValues)
    const usedAmount = Math.random() > 0.5 ? randomInt(0, Math.floor(value * 0.8)) : 0
    await prisma.giftCard.create({
      data: {
        code: generateGiftCardCode(),
        initialValue: value,
        balance: value - usedAmount,
        isActive: i < 15,
        recipientEmail: `recipient${i}@example.com`,
        recipientName: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
        senderName: i < 5 ? "Store Team" : `${randomElement(firstNames)} ${randomElement(lastNames)}`,
        message: randomElement(["Enjoy your gift!", "Happy Birthday!", "Happy Holidays!", "Congratulations!", "Thank you!", "Just because!"]),
        expiresAt: i < 3 ? null : new Date(Date.now() + randomInt(30, 365) * 86400000),
      }
    })
  }

  // ============================================
  // ORDERS (200+ orders)
  // ============================================
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
              type: "paid", message: "Payment received",
              createdAt: new Date(createdAt.getTime() + randomInt(1, 24) * 3600000)
            }] : []),
            ...(fulfillmentStatus === "FULFILLED" ? [{
              type: "fulfilled", message: "Order fulfilled",
              createdAt: new Date(createdAt.getTime() + randomInt(24, 72) * 3600000)
            }] : [])
          ]
        }
      }
    })

    await prisma.customer.update({
      where: { id: customer.id },
      data: { totalOrders: { increment: 1 }, totalSpent: { increment: total } }
    })
  }

  // ============================================
  // REVIEWS (150+ reviews)
  // ============================================
  console.log("Creating reviews...")
  const reviewTitles = ["Great product!", "Love it!", "Good quality", "Excellent!", "Highly recommend", "Decent", "Not bad", "Amazing value", "Perfect fit", "Beautiful design", "Worth every penny", "Exceeded expectations", "Solid purchase", "Very comfortable", "Best I've owned", "Impressed"]
  const reviewContents = [
    "This product exceeded my expectations. Great quality and fast shipping!",
    "Very happy with this purchase. Would buy again!",
    "Exactly what I was looking for. Perfect fit and great value.",
    "Amazing quality for the price. Highly recommended!",
    "Great product, fast delivery, and excellent customer service.",
    "The material is top-notch. Feels premium and looks great.",
    "Comfortable and stylish. Gets compliments every time I wear it.",
    "Good product overall, minor stitching issue but otherwise perfect.",
    "Been using it for a month now and it holds up well.",
    "Color is exactly as shown in the photos. Very satisfied.",
    "Quick delivery and well-packaged. The product itself is excellent.",
    "Fits true to size. Very pleased with the quality.",
    "Great addition to my wardrobe. Works with many outfits.",
    "Durable and well-made. You can tell it's quality craftsmanship.",
    "Bought this as a gift and the recipient loved it!",
  ]

  for (let i = 0; i < 150; i++) {
    const product = randomElement(products)
    const customer = randomElement(customers)

    await prisma.review.create({
      data: {
        productId: product.id,
        customerId: customer.id,
        authorName: `${customer.firstName} ${customer.lastName}`,
        authorEmail: customer.email,
        rating: randomInt(1, 5),
        title: randomElement(reviewTitles),
        content: randomElement(reviewContents),
        isVerified: Math.random() > 0.3,
        isApproved: Math.random() > 0.2,
        helpfulCount: randomInt(0, 50),
        response: Math.random() > 0.8 ? "Thank you for your review! We're glad you love it." : null,
        respondedAt: Math.random() > 0.8 ? new Date() : null,
        createdAt: randomDate(oneYearAgo, new Date())
      }
    })
  }

  // ============================================
  // BLOG POSTS (15+ posts)
  // ============================================
  console.log("Creating blog posts...")
  await prisma.blogPost.createMany({
    data: [
      { title: "Summer Fashion Trends 2024", slug: "summer-fashion-trends-2024", excerpt: "Discover the hottest fashion trends for this summer season.", content: "This summer is all about bold colors, sustainable fabrics, and comfortable silhouettes. From oversized linen shirts to minimalist sneakers, here's everything you need to know about staying stylish in the heat.", author: "Fashion Team", status: "PUBLISHED", tags: ["fashion", "summer", "trends"], publishedAt: new Date() },
      { title: "How to Care for Your Leather Products", slug: "how-to-care-for-leather-products", excerpt: "Essential tips for maintaining your leather goods.", content: "Leather products require special care to maintain their quality and longevity. Here are our top tips for keeping your leather items looking their best.", author: "Care Guide Team", status: "PUBLISHED", tags: ["leather", "care", "tips"], publishedAt: new Date() },
      { title: "Sustainable Fashion: Our Commitment", slug: "sustainable-fashion-our-commitment", excerpt: "Learn about our journey towards sustainable fashion.", content: "Sustainability is at the heart of everything we do. Discover how we're making a difference in the fashion industry through eco-friendly materials and ethical manufacturing.", author: "Sustainability Team", status: "PUBLISHED", tags: ["sustainability", "eco-friendly"], publishedAt: new Date() },
      { title: "The Ultimate Guide to Denim", slug: "ultimate-guide-to-denim", excerpt: "Everything you need to know about finding the perfect jeans.", content: "From raw selvedge to stretch denim, this comprehensive guide covers all aspects of finding, wearing, and caring for your perfect pair of jeans.", author: "Denim Expert", status: "PUBLISHED", tags: ["denim", "jeans", "guide"], publishedAt: new Date() },
      { title: "Capsule Wardrobe Essentials", slug: "capsule-wardrobe-essentials", excerpt: "Build a versatile wardrobe with just 30 pieces.", content: "A capsule wardrobe is the key to effortless style. Learn how to curate a collection of versatile pieces that work together for any occasion.", author: "Style Team", status: "PUBLISHED", tags: ["wardrobe", "minimalism", "style"], publishedAt: new Date() },
      { title: "Athleisure: From Gym to Street", slug: "athleisure-gym-to-street", excerpt: "How to master the athleisure look.", content: "Athleisure continues to dominate fashion. Here's how to style your workout gear for everyday wear without looking like you just left the gym.", author: "Fashion Team", status: "PUBLISHED", tags: ["athleisure", "activewear", "style"], publishedAt: new Date() },
      { title: "Gift Guide: Holiday Shopping Made Easy", slug: "gift-guide-holiday-shopping", excerpt: "Find the perfect gift for everyone on your list.", content: "Holiday shopping doesn't have to be stressful. Our curated gift guide has something for everyone, from budget-friendly accessories to luxe splurges.", author: "Editorial Team", status: "PUBLISHED", tags: ["gifts", "holiday", "shopping"], publishedAt: new Date() },
      { title: "Color Theory in Fashion", slug: "color-theory-in-fashion", excerpt: "Understanding color combinations for better outfits.", content: "Mastering color theory can transform your wardrobe. Learn about complementary colors, monochromatic looks, and how to use color to express your personal style.", author: "Design Team", status: "PUBLISHED", tags: ["color", "design", "style"], publishedAt: new Date() },
      { title: "Shoe Care 101", slug: "shoe-care-101", excerpt: "Keep your footwear looking fresh.", content: "From sneaker cleaning to leather conditioning, this guide covers everything you need to know about maintaining your shoe collection.", author: "Care Guide Team", status: "PUBLISHED", tags: ["shoes", "care", "maintenance"], publishedAt: new Date() },
      { title: "Layering Like a Pro", slug: "layering-like-a-pro", excerpt: "Master the art of layering for all seasons.", content: "Layering is an essential skill for creating dynamic, adaptable outfits. Whether it's transitional weather or winter cold, learn techniques for stylish layering.", author: "Style Team", status: "PUBLISHED", tags: ["layering", "style", "seasonal"], publishedAt: new Date() },
      { title: "Behind the Scenes: Our Design Process", slug: "behind-the-scenes-design-process", excerpt: "A look at how our products are made.", content: "From initial sketches to final products, take a behind-the-scenes look at our design and manufacturing process.", author: "Design Team", status: "PUBLISHED", tags: ["design", "behind-the-scenes", "process"], publishedAt: new Date() },
      { title: "Accessorizing 101", slug: "accessorizing-101", excerpt: "The right accessories can make or break an outfit.", content: "Learn the fundamentals of accessorizing, from choosing the right watch to matching your belt with your shoes.", author: "Fashion Team", status: "PUBLISHED", tags: ["accessories", "style", "tips"], publishedAt: new Date() },
      { title: "Fall Fashion Preview", slug: "fall-fashion-preview", excerpt: "What's coming for the fall season.", content: "Get a sneak peek at the fall fashion trends we're excited about. Expect rich earth tones, cozy textures, and statement outerwear.", author: "Fashion Team", status: "DRAFT", tags: ["fall", "preview", "trends"] },
      { title: "Workout Wear Guide", slug: "workout-wear-guide", excerpt: "Choosing the right gear for your fitness routine.", content: "Not all workout clothes are created equal. This guide helps you choose the right fabrics, fits, and features for your specific fitness activities.", author: "Fitness Team", status: "PUBLISHED", tags: ["workout", "activewear", "fitness"], publishedAt: new Date() },
      { title: "The History of Streetwear", slug: "history-of-streetwear", excerpt: "How streetwear became mainstream fashion.", content: "From underground subculture to high fashion runways, explore the fascinating evolution of streetwear and its impact on modern fashion.", author: "Culture Team", status: "PUBLISHED", tags: ["streetwear", "history", "culture"], publishedAt: new Date() },
      { title: "Upcoming: Spring Collection Launch", slug: "spring-collection-launch", excerpt: "New spring collection arriving soon.", content: "We're excited to announce our upcoming spring collection. Stay tuned for fresh colors, lightweight fabrics, and exciting new designs.", author: "Marketing Team", status: "DRAFT", tags: ["spring", "new-collection", "launch"] },
    ]
  })

  // ============================================
  // PAGES (15+ CMS pages)
  // ============================================
  console.log("Creating pages...")
  await prisma.page.createMany({
    data: [
      { title: "About Us", slug: "about-us", content: "We are a leading fashion retailer committed to bringing you the best in style and quality. Founded in 2020, we've grown to serve customers worldwide with a focus on sustainable practices and exceptional customer service.", status: "PUBLISHED", publishedAt: new Date() },
      { title: "Contact Us", slug: "contact-us", content: "Get in touch with us! Email: support@store.com, Phone: 1-800-FASHION. Our customer service team is available Monday through Friday, 9 AM to 6 PM EST.", status: "PUBLISHED", publishedAt: new Date() },
      { title: "Shipping Policy", slug: "shipping-policy", content: "Free shipping on orders over $50. Standard shipping takes 5-7 business days. Express shipping available for an additional fee. International shipping available to select countries.", status: "PUBLISHED", publishedAt: new Date() },
      { title: "Returns & Refunds", slug: "returns-refunds", content: "We offer a 30-day return policy on all items. Items must be unworn with original tags attached. Refunds are processed within 5-7 business days of receiving the return.", status: "PUBLISHED", publishedAt: new Date() },
      { title: "Privacy Policy", slug: "privacy-policy", content: "Your privacy is important to us. This policy explains how we collect, use, and protect your personal information. We never sell your data to third parties.", status: "PUBLISHED", publishedAt: new Date() },
      { title: "Terms of Service", slug: "terms-of-service", content: "By using our website and purchasing our products, you agree to these terms of service. Please read them carefully before making a purchase.", status: "PUBLISHED", publishedAt: new Date() },
      { title: "FAQ", slug: "faq", content: "Frequently Asked Questions about our products, shipping, returns, and more. Can't find your answer? Contact our support team.", status: "PUBLISHED", publishedAt: new Date() },
      { title: "Size Guide", slug: "size-guide", content: "Find your perfect fit with our comprehensive size guide. Includes measurements for tops, bottoms, shoes, and accessories across all brands.", status: "PUBLISHED", publishedAt: new Date() },
      { title: "Accessibility", slug: "accessibility", content: "We are committed to making our website accessible to all users. If you have difficulty using our site, please contact us for assistance.", status: "PUBLISHED", publishedAt: new Date() },
      { title: "Affiliate Program", slug: "affiliate-program", content: "Join our affiliate program and earn commissions on every sale you refer. Apply today and start earning with one of the best programs in fashion.", status: "PUBLISHED", publishedAt: new Date() },
      { title: "Wholesale Inquiries", slug: "wholesale", content: "Interested in carrying our products? Contact our wholesale team for pricing, minimum order quantities, and partnership opportunities.", status: "PUBLISHED", publishedAt: new Date() },
      { title: "Careers", slug: "careers", content: "Join our growing team! We're always looking for passionate individuals who love fashion. Check our current openings and apply today.", status: "PUBLISHED", publishedAt: new Date() },
      { title: "Press & Media", slug: "press-media", content: "For press inquiries, media assets, and interview requests, please contact our PR team at press@fashionstore.com.", status: "PUBLISHED", publishedAt: new Date() },
      { title: "Gift Cards", slug: "gift-cards", content: "Give the gift of style! Our digital gift cards are perfect for any occasion. Available in denominations from $25 to $500.", status: "PUBLISHED", publishedAt: new Date() },
      { title: "Store Locator", slug: "store-locator", content: "Find a store near you. We have retail locations in major cities across the US. Use our interactive map to find the closest store.", status: "PUBLISHED", publishedAt: new Date() },
      { title: "Sustainability", slug: "sustainability", content: "Learn about our commitment to sustainability, ethical sourcing, and reducing our environmental footprint.", status: "PUBLISHED", publishedAt: new Date() },
    ]
  })

  // ============================================
  // EMAIL TEMPLATES (15+ templates)
  // ============================================
  console.log("Creating email templates...")
  await prisma.emailTemplate.createMany({
    data: [
      { name: "order_confirmation", subject: "Order Confirmation - Order #{{orderNumber}}", body: "Thank you for your order! Your order #{{orderNumber}} has been confirmed. Total: {{orderTotal}}. We'll send you another email when your order ships." },
      { name: "shipping_confirmation", subject: "Your Order Has Shipped - Order #{{orderNumber}}", body: "Great news! Your order #{{orderNumber}} has shipped. Track your package: {{trackingUrl}}" },
      { name: "welcome", subject: "Welcome to Our Store!", body: "Welcome {{firstName}}! We're excited to have you. Use code WELCOME10 for 10% off your first order." },
      { name: "password_reset", subject: "Password Reset Request", body: "We received a request to reset your password. Click here to create a new password: {{resetUrl}}. This link expires in 1 hour." },
      { name: "email_verification", subject: "Verify Your Email Address", body: "Hi {{firstName}}, please verify your email address by clicking this link: {{verifyUrl}}" },
      { name: "order_cancelled", subject: "Order Cancelled - Order #{{orderNumber}}", body: "Your order #{{orderNumber}} has been cancelled. If you didn't request this, please contact us." },
      { name: "refund_confirmation", subject: "Refund Processed - Order #{{orderNumber}}", body: "Your refund of {{refundAmount}} for order #{{orderNumber}} has been processed. It may take 5-7 days to appear." },
      { name: "abandoned_cart", subject: "You left something behind!", body: "Hi {{firstName}}, you have items waiting in your cart. Complete your purchase before they're gone!" },
      { name: "back_in_stock", subject: "{{productName}} is Back in Stock!", body: "Good news! {{productName}} is back in stock. Grab it before it sells out again!" },
      { name: "review_request", subject: "How was your purchase?", body: "Hi {{firstName}}, we'd love to hear about your experience with {{productName}}. Leave a review!" },
      { name: "birthday", subject: "Happy Birthday! Here's a Gift!", body: "Happy Birthday {{firstName}}! Enjoy 20% off with code BDAY20." },
      { name: "loyalty_reward", subject: "You've Earned a Reward!", body: "Congratulations {{firstName}}! You've earned a loyalty reward. Check your account for details." },
      { name: "newsletter", subject: "This Week's Style Picks", body: "Check out this week's curated selection of new arrivals and trending items." },
      { name: "order_delivered", subject: "Your Order Has Been Delivered!", body: "Your order #{{orderNumber}} has been delivered. We hope you love it!" },
      { name: "gift_card", subject: "You've Received a Gift Card!", body: "{{senderName}} sent you a gift card worth {{amount}}! Use code: {{giftCardCode}}" },
      { name: "account_deactivation", subject: "Account Deactivation Notice", body: "Your account has been deactivated. If this was a mistake, please contact support." },
    ]
  })

  // ============================================
  // WEBHOOKS (15+ webhooks)
  // ============================================
  console.log("Creating webhooks...")
  const webhookEvents = [
    { name: "Order Created Webhook", events: ["order.created"], url: "https://hooks.example.com/orders/created" },
    { name: "Order Paid Webhook", events: ["order.paid"], url: "https://hooks.example.com/orders/paid" },
    { name: "Order Fulfilled Webhook", events: ["order.fulfilled"], url: "https://hooks.example.com/orders/fulfilled" },
    { name: "Order Cancelled Webhook", events: ["order.cancelled"], url: "https://hooks.example.com/orders/cancelled" },
    { name: "Product Created Webhook", events: ["product.created"], url: "https://hooks.example.com/products/created" },
    { name: "Product Updated Webhook", events: ["product.updated"], url: "https://hooks.example.com/products/updated" },
    { name: "Product Deleted Webhook", events: ["product.deleted"], url: "https://hooks.example.com/products/deleted" },
    { name: "Customer Created Webhook", events: ["customer.created"], url: "https://hooks.example.com/customers/created" },
    { name: "Customer Updated Webhook", events: ["customer.updated"], url: "https://hooks.example.com/customers/updated" },
    { name: "Inventory Updated Webhook", events: ["inventory.updated"], url: "https://hooks.example.com/inventory/updated" },
    { name: "Refund Created Webhook", events: ["refund.created"], url: "https://hooks.example.com/refunds/created" },
    { name: "Checkout Completed Webhook", events: ["checkout.completed"], url: "https://hooks.example.com/checkout/completed" },
    { name: "Slack Notification", events: ["order.created", "order.paid"], url: "https://hooks.slack.com/services/T00/B00/XXX" },
    { name: "Analytics Tracker", events: ["order.created", "checkout.completed", "product.viewed"], url: "https://analytics.example.com/webhook" },
    { name: "CRM Sync", events: ["customer.created", "customer.updated", "order.created"], url: "https://crm.example.com/webhook" },
    { name: "Inactive Webhook", events: ["order.created"], url: "https://old.example.com/webhook" },
  ]

  for (let i = 0; i < webhookEvents.length; i++) {
    await prisma.webhook.create({
      data: {
        name: webhookEvents[i].name,
        url: webhookEvents[i].url,
        events: webhookEvents[i].events,
        isActive: i < 15,
        failCount: i === 15 ? 5 : 0,
      }
    })
  }

  // ============================================
  // MARKETING CAMPAIGNS (15+ campaigns)
  // ============================================
  console.log("Creating marketing campaigns...")
  const campaignData = [
    { name: "Welcome Series", subject: "Welcome to Our Store!", status: "SENT" as const, type: "EMAIL" as const, recipientCount: 150, openCount: 89, clickCount: 34 },
    { name: "Summer Sale 2024", subject: "Up to 50% Off Summer Styles", status: "SENT" as const, type: "EMAIL" as const, recipientCount: 500, openCount: 245, clickCount: 89 },
    { name: "Holiday Gift Guide", subject: "Find the Perfect Gift", status: "SENT" as const, type: "EMAIL" as const, recipientCount: 800, openCount: 412, clickCount: 156 },
    { name: "Flash Sale Alert", subject: "24 Hours Only - 40% Off Everything", status: "SENT" as const, type: "EMAIL" as const, recipientCount: 600, openCount: 378, clickCount: 201 },
    { name: "New Arrivals Alert", subject: "Fresh Drops Just Landed", status: "SENT" as const, type: "EMAIL" as const, recipientCount: 450, openCount: 198, clickCount: 67 },
    { name: "Loyalty Reward", subject: "You've Earned a Special Reward!", status: "SENT" as const, type: "EMAIL" as const, recipientCount: 200, openCount: 145, clickCount: 78 },
    { name: "Cart Reminder", subject: "You Left Something Behind", status: "SENT" as const, type: "EMAIL" as const, recipientCount: 320, openCount: 156, clickCount: 89 },
    { name: "VIP Early Access", subject: "Exclusive Early Access Sale", status: "SENT" as const, type: "EMAIL" as const, recipientCount: 100, openCount: 67, clickCount: 45 },
    { name: "Winter Collection Launch", subject: "New Winter Collection", status: "SCHEDULED" as const, type: "EMAIL" as const, recipientCount: 700 },
    { name: "Valentine's Day Promo", subject: "Love Is in the Air", status: "DRAFT" as const, type: "EMAIL" as const },
    { name: "SMS: Flash Sale", subject: "Flash Sale: 30% off!", status: "SENT" as const, type: "SMS" as const, recipientCount: 250, openCount: 0, clickCount: 45 },
    { name: "SMS: Order Shipped", subject: "Your order is on its way!", status: "SENT" as const, type: "SMS" as const, recipientCount: 180 },
    { name: "Back to School", subject: "Back to School Essentials", status: "DRAFT" as const, type: "EMAIL" as const },
    { name: "Black Friday Preview", subject: "Black Friday Deals Preview", status: "DRAFT" as const, type: "EMAIL" as const },
    { name: "Review Request", subject: "How Was Your Purchase?", status: "SENT" as const, type: "EMAIL" as const, recipientCount: 400, openCount: 180, clickCount: 56 },
    { name: "Re-engagement", subject: "We Miss You!", status: "SCHEDULED" as const, type: "EMAIL" as const, recipientCount: 300 },
  ]

  for (const campaign of campaignData) {
    await prisma.marketingCampaign.create({
      data: {
        name: campaign.name,
        subject: campaign.subject,
        content: `<h1>${campaign.subject}</h1><p>Email content for ${campaign.name} campaign.</p>`,
        type: campaign.type,
        status: campaign.status,
        recipientCount: campaign.recipientCount || 0,
        openCount: campaign.openCount || 0,
        clickCount: campaign.clickCount || 0,
        sentAt: campaign.status === "SENT" ? randomDate(oneYearAgo, new Date()) : null,
        scheduledAt: campaign.status === "SCHEDULED" ? new Date(Date.now() + randomInt(7, 30) * 86400000) : null,
      }
    })
  }

  // ============================================
  // ABANDONED CART EMAILS (15+ entries)
  // ============================================
  console.log("Creating abandoned cart emails...")
  for (let i = 0; i < 18; i++) {
    const customer = randomElement(customers)
    await prisma.abandonedCartEmail.create({
      data: {
        cartId: `cart-${i}`,
        email: customer.email,
        sentAt: i < 12 ? randomDate(oneYearAgo, new Date()) : null,
        recoveredAt: i < 5 ? randomDate(oneYearAgo, new Date()) : null,
        recoveryOrderId: i < 5 ? `recovered-order-${i}` : null,
      }
    })
  }

  // ============================================
  // STORE SETTINGS (15+ settings)
  // ============================================
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
      { key: "taxIncluded", value: "false" },
      { key: "weightUnit", value: "kg" },
      { key: "orderPrefix", value: "#" },
      { key: "timezone", value: "America/New_York" },
      { key: "dateFormat", value: "MM/DD/YYYY" },
      { key: "socialFacebook", value: "https://facebook.com/fashionstore" },
      { key: "socialInstagram", value: "https://instagram.com/fashionstore" },
      { key: "socialTwitter", value: "https://twitter.com/fashionstore" },
      { key: "googleAnalyticsId", value: "" },
      { key: "metaDescription", value: "Fashion Store - Premium clothing and accessories" },
    ]
  })

  // ============================================
  // CURRENCIES (15+ currencies)
  // ============================================
  console.log("Creating currencies...")
  await prisma.currency.createMany({
    data: [
      { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 1, isDefault: true, isActive: true },
      { code: "EUR", name: "Euro", symbol: "\u20AC", exchangeRate: 0.92, isActive: true },
      { code: "GBP", name: "British Pound", symbol: "\u00A3", exchangeRate: 0.79, isActive: true },
      { code: "CAD", name: "Canadian Dollar", symbol: "C$", exchangeRate: 1.36, isActive: true },
      { code: "AUD", name: "Australian Dollar", symbol: "A$", exchangeRate: 1.53, isActive: true },
      { code: "JPY", name: "Japanese Yen", symbol: "\u00A5", exchangeRate: 149.50, isActive: true },
      { code: "CHF", name: "Swiss Franc", symbol: "CHF", exchangeRate: 0.88, isActive: true },
      { code: "CNY", name: "Chinese Yuan", symbol: "\u00A5", exchangeRate: 7.24, isActive: true },
      { code: "INR", name: "Indian Rupee", symbol: "\u20B9", exchangeRate: 83.12, isActive: true },
      { code: "MXN", name: "Mexican Peso", symbol: "MX$", exchangeRate: 17.15, isActive: true },
      { code: "BRL", name: "Brazilian Real", symbol: "R$", exchangeRate: 4.95, isActive: true },
      { code: "KRW", name: "South Korean Won", symbol: "\u20A9", exchangeRate: 1320.50, isActive: true },
      { code: "SEK", name: "Swedish Krona", symbol: "kr", exchangeRate: 10.45, isActive: true },
      { code: "NOK", name: "Norwegian Krone", symbol: "kr", exchangeRate: 10.85, isActive: true },
      { code: "DKK", name: "Danish Krone", symbol: "kr", exchangeRate: 6.88, isActive: true },
      { code: "SGD", name: "Singapore Dollar", symbol: "S$", exchangeRate: 1.34, isActive: true },
      { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", exchangeRate: 7.82, isActive: false },
    ]
  })

  // ============================================
  // API KEYS (15+ API keys)
  // ============================================
  console.log("Creating API keys...")
  const apiKeyData = [
    { name: "Test API Key", permissions: ["products:read", "products:write", "orders:read", "orders:write", "customers:read", "customers:write", "inventory:read", "inventory:write"] },
    { name: "Mobile App Key", permissions: ["products:read", "orders:read", "orders:write", "customers:read"] },
    { name: "POS System Key", permissions: ["products:read", "orders:read", "orders:write", "inventory:read", "inventory:write"] },
    { name: "Analytics Dashboard", permissions: ["products:read", "orders:read", "customers:read"] },
    { name: "Inventory Sync", permissions: ["inventory:read", "inventory:write", "products:read"] },
    { name: "Shipping Integration", permissions: ["orders:read", "orders:write"] },
    { name: "Email Marketing", permissions: ["customers:read"] },
    { name: "CRM Integration", permissions: ["customers:read", "customers:write", "orders:read"] },
    { name: "Accounting Software", permissions: ["orders:read", "customers:read"] },
    { name: "Website Frontend", permissions: ["products:read"] },
    { name: "Warehouse System", permissions: ["inventory:read", "inventory:write", "orders:read"] },
    { name: "Social Media Plugin", permissions: ["products:read"] },
    { name: "Review Platform", permissions: ["products:read", "orders:read"] },
    { name: "Deprecated Key", permissions: ["products:read"] },
    { name: "Partner API Key", permissions: ["products:read", "orders:read", "customers:read", "inventory:read"] },
    { name: "Staging Environment", permissions: ["products:read", "products:write", "orders:read"] },
  ]

  for (let i = 0; i < apiKeyData.length; i++) {
    await prisma.apiKey.create({
      data: {
        name: apiKeyData[i].name,
        key: `sk_${i < 1 ? "test" : "live"}_${Math.random().toString(36).substring(2, 15)}`,
        secret: Math.random().toString(36).substring(2, 30) + Math.random().toString(36).substring(2, 30),
        permissions: apiKeyData[i].permissions,
        isActive: i !== 13, // "Deprecated Key" is inactive
        expiresAt: i > 12 ? new Date(Date.now() + 365 * 86400000) : null,
      }
    })
  }

  // ============================================
  // ANALYTICS (15+ daily analytics entries)
  // ============================================
  console.log("Creating analytics data...")
  for (let i = 0; i < 30; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    await prisma.analytics.create({
      data: {
        date,
        totalSales: randomInt(500, 5000),
        orderCount: randomInt(5, 30),
        averageOrderValue: randomInt(50, 200),
        itemsSold: randomInt(20, 100),
        newCustomers: randomInt(2, 15),
        returningCustomers: randomInt(5, 20),
      }
    })

    await prisma.dailyAnalytics.create({
      data: {
        date,
        pageViews: randomInt(500, 5000),
        uniqueVisitors: randomInt(200, 2000),
        addToCartCount: randomInt(50, 300),
        checkoutStarted: randomInt(20, 100),
        checkoutCompleted: randomInt(5, 30),
        conversionRate: randomInt(1, 8) / 100,
        averageSessionTime: randomInt(60, 600),
        bounceRate: randomInt(20, 60) / 100,
      }
    })
  }

  // ============================================
  // ANALYTICS EVENTS (15+ events)
  // ============================================
  console.log("Creating analytics events...")
  const eventTypes = ["page_view", "add_to_cart", "checkout_start", "purchase", "product_view", "search", "remove_from_cart", "wishlist_add"]
  for (let i = 0; i < 50; i++) {
    await prisma.analyticsEvent.create({
      data: {
        type: randomElement(eventTypes),
        sessionId: `session-${randomInt(1, 200)}`,
        productId: Math.random() > 0.5 ? randomElement(products).id : null,
        data: { source: randomElement(["organic", "direct", "social", "email", "paid"]) },
        userAgent: randomElement(["Mozilla/5.0 (Windows NT 10.0)", "Mozilla/5.0 (Macintosh)", "Mozilla/5.0 (iPhone)", "Mozilla/5.0 (Linux; Android)"]),
        createdAt: randomDate(new Date(Date.now() - 7 * 86400000), new Date()),
      }
    })
  }

  // ============================================
  // UPLOADS (15+ file uploads)
  // ============================================
  console.log("Creating uploads...")
  const uploadData = [
    { filename: "hero-banner.jpg", originalName: "hero-banner.jpg", mimeType: "image/jpeg", size: 245000, folder: "banners" },
    { filename: "summer-promo.png", originalName: "summer-promotion.png", mimeType: "image/png", size: 189000, folder: "banners" },
    { filename: "product-guide.pdf", originalName: "product-care-guide.pdf", mimeType: "application/pdf", size: 520000, folder: "documents" },
    { filename: "logo.svg", originalName: "store-logo.svg", mimeType: "image/svg+xml", size: 12000, folder: "branding" },
    { filename: "favicon.ico", originalName: "favicon.ico", mimeType: "image/x-icon", size: 4096, folder: "branding" },
    { filename: "team-photo.jpg", originalName: "our-team.jpg", mimeType: "image/jpeg", size: 890000, folder: "about" },
    { filename: "size-chart.png", originalName: "size-chart.png", mimeType: "image/png", size: 156000, folder: "guides" },
    { filename: "shipping-zones.png", originalName: "shipping-map.png", mimeType: "image/png", size: 340000, folder: "guides" },
    { filename: "winter-collection.jpg", originalName: "winter-lookbook.jpg", mimeType: "image/jpeg", size: 1200000, folder: "collections" },
    { filename: "sale-banner.jpg", originalName: "sale-banner-2024.jpg", mimeType: "image/jpeg", size: 320000, folder: "banners" },
    { filename: "gift-card-template.png", originalName: "gift-card.png", mimeType: "image/png", size: 89000, folder: "templates" },
    { filename: "return-label.pdf", originalName: "return-shipping-label.pdf", mimeType: "application/pdf", size: 45000, folder: "documents" },
    { filename: "instagram-feed-1.jpg", originalName: "insta-1.jpg", mimeType: "image/jpeg", size: 210000, folder: "social" },
    { filename: "instagram-feed-2.jpg", originalName: "insta-2.jpg", mimeType: "image/jpeg", size: 195000, folder: "social" },
    { filename: "newsletter-header.png", originalName: "newsletter-banner.png", mimeType: "image/png", size: 167000, folder: "email" },
    { filename: "catalog-spring.pdf", originalName: "spring-catalog-2024.pdf", mimeType: "application/pdf", size: 5400000, folder: "catalogs" },
  ]

  for (const upload of uploadData) {
    await prisma.upload.create({
      data: {
        ...upload,
        url: `/uploads/${upload.folder}/${upload.filename}`,
        alt: upload.originalName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
      }
    })
  }

  console.log("Database seeded successfully!")
  console.log("Summary:")
  console.log("  - 15 Users (admin/staff)")
  console.log("  - 16 Locations")
  console.log("  - 15+ Shipping Zones")
  console.log("  - 18 Tax Rates")
  console.log("  - 15+ Categories (with subcategories)")
  console.log("  - 54 Products")
  console.log("  - 16 Collections")
  console.log("  - 80 Customers (20 with accounts)")
  console.log("  - 16 Discounts")
  console.log("  - 18 Gift Cards")
  console.log("  - 200 Orders")
  console.log("  - 150 Reviews")
  console.log("  - 16 Blog Posts")
  console.log("  - 16 Pages")
  console.log("  - 16 Email Templates")
  console.log("  - 16 Webhooks")
  console.log("  - 16 Marketing Campaigns")
  console.log("  - 18 Abandoned Cart Emails")
  console.log("  - 20 Store Settings")
  console.log("  - 17 Currencies")
  console.log("  - 16 API Keys")
  console.log("  - 30 Days Analytics")
  console.log("  - 50 Analytics Events")
  console.log("  - 16 Uploads")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

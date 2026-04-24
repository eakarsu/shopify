import { z } from "zod"

// Product validation schema
export const productSchema = z.object({
  title: z.string()
    .min(1, "Product title is required")
    .max(255, "Title must be less than 255 characters"),
  description: z.string().max(5000, "Description must be less than 5000 characters").optional(),
  price: z.number()
    .min(0, "Price must be at least 0")
    .max(999999.99, "Price must be less than $999,999.99"),
  compareAtPrice: z.number()
    .min(0, "Compare at price must be at least 0")
    .max(999999.99)
    .nullable()
    .optional(),
  costPerItem: z.number().min(0).max(999999.99).nullable().optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"], {
    required_error: "Status is required"
  }),
  vendor: z.string().max(255).optional(),
  productType: z.string().max(255).optional(),
  tags: z.array(z.string().max(50)).max(20, "Maximum 20 tags allowed").optional(),
  images: z.array(z.string().url("Invalid image URL")).optional(),
})

// Customer validation schema
export const customerSchema = z.object({
  firstName: z.string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters"),
  lastName: z.string()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters"),
  email: z.string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  phone: z.string()
    .regex(/^[+]?[\d\s()-]*$/, "Invalid phone number format")
    .max(20)
    .optional()
    .nullable(),
  company: z.string().max(255).optional().nullable(),
  address1: z.string().max(255).optional().nullable(),
  address2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(2).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  acceptsMarketing: z.boolean().optional(),
})

// Order validation schema
export const orderSchema = z.object({
  customerId: z.string().optional(),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
  })).min(1, "At least one item is required"),
  shippingAddress1: z.string().min(1, "Shipping address is required"),
  shippingCity: z.string().min(1, "City is required"),
  shippingState: z.string().min(1, "State is required"),
  shippingPostalCode: z.string().min(1, "Postal code is required"),
  shippingCountry: z.string().min(1, "Country is required"),
  notes: z.string().max(5000).optional(),
})

// Discount validation schema
export const discountSchema = z.object({
  code: z.string()
    .min(1, "Discount code is required")
    .max(50, "Code must be less than 50 characters")
    .regex(/^[A-Z0-9_-]+$/i, "Code can only contain letters, numbers, dashes, and underscores"),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"]),
  value: z.number().min(0, "Value must be at least 0"),
  minPurchaseAmount: z.number().min(0).optional().nullable(),
  minPurchaseQuantity: z.number().int().min(0).optional().nullable(),
  usageLimit: z.number().int().min(0).optional().nullable(),
  onePerCustomer: z.boolean().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().nullable(),
})

// Collection validation schema
export const collectionSchema = z.object({
  title: z.string()
    .min(1, "Collection title is required")
    .max(255, "Title must be less than 255 characters"),
  description: z.string().max(5000).optional(),
  type: z.enum(["MANUAL", "AUTOMATED"]),
  published: z.boolean().optional(),
})

// Login validation schema
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

// Registration validation schema
export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

// Change password validation schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Passwords do not match",
  path: ["confirmNewPassword"],
})

// Settings validation schema
export const settingsSchema = z.object({
  storeName: z.string().min(1, "Store name is required").max(255),
  storeEmail: z.string().email("Invalid email address"),
  storePhone: z.string().max(20).optional(),
  storeAddress: z.string().max(255).optional(),
  storeCity: z.string().max(100).optional(),
  storeState: z.string().max(100).optional(),
  storePostal: z.string().max(20).optional(),
  storeCountry: z.string().max(100).optional(),
  currency: z.string().length(3, "Currency code must be 3 characters"),
})

export type ProductFormData = z.infer<typeof productSchema>
export type CustomerFormData = z.infer<typeof customerSchema>
export type OrderFormData = z.infer<typeof orderSchema>
export type DiscountFormData = z.infer<typeof discountSchema>
export type CollectionFormData = z.infer<typeof collectionSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
export type SettingsFormData = z.infer<typeof settingsSchema>

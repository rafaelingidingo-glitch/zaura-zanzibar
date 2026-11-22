// Zod request validation schemas.

import { z } from "zod";

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)");

export const availabilityQuerySchema = z.object({
  checkIn: dateKey,
  checkOut: dateKey,
  adults: z.coerce.number().int().min(1).max(16).default(2),
  children: z.coerce.number().int().min(0).max(12).default(0),
  categoryId: z.string().trim().min(1).optional(),
});

export const bookingRequestSchema = z.object({
  checkIn: dateKey,
  checkOut: dateKey,
  categoryId: z.string().trim().min(1),
  unitId: z.string().trim().optional().or(z.literal("")),
  adults: z.coerce.number().int().min(1).max(16),
  children: z.coerce.number().int().min(0).max(12),
  guestName: z.string().trim().min(2, "Full name is required").max(120),
  guestPhone: z
    .string()
    .trim()
    .min(7, "A valid phone number is required")
    .max(20)
    .regex(/^[+\d][\d\s()-]+$/, "A valid phone number is required"),
  guestEmail: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  specialRequests: z.string().trim().max(1000).optional().or(z.literal("")),
  contactChoice: z.enum(["PRIMARY", "SECONDARY"]).default("PRIMARY"),
  idempotencyKey: z.string().trim().min(8).max(64),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  message: z.string().trim().min(5, "Please write a short message").max(2000),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and dashes")
    .min(2)
    .max(80)
    .optional(),
  tagline: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().min(10).max(4000),
  basePrice: z.coerce.number().min(0).max(100000),
  currency: z.string().trim().min(2).max(6).default("USD"),
  maxOccupancy: z.coerce.number().int().min(1).max(20),
  maxAdults: z.coerce.number().int().min(1).max(16),
  maxChildren: z.coerce.number().int().min(0).max(10),
  bedConfiguration: z.string().trim().max(200).default(""),
  sizeSqm: z.coerce.number().int().min(0).max(2000).optional(),
  viewNote: z.string().trim().max(200).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  active: z.coerce.boolean().default(true),
  amenityIds: z.array(z.string()).optional(),
  images: z
    .array(z.object({ url: z.string().trim().min(1), alt: z.string().trim().max(200).default("") }))
    .max(12)
    .optional(),
});

export const unitInputSchema = z.object({
  categoryId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  number: z.string().trim().min(1).max(12),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  priceOverride: z.coerce.number().min(0).max(100000).nullable().optional(),
  maxOccupancyOverride: z.coerce.number().int().min(1).max(20).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).default("ACTIVE"),
  maintenanceNote: z.string().trim().max(500).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  images: z
    .array(z.object({ url: z.string().trim().min(1), alt: z.string().trim().max(200).default("") }))
    .max(12)
    .optional(),
});

export const amenityInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  icon: z.string().trim().max(40).default("check"),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  active: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const galleryInputSchema = z.object({
  url: z.string().trim().min(1),
  category: z
    .enum([
      "APARTMENTS",
      "INTERIORS",
      "LIVING_SPACES",
      "BEDROOMS",
      "BATHROOMS",
      "PROPERTY_EXTERIOR",
      "GUEST_EXPERIENCES",
    ])
    .default("APARTMENTS"),
  caption: z.string().trim().max(200).default(""),
  alt: z.string().trim().max(200).default(""),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  active: z.coerce.boolean().default(true),
});

export const contentBlockInputSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9-]+$/).min(2).max(60),
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().max(300).optional().or(z.literal("")),
  body: z.string().trim().max(6000).optional().or(z.literal("")),
  image: z.string().trim().max(500).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  active: z.coerce.boolean().default(true),
});

export const settingsInputSchema = z.object({
  whatsappPrimary: z.string().trim().max(30),
  whatsappSecondary: z.string().trim().max(30),
  primaryContact: z.enum(["PRIMARY", "SECONDARY", "GUEST_CHOICE"]),
  contactEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  instagramProfileUrl: z.string().trim().max(300).optional().or(z.literal("")),
  instagramReelUrl: z.string().trim().max(300).optional().or(z.literal("")),
  locationDescription: z.string().trim().max(2000),
  mapEmbedUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  directionsUrl: z.string().trim().max(1000),
  pendingExpiryMinutes: z.coerce.number().int().min(5).max(1440),
  currency: z.string().trim().min(2).max(6),
  houseRules: z.string().trim().max(3000),
  heroHeadline: z.string().trim().min(2).max(200),
  heroSubline: z.string().trim().max(400),
  brandTagline: z.string().trim().max(200),
  propertyPhoneDisplay: z.string().trim().max(200),
});

export const bookingActionSchema = z.object({
  action: z.enum([
    "confirm",
    "reject",
    "cancel",
    "extend",
    "checkin",
    "checkout",
    "noshow",
    "notes",
    "addPayment",
  ]),
  notes: z.string().trim().max(2000).optional(),
  extendMinutes: z.coerce.number().int().min(5).max(1440).optional(),
  payment: z
    .object({
      amount: z.coerce.number().min(0.01).max(1000000),
      method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "MOBILE_MONEY", "OTHER"]).default("OTHER"),
      note: z.string().trim().max(500).optional(),
    })
    .optional(),
});

// ZAURA ZANZIBAR — shared domain constants

export const PROPERTY_TZ = "Africa/Dar_es_Salaam";

export const BOOKING_STATUS_META: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  PENDING: { label: "Pending", color: "#9a6b1f", bg: "#f7edd8", border: "#e5cf9d" },
  CONFIRMED: { label: "Confirmed", color: "#2f6b4f", bg: "#e2efe6", border: "#bcd9c6" },
  REJECTED: { label: "Rejected", color: "#8f3b2d", bg: "#f5e2dd", border: "#e0bfb6" },
  CANCELLED: { label: "Cancelled", color: "#6d6d62", bg: "#eceae4", border: "#d8d4c8" },
  EXPIRED: { label: "Expired", color: "#6d6d62", bg: "#eceae4", border: "#d8d4c8" },
  CHECKED_IN: { label: "Checked-in", color: "#1e5f58", bg: "#dcf0ed", border: "#b3ddd7" },
  CHECKED_OUT: { label: "Checked-out", color: "#5a5348", bg: "#eee9df", border: "#d8d0bf" },
  NO_SHOW: { label: "No-show", color: "#8f3b2d", bg: "#f5e2dd", border: "#e0bfb6" },
};

export const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN"] as const;

export const GALLERY_CATEGORIES = [
  "APARTMENTS",
  "INTERIORS",
  "LIVING_SPACES",
  "BEDROOMS",
  "BATHROOMS",
  "PROPERTY_EXTERIOR",
  "GUEST_EXPERIENCES",
] as const;

export const GALLERY_CATEGORY_LABELS: Record<string, string> = {
  APARTMENTS: "Apartments",
  INTERIORS: "Interiors",
  LIVING_SPACES: "Living Spaces",
  BEDROOMS: "Bedrooms",
  BATHROOMS: "Bathrooms",
  PROPERTY_EXTERIOR: "Property Exterior",
  GUEST_EXPERIENCES: "Guest Experiences",
};

export const SETTING_DEFAULTS = {
  whatsappPrimary: "+255683798878",
  whatsappSecondary: "+255712109231",
  primaryContact: "GUEST_CHOICE", // PRIMARY | SECONDARY | GUEST_CHOICE
  contactEmail: "",
  instagramProfileUrl: "",
  instagramReelUrl: "https://www.instagram.com/reel/DYxDXfmsl8u/",
  locationDescription:
    "Zaura Zanzibar is located in Zanzibar, Tanzania — an island of white-sand beaches, spice-scented winds and centuries of Swahili culture. Exact directions and arrival guidance are shared personally with every confirmed guest.",
  mapEmbedUrl: "",
  directionsUrl: "https://www.google.com/maps/search/?api=1&query=Zanzibar%2C+Tanzania",
  pendingExpiryMinutes: "15",
  currency: "USD",
  houseRules: [
    "Check-in from 14:00 · Check-out until 10:00",
    "Valid identification is required at check-in",
    "Respect the privacy and quiet enjoyment of fellow guests",
    "Smoking is not permitted indoors",
    "Visitors require prior arrangement with management",
    "Damage to property will be charged accordingly",
  ].join("\n"),
  heroHeadline: "Discover Your Private Escape in Zanzibar.",
  heroSubline:
    "Experience a refined stay where contemporary comfort meets the timeless charm of Zanzibar.",
  brandTagline: "Private apartments · Considered comfort · Authentic Zanzibar",
  propertyPhoneDisplay: "+255 683 798 878 · +255 712 109 231",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

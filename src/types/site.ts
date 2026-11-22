// Shared DTO types between server data layer and client components.

export type SiteSettingsDTO = {
  whatsappPrimary: string;
  whatsappSecondary: string;
  primaryContact: string;
  contactEmail: string;
  instagramProfileUrl: string;
  instagramReelUrl: string;
  locationDescription: string;
  mapEmbedUrl: string;
  directionsUrl: string;
  pendingExpiryMinutes: string;
  currency: string;
  houseRules: string;
  heroHeadline: string;
  heroSubline: string;
  brandTagline: string;
  propertyPhoneDisplay: string;
};

export type ContentBlockDTO = {
  id: string;
  key: string;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  image?: string | null;
  sortOrder: number;
  active: boolean;
};

export type GalleryImageDTO = {
  id: string;
  url: string;
  category: string;
  caption: string;
  alt: string;
};

export type AmenityDTO = {
  id: string;
  name: string;
  icon: string;
  description?: string | null;
};

export type CategoryDTO = {
  id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  description: string;
  pricePerNight: number;
  currency: string;
  maxOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  bedConfiguration: string;
  sizeSqm?: number | null;
  viewNote?: string | null;
  images: { url: string; alt: string }[];
  amenities: { id: string; name: string; icon: string }[];
  totalUnits: number;
};

export type SiteData = {
  settings: SiteSettingsDTO;
  blocks: ContentBlockDTO[];
  categories: CategoryDTO[];
  gallery: GalleryImageDTO[];
  amenities: AmenityDTO[];
};

export type BookingResult = {
  reference: string;
  status: string;
  holdExpiresAt: string;
  guestName: string;
  categoryName: string;
  unitNumber: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  estTotal: number;
  currency: string;
};

export type AvailabilityUnitState = {
  id: string;
  name: string;
  number: string;
  available: boolean;
  reason: "BOOKED" | "MAINTENANCE" | "INACTIVE" | null;
  pricePerNight: number;
  maxOccupancy: number;
};

export type AvailabilityCategory = {
  id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  description: string;
  pricePerNight: number;
  currency: string;
  maxOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  bedConfiguration: string;
  sizeSqm?: number | null;
  viewNote?: string | null;
  images: { url: string; alt: string }[];
  amenities: { id: string; name: string; icon: string }[];
  totalUnits: number;
  availableUnits: number;
  available: boolean;
  fitsGuests: boolean;
};

export type AvailabilityResponse = {
  checkIn: string;
  checkOut: string;
  nights: number;
  currency: string;
  categories: AvailabilityCategory[];
  unitDetail?: {
    category: { id: string; name: string; pricePerNight: number; currency: string };
    units: AvailabilityUnitState[];
  };
};

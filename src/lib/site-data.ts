// Server-side data loader for the public page (rendered on the server for SEO).

import { db } from "./db";
import { getSettings, getContentBlocks } from "./settings";
import { SETTING_DEFAULTS, type SettingKey } from "./constants";
import type { SiteData } from "@/types/site";

export async function getSiteData(): Promise<SiteData> {
  const [settingsRaw, blocks, categories, gallery, amenities] = await Promise.all([
    getSettings(),
    getContentBlocks(),
    db.category.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        amenities: { include: { amenity: true } },
        units: { where: { status: { not: "INACTIVE" } }, select: { id: true } },
      },
    }),
    db.galleryImage.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    db.amenity.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  return {
    settings: settingsRaw as unknown as SiteData["settings"],
    blocks,
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      tagline: c.tagline,
      description: c.description,
      pricePerNight: c.basePrice,
      currency: c.currency || SETTING_DEFAULTS.currency,
      maxOccupancy: c.maxOccupancy,
      maxAdults: c.maxAdults,
      maxChildren: c.maxChildren,
      bedConfiguration: c.bedConfiguration,
      sizeSqm: c.sizeSqm,
      viewNote: c.viewNote,
      images: c.images.map((i) => ({ url: i.url, alt: i.alt })),
      amenities: c.amenities.filter((a) => a.amenity.active).map((a) => ({ id: a.amenity.id, name: a.amenity.name, icon: a.amenity.icon })),
      totalUnits: c.units.length,
    })),
    gallery: gallery.map((g) => ({ id: g.id, url: g.url, category: g.category, caption: g.caption, alt: g.alt })),
    amenities: amenities.map((a) => ({ id: a.id, name: a.name, icon: a.icon, description: a.description })),
  };
}

export type { SettingKey };

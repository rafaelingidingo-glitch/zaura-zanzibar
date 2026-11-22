/**
 * ZAURA ZANZIBAR — database seed.
 * Creates: admin user, site settings, editable content, amenities,
 * sample accommodation categories + individual units, gallery.
 *
 * NOTE: Categories, units, prices and texts are SAMPLE content for the
 * administrator to adjust — nothing is hardcoded in the application.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const db = new PrismaClient();

const IMG = "/images";

async function main() {
  // ------------------------------------------------------------------ admin
  const email = (process.env.ADMIN_EMAIL || "admin@zaurazanzibar.com").toLowerCase();
  // Never seed a publicly-known credential: generate a strong random password
  // when ADMIN_PASSWORD is not provided and print it once.
  const password =
    process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8
      ? process.env.ADMIN_PASSWORD
      : `Zaura-${randomBytes(9).toString("base64url")}!`;
  const generated = !(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8);
  const passwordHash = await bcrypt.hash(password, 12);
  await db.adminUser.upsert({
    where: { email },
    create: { email, passwordHash, name: "Zaura Administrator" },
    update: { passwordHash },
  });

  // --------------------------------------------------------------- settings
  const settings: Record<string, string> = {
    whatsappPrimary: "+255683798878",
    whatsappSecondary: "+255712109231",
    primaryContact: "GUEST_CHOICE",
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
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }

  // ---------------------------------------------------------------- amenities
  const amenityDefs = [
    { key: "wifi", name: "Wi-Fi", icon: "wifi", description: "Stay connected throughout your stay", active: true },
    { key: "ac", name: "Air Conditioning", icon: "snowflake", description: "Cool comfort in every season", active: true },
    { key: "kitchen", name: "Kitchen Facilities", icon: "cooking-pot", description: "Prepare meals at your own pace", active: true },
    { key: "bathroom", name: "Private Bathroom", icon: "bath", description: "Modern, private and beautifully finished", active: true },
    { key: "furnished", name: "Furnished Interiors", icon: "sofa", description: "Thoughtfully furnished for effortless living", active: true },
    { key: "balcony", name: "Balcony", icon: "sun", description: "Your own corner of island breeze", active: true },
    { key: "pool", name: "Swimming Pool", icon: "waves", description: "", active: false },
    { key: "parking", name: "Parking", icon: "car-front", description: "", active: true },
    { key: "airport", name: "Airport Transfer", icon: "plane", description: "", active: false },
    { key: "housekeeping", name: "Housekeeping", icon: "sparkles", description: "", active: true },
  ];
  const amenities: Record<string, { id: string }> = {};
  for (let i = 0; i < amenityDefs.length; i++) {
    const a = amenityDefs[i];
    const row = await db.amenity.upsert({
      where: { id: a.key }, // not unique by name; create stable ids
      create: { id: a.key, name: a.name, icon: a.icon, description: a.description, active: a.active, sortOrder: i },
      update: { name: a.name, icon: a.icon, active: a.active, sortOrder: i },
    });
    amenities[a.key] = row;
  }

  // -------------------------------------------------------------- categories
  const catDefs = [
    {
      slug: "studio-apartment",
      name: "Studio Apartment",
      tagline: "Compact elegance for two",
      description:
        "A serene, light-filled retreat where a king bed, an elegant kitchenette and warm textures come together in one considered space. Ideal for couples and solo travellers who value privacy, calm and thoughtful design.",
      basePrice: 80,
      maxOccupancy: 2,
      maxAdults: 2,
      maxChildren: 0,
      bedConfiguration: "1 Queen Bed",
      sizeSqm: 35,
      viewNote: "Garden view",
      images: [`${IMG}/cat-studio.png`, `${IMG}/gal-living.png`, `${IMG}/gal-bedroom.png`],
      amenityKeys: ["wifi", "ac", "kitchen", "bathroom", "furnished", "balcony"],
      units: [
        { number: "01", name: "Apartment 01" },
        { number: "02", name: "Apartment 02" },
        { number: "03", name: "Apartment 03" },
      ],
    },
    {
      slug: "one-bedroom-apartment",
      name: "One Bedroom Apartment",
      tagline: "A private sanctuary to unwind",
      description:
        "A separate bedroom, a generous living space and a fully equipped kitchen create the feel of a private residence. Soft linen, warm wood and coastal light make it effortless to slow down and simply stay.",
      basePrice: 110,
      maxOccupancy: 3,
      maxAdults: 2,
      maxChildren: 1,
      bedConfiguration: "1 King Bed + Sofa Bed",
      sizeSqm: 55,
      viewNote: "Garden view",
      images: [`${IMG}/cat-onebedroom.png`, `${IMG}/gal-bedroom.png`, `${IMG}/gal-kitchen.png`],
      amenityKeys: ["wifi", "ac", "kitchen", "bathroom", "furnished", "balcony", "housekeeping"],
      units: [
        { number: "04", name: "Apartment 04" },
        { number: "05", name: "Apartment 05" },
      ],
    },
    {
      slug: "two-bedroom-apartment",
      name: "Two Bedroom Apartment",
      tagline: "Space to gather, room to breathe",
      description:
        "Designed for families and friends travelling together, the two bedroom apartment pairs a welcoming living and dining area with two comfortable bedrooms — a home on the island, complete and unhurried.",
      basePrice: 150,
      maxOccupancy: 5,
      maxAdults: 4,
      maxChildren: 2,
      bedConfiguration: "1 King Bed + 2 Single Beds",
      sizeSqm: 85,
      viewNote: "Garden view",
      images: [`${IMG}/cat-twobedroom.png`, `${IMG}/gal-living.png`, `${IMG}/gal-kitchen.png`],
      amenityKeys: ["wifi", "ac", "kitchen", "bathroom", "furnished", "balcony", "housekeeping", "parking"],
      units: [
        { number: "06", name: "Apartment 06" },
        { number: "07", name: "Apartment 07" },
      ],
    },
  ];

  for (let i = 0; i < catDefs.length; i++) {
    const def = catDefs[i];
    const category = await db.category.upsert({
      where: { slug: def.slug },
      create: {
        slug: def.slug,
        name: def.name,
        tagline: def.tagline,
        description: def.description,
        basePrice: def.basePrice,
        maxOccupancy: def.maxOccupancy,
        maxAdults: def.maxAdults,
        maxChildren: def.maxChildren,
        bedConfiguration: def.bedConfiguration,
        sizeSqm: def.sizeSqm,
        viewNote: def.viewNote,
        sortOrder: i,
        currency: "USD",
      },
      update: {},
    });

    for (let j = 0; j < def.images.length; j++) {
      const exists = await db.categoryImage.findFirst({
        where: { categoryId: category.id, url: def.images[j] },
      });
      if (!exists) {
        await db.categoryImage.create({
          data: { categoryId: category.id, url: def.images[j], alt: `${def.name} — Zaura Zanzibar`, sortOrder: j },
        });
      }
    }

    for (const key of def.amenityKeys) {
      await db.categoryAmenity.upsert({
        where: { categoryId_amenityId: { categoryId: category.id, amenityId: amenities[key].id } },
        create: { categoryId: category.id, amenityId: amenities[key].id },
        update: {},
      });
    }

    for (let j = 0; j < def.units.length; j++) {
      const u = def.units[j];
      const existing = await db.unit.findUnique({
        where: { categoryId_number: { categoryId: category.id, number: u.number } },
      });
      if (!existing) {
        await db.unit.create({
          data: {
            categoryId: category.id,
            name: u.name,
            number: u.number,
            description: `${u.name} — a private ${def.name.toLowerCase()} at Zaura Zanzibar.`,
            sortOrder: j,
          },
        });
      }
    }
  }

  // ------------------------------------------------------------ content blocks
  const blocks = [
    {
      key: "brand-intro",
      title: "An Escape Worth Experiencing.",
      subtitle: "The Zaura Story",
      body:
        "Zaura Zanzibar is a collection of private, thoughtfully designed apartments on the island of Zanzibar. We believe a stay should feel like a home you never want to leave — quiet mornings, warm light through carved wood, and the freedom to live at your own pace.\n\nEvery apartment is furnished for real living: comfortable bedrooms, kitchens you will actually want to cook in, and spaces that invite you to unwind. Our team is close at hand whenever you need us, and discreetly out of sight when you do not.",
      image: `${IMG}/intro-door.png`,
      sortOrder: 0,
    },
    {
      key: "exp-1",
      title: "Discover Zanzibar",
      subtitle: "Stone Town & living history",
      body:
        "Wander lanes carved by centuries of Swahili, Arab and European influences. Stone Town's carved doors, bustling markets and quiet courtyards are among the most atmospheric streets anywhere on the Indian Ocean.",
      image: `${IMG}/exp-stonetown.png`,
      sortOrder: 0,
    },
    {
      key: "exp-2",
      title: "Coastal Experiences",
      subtitle: "Sand, sea & slow afternoons",
      body:
        "Zanzibar's beaches are the stuff of legend — powder-white sand, shallow turquoise water and dhow boats drifting past at sunset. Ask us for suggestions and we will happily point you towards beautiful stretches of coast.",
      image: `${IMG}/exp-beach.png`,
      sortOrder: 1,
    },
    {
      key: "exp-3",
      title: "Flavours of the Spice Island",
      subtitle: "Markets, spices & island kitchens",
      body:
        "Cloves, cinnamon, cardamom and nutmeg earned Zanzibar its name as the Spice Island. Explore local markets, taste street food at dusk, or bring fresh ingredients home to your own kitchen at Zaura.",
      image: `${IMG}/exp-spices.png`,
      sortOrder: 2,
    },
    {
      key: "exp-4",
      title: "Sunset Sailing",
      subtitle: "Evenings on the water",
      body:
        "Few endings to a day compare with watching the sun sink behind a wooden dhow. Ask our team about trusted local operators for boat trips and experiences, and we will share up-to-date recommendations.",
      image: `${IMG}/exp-dhow.png`,
      sortOrder: 3,
    },
    {
      key: "location",
      title: "Find Us in Zanzibar",
      subtitle: "Zanzibar, Tanzania",
      body:
        "Zaura Zanzibar is situated in Zanzibar, Tanzania. Your booking confirmation includes precise directions and our team's personal arrival guidance. Reach us any time on WhatsApp — we are happy to help you plan the journey.",
      image: "",
      sortOrder: 0,
    },
  ];
  for (const b of blocks) {
    await db.contentBlock.upsert({
      where: { key: b.key },
      create: b,
      update: {},
    });
  }

  // ----------------------------------------------------------------- gallery
  const galleryDefs: { url: string; category: string; caption: string }[] = [
    { url: `${IMG}/cat-studio.png`, category: "APARTMENTS", caption: "Studio Apartment" },
    { url: `${IMG}/cat-onebedroom.png`, category: "APARTMENTS", caption: "One Bedroom Apartment" },
    { url: `${IMG}/cat-twobedroom.png`, category: "APARTMENTS", caption: "Two Bedroom Apartment" },
    { url: `${IMG}/gal-living.png`, category: "LIVING_SPACES", caption: "Living space" },
    { url: `${IMG}/gal-bedroom.png`, category: "BEDROOMS", caption: "Bedroom" },
    { url: `${IMG}/gal-bathroom.png`, category: "BATHROOMS", caption: "Bathroom" },
    { url: `${IMG}/gal-kitchen.png`, category: "INTERIORS", caption: "Kitchen" },
    { url: `${IMG}/gal-exterior.png`, category: "PROPERTY_EXTERIOR", caption: "Courtyard" },
    { url: `${IMG}/gal-detail.png`, category: "INTERIORS", caption: "Interior detail" },
    { url: `${IMG}/hero-2.png`, category: "LIVING_SPACES", caption: "Living room opening to the terrace" },
    { url: `${IMG}/hero-3.png`, category: "PROPERTY_EXTERIOR", caption: "Evening terrace" },
    { url: `${IMG}/intro-door.png`, category: "INTERIORS", caption: "Carved Zanzibar door" },
    { url: `${IMG}/exp-stonetown.png`, category: "GUEST_EXPERIENCES", caption: "Stone Town" },
    { url: `${IMG}/exp-beach.png`, category: "GUEST_EXPERIENCES", caption: "Zanzibar beach" },
    { url: `${IMG}/exp-spices.png`, category: "GUEST_EXPERIENCES", caption: "The Spice Island" },
    { url: `${IMG}/exp-dhow.png`, category: "GUEST_EXPERIENCES", caption: "Sunset dhow" },
  ];
  for (let i = 0; i < galleryDefs.length; i++) {
    const g = galleryDefs[i];
    const exists = await db.galleryImage.findFirst({ where: { url: g.url } });
    if (!exists) {
      await db.galleryImage.create({
        data: {
          url: g.url,
          category: g.category as never,
          caption: g.caption,
          alt: `${g.caption} — Zaura Zanzibar`,
          sortOrder: i,
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log(`Admin login: ${email}`);
  if (generated) {
    console.log(`Generated admin password (store it now): ${password}`);
  } else {
    console.log("Admin password: from ADMIN_PASSWORD env");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

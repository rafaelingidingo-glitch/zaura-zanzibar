"use client";

// Public site composition: all sections + overlays, sticky footer layout.

import { useState } from "react";
import Navbar from "./Navbar";
import Hero from "./Hero";
import BookingBar from "./BookingBar";
import BrandIntro from "./BrandIntro";
import Apartments from "./Apartments";
import Experience from "./Experience";
import Amenities from "./Amenities";
import Gallery from "./Gallery";
import LocationContact from "./LocationContact";
import Footer from "./Footer";
import ApartmentDetails from "./ApartmentDetails";
import BookingWizard from "./BookingWizard";
import type { CategoryDTO, SiteData } from "@/types/site";

export default function ZauraSitePage({ data }: { data: SiteData }) {
  const [detailsCategory, setDetailsCategory] = useState<CategoryDTO | null>(null);

  const intro = data.blocks.find((b) => b.key === "brand-intro" && b.active);
  const experienceBlocks = data.blocks
    .filter((b) => b.key.startsWith("exp-") && b.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      <Navbar />
      <main className="flex-1">
        <Hero headline={data.settings.heroHeadline} subline={data.settings.heroSubline} />
        <BookingBar categories={data.categories} />
        <BrandIntro block={intro} tagline={data.settings.brandTagline} />
        <Apartments categories={data.categories} onViewDetails={setDetailsCategory} />
        <Experience blocks={experienceBlocks} instagramReelUrl={data.settings.instagramReelUrl} />
        <Amenities amenities={data.amenities} />
        <Gallery images={data.gallery} />
        <LocationContact settings={data.settings} />
      </main>
      <Footer phoneDisplay={data.settings.propertyPhoneDisplay} />

      <ApartmentDetails category={detailsCategory} settings={data.settings} onClose={() => setDetailsCategory(null)} />
      <BookingWizard settings={data.settings} />
    </div>
  );
}

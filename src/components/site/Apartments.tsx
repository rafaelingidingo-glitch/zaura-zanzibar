"use client";

import Image from "next/image";
import { Reveal, SectionHeading, AmenityIcon, formatMoney } from "./atoms";
import { Users, BedDouble, Maximize, MapPin, ArrowRight } from "lucide-react";
import { useBookingFlow } from "@/store/booking";
import type { CategoryDTO } from "@/types/site";

export default function Apartments({
  categories,
  onViewDetails,
}: {
  categories: CategoryDTO[];
  onViewDetails: (c: CategoryDTO) => void;
}) {
  const openWizard = useBookingFlow((s) => s.openWizard);
  if (categories.length === 0) return null;

  return (
    <section id="apartments" className="py-24 md:py-32 bg-ivory" aria-label="Our apartments">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <SectionHeading
            eyebrow="Our Apartments"
            title="The Accommodation Collection"
            intro="Private, fully serviced apartments — each one thoughtfully prepared for an effortless island stay."
          />
          <Reveal delay={0.1}>
            <p className="text-sm text-muted-foreground md:text-right md:max-w-[220px]">
              Select a residence to view its details, or check availability for your dates.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 space-y-20 md:space-y-24">
          {categories.map((c, i) => {
            const flip = i % 2 === 1;
            const cover = c.images[0]?.url || "/images/hero-2.png";
            const secondary = c.images[1]?.url || c.images[0]?.url;
            return (
              <Reveal key={c.id} className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
                {/* Imagery */}
                <div className={`lg:col-span-7 relative ${flip ? "lg:order-2" : ""}`}>
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[3px] group">
                    <Image
                      src={cover}
                      alt={c.images[0]?.alt || c.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      className="object-cover transition-transform duration-[1600ms] group-hover:scale-[1.05]"
                    />
                    <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/10 transition-colors duration-500" />
                    <div className="absolute top-5 left-5 bg-ivory/95 backdrop-blur-sm rounded-[3px] px-4 py-2.5 shadow-md">
                      <span className="eyebrow text-charcoal">{formatMoney(c.pricePerNight, c.currency)} <span className="opacity-60">/ night</span></span>
                    </div>
                  </div>
                  {secondary && (
                    <div className={`hidden md:block absolute -bottom-10 ${flip ? "-left-6 lg:-left-10" : "-right-6 lg:-right-10"} w-44 lg:w-56 aspect-[4/3] overflow-hidden rounded-[3px] shadow-xl border-4 border-ivory`}>
                      <Image src={secondary} alt={c.name} fill sizes="220px" className="object-cover" />
                    </div>
                  )}
                </div>

                {/* Copy */}
                <div className={`lg:col-span-5 ${flip ? "lg:order-1" : ""}`}>
                  <p className="eyebrow text-champagne mb-3">{c.tagline || c.name}</p>
                  <h3 className="font-display text-2xl md:text-[2.1rem] leading-snug font-medium">{c.name}</h3>
                  <p className="mt-4 text-[15px] leading-[1.85] text-muted-foreground line-clamp-4">{c.description}</p>

                  <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground/75">
                    <span className="flex items-center gap-2"><Users className="h-4 w-4 text-olive" /> Up to {c.maxOccupancy} guests</span>
                    <span className="flex items-center gap-2"><BedDouble className="h-4 w-4 text-olive" /> {c.bedConfiguration || "Comfortable bedding"}</span>
                    {c.sizeSqm ? <span className="flex items-center gap-2"><Maximize className="h-4 w-4 text-olive" /> {c.sizeSqm} m²</span> : null}
                    {c.viewNote ? <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-olive" /> {c.viewNote}</span> : null}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {c.amenities.slice(0, 6).map((a) => (
                      <span key={a.id} className="inline-flex items-center gap-1.5 rounded-[3px] border border-border bg-card px-2.5 py-1.5 text-xs text-foreground/70">
                        <AmenityIcon name={a.icon} className="h-3.5 w-3.5 text-champagne" />
                        {a.name}
                      </span>
                    ))}
                  </div>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => onViewDetails(c)}
                      className="eyebrow inline-flex items-center gap-2 border border-charcoal text-charcoal rounded-[3px] px-6 py-3.5 hover:bg-charcoal hover:text-ivory transition-colors"
                    >
                      View details <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => openWizard({ categoryId: c.id })}
                      className="eyebrow inline-flex items-center gap-2 bg-charcoal text-ivory rounded-[3px] px-6 py-3.5 hover:bg-champagne hover:text-charcoal transition-colors"
                    >
                      Check availability
                    </button>
                    <span className="text-xs text-muted-foreground ml-1">
                      {c.totalUnits} {c.totalUnits === 1 ? "apartment" : "apartments"}
                    </span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

"use client";

import { AmenityIcon, Reveal, SectionHeading } from "./atoms";
import type { AmenityDTO } from "@/types/site";

export default function Amenities({ amenities }: { amenities: AmenityDTO[] }) {
  if (amenities.length === 0) return null;
  return (
    <section className="py-24 md:py-32" aria-label="Amenities and facilities">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionHeading
          eyebrow="Amenities & Facilities"
          title="Everything You Need, Nothing You Don't"
          intro="Considered comforts that make an apartment feel like a home away from home."
          align="center"
        />
        <ul className="mt-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8">
          {amenities.map((a, i) => (
            <Reveal
              as="li"
              key={a.id}
              delay={i * 0.04}
              className="flex flex-col items-center text-center gap-4 rounded-[3px] border border-border/80 bg-card px-4 py-8 hover:border-champagne/60 hover:shadow-[0_10px_30px_rgba(36,37,34,0.06)] transition-all duration-300"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-champagne/50 bg-ivory">
                <AmenityIcon name={a.icon} className="h-5 w-5 text-champagne" />
              </span>
              <div>
                <p className="text-sm font-medium tracking-wide">{a.name}</p>
                {a.description && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{a.description}</p>}
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

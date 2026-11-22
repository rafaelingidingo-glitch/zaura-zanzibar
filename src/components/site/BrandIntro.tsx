"use client";

import Image from "next/image";
import { Reveal, Eyebrow } from "./atoms";
import type { ContentBlockDTO } from "@/types/site";

export default function BrandIntro({
  block,
  tagline,
}: {
  block?: ContentBlockDTO;
  tagline: string;
}) {
  if (!block) return null;
  const chips = tagline.split("·").map((s) => s.trim()).filter(Boolean);

  return (
    <section className="py-24 md:py-32 overflow-x-clip" aria-label="About Zaura">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Asymmetric image composition */}
          <Reveal className="lg:col-span-5 relative max-lg:overflow-x-clip">
            <div className="relative">
              <div className="absolute -inset-3 border border-champagne/50 rounded-[3px] translate-x-5 translate-y-5" aria-hidden />
              <div className="relative aspect-[3/4] overflow-hidden rounded-[3px] bg-muted">
                {block.image ? (
                  <Image
                    src={block.image}
                    alt={block.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover transition-transform duration-[1400ms] hover:scale-[1.04]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-muted" />
                )}
              </div>
              <div className="absolute -bottom-8 -right-4 md:-right-8 bg-charcoal text-ivory px-6 py-5 rounded-[3px] shadow-xl max-w-[220px]">
                <p className="font-display italic text-lg leading-snug">Private apartments on the island of Zanzibar</p>
              </div>
            </div>
          </Reveal>

          {/* Editorial copy */}
          <div className="lg:col-span-7 lg:pl-6">
            <Reveal>
              <Eyebrow tone="champagne">{block.subtitle || "The Zaura Story"}</Eyebrow>
              <h2 className="font-display text-3xl md:text-[2.75rem] leading-[1.15] font-medium max-w-xl">
                {block.title}
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="mt-6 space-y-5 max-w-2xl">
                {(block.body || "").split("\n\n").map((p, i) => (
                  <p key={i} className="text-[15px] leading-[1.85] text-muted-foreground">
                    {p}
                  </p>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3" aria-label="Brand values">
                {chips.map((c) => (
                  <li key={c} className="flex items-center gap-2.5 text-sm text-foreground/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-olive" aria-hidden />
                    {c}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

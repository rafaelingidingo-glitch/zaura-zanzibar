"use client";

import Image from "next/image";
import { Reveal, SectionHeading } from "./atoms";
import type { ContentBlockDTO } from "@/types/site";

export default function Experience({
  blocks,
  instagramReelUrl,
}: {
  blocks: ContentBlockDTO[];
  instagramReelUrl: string;
}) {
  const embedSrc = instagramReelUrl
    ? instagramReelUrl.replace(/\/$/, "").replace(/\?.*$/, "") + "/embed"
    : "";

  return (
    <section id="experience" className="py-24 md:py-32 bg-charcoal text-ivory relative overflow-hidden" aria-label="The Zanzibar experience">
      {/* Subtle texture vignette */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-champagne blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-olive blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <SectionHeading
          eyebrow="The Zanzibar Experience"
          title="Island Life, Beautifully Lived"
          intro="Beyond the privacy of your apartment, Zanzibar awaits — ancient towns, turquoise water and evenings that end in golden light."
          tone="light"
        />

        <div className="mt-16 grid md:grid-cols-2 gap-x-8 gap-y-12">
          {blocks.map((b, i) => (
            <Reveal key={b.id} delay={i * 0.06} className={`group ${i % 2 === 1 ? "md:translate-y-10" : ""}`}>
              <div className="relative aspect-[16/10] overflow-hidden rounded-[3px]">
                {b.image ? (
                  <Image
                    src={b.image}
                    alt={b.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 45vw"
                    className="object-cover transition-transform duration-[1600ms] group-hover:scale-[1.06]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-olive/20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5">
                  <p className="eyebrow text-champagne mb-1.5">{b.subtitle}</p>
                  <h3 className="font-display text-2xl text-ivory">{b.title}</h3>
                </div>
              </div>
              <p className="mt-5 text-[15px] leading-[1.8] text-ivory/70 max-w-xl">{b.body}</p>
            </Reveal>
          ))}
        </div>

        {/* Instagram reel */}
        {embedSrc && (
          <Reveal className="mt-28 md:mt-36">
            <div className="grid lg:grid-cols-12 gap-10 items-center border-t border-ivory/10 pt-16">
              <div className="lg:col-span-5">
                <p className="eyebrow text-champagne mb-4">Follow the journey</p>
                <h3 className="font-display text-3xl md:text-4xl leading-snug text-ivory max-w-md">
                  Moments from Zaura, straight from the island.
                </h3>
                <p className="mt-5 text-ivory/70 text-[15px] leading-relaxed max-w-md">
                  A glimpse of life at Zaura Zanzibar — our spaces, our light and the quiet rhythm of the island.
                </p>
              </div>
              <div className="lg:col-span-7 flex justify-center lg:justify-end">
                <div className="w-full max-w-[420px] rounded-[4px] overflow-hidden bg-ivory/5 border border-ivory/10">
                  <iframe
                    src={embedSrc}
                    title="Zaura Zanzibar on Instagram"
                    className="w-full h-[560px] bg-charcoal"
                    scrolling="no"
                    loading="lazy"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

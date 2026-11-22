"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Reveal, SectionHeading } from "./atoms";
import { GALLERY_CATEGORIES, GALLERY_CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { GalleryImageDTO } from "@/types/site";

// Editorial asymmetric layout: 6-column grid, 200px auto rows.
// On md+ every item uses aspect-auto so the grid controls the size
// (fixed aspect + fixed rows would cause overlaps). Mobile uses 2
// columns with natural aspect ratios.
const SPANS = [
  "md:col-span-4 md:row-span-2 aspect-[3/4] md:aspect-auto",
  "md:col-span-2 aspect-[4/3] md:aspect-auto",
  "md:col-span-2 aspect-[4/3] md:aspect-auto",
  "md:col-span-2 md:row-span-2 aspect-[1/1] md:aspect-auto",
  "md:col-span-4 aspect-[4/3] md:aspect-auto",
  "md:col-span-2 aspect-[1/1] md:aspect-auto",
  "md:col-span-2 aspect-[4/3] md:aspect-auto",
];

export default function Gallery({ images }: { images: GalleryImageDTO[] }) {
  const [filter, setFilter] = useState<string>("ALL");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const filtered = useMemo(
    () => (filter === "ALL" ? images : images.filter((i) => i.category === filter)),
    [filter, images]
  );

  const close = useCallback(() => setLightbox(null), []);
  const step = useCallback(
    (dir: 1 | -1) => {
      setLightbox((cur) => {
        if (cur === null) return cur;
        const next = (cur + dir + filtered.length) % filtered.length;
        return next;
      });
    },
    [filtered.length]
  );

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, close, step]);

  if (images.length === 0) return null;

  const chips = ["ALL", ...GALLERY_CATEGORIES.filter((c) => images.some((i) => i.category === c))];

  return (
    <section id="gallery" className="py-24 md:py-32 bg-muted/60" aria-label="Photo gallery">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <SectionHeading
            eyebrow="Gallery"
            title="A Look Inside Zaura"
            intro="Interiors, textures and light — a preview of the spaces and atmosphere that await you."
          />
          <Reveal delay={0.1}>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Gallery categories">
              {chips.map((c) => (
                <button
                  key={c}
                  role="tab"
                  aria-selected={filter === c}
                  onClick={() => {
                    setFilter(c);
                    setLightbox(null);
                  }}
                  className={cn(
                    "eyebrow rounded-[3px] px-3.5 py-2.5 transition-all duration-300 border",
                    filter === c
                      ? "bg-charcoal text-ivory border-charcoal"
                      : "border-border bg-card text-foreground/70 hover:border-champagne hover:text-foreground"
                  )}
                >
                  {c === "ALL" ? "All" : GALLERY_CATEGORY_LABELS[c] || c}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="mt-14 grid grid-cols-2 md:grid-cols-6 md:auto-rows-[200px] gap-3 md:gap-4">
          {filtered.map((img, i) => (
            <Reveal
              key={img.id}
              delay={(i % 6) * 0.05}
              className={cn("relative overflow-hidden rounded-[3px] group cursor-pointer", SPANS[i % SPANS.length])}
            >
              <button
                className="absolute inset-0 w-full h-full"
                onClick={() => setLightbox(i)}
                aria-label={`Open image: ${img.caption || img.alt}`}
              >
                <Image
                  src={img.url}
                  alt={img.alt || img.caption || "Zaura Zanzibar"}
                  fill
                  sizes="(max-width: 768px) 50vw, 30vw"
                  className="object-cover transition-transform duration-[1400ms] group-hover:scale-[1.06]"
                />
                <span className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/25 transition-colors duration-500" />
                {img.caption && (
                  <span className="absolute bottom-0 inset-x-0 p-3.5 text-left text-ivory text-xs tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-charcoal/70 to-transparent">
                    {img.caption}
                  </span>
                )}
              </button>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox !== null && filtered[lightbox] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-charcoal/95 flex items-center justify-center"
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label="Image lightbox"
          >
            <button className="absolute top-5 right-5 p-2.5 text-ivory hover:text-champagne" onClick={close} aria-label="Close lightbox">
              <X className="h-7 w-7" />
            </button>
            <button
              className="absolute left-4 md:left-8 p-3 text-ivory hover:text-champagne"
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <motion.figure
              key={filtered[lightbox].id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="relative max-w-[86vw] max-h-[82vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-[86vw] md:w-auto md:h-[78vh] aspect-[3/2] md:aspect-auto">
                <Image
                  src={filtered[lightbox].url}
                  alt={filtered[lightbox].alt || "Zaura Zanzibar"}
                  fill
                  sizes="90vw"
                  className="object-contain"
                  priority
                />
              </div>
              {filtered[lightbox].caption && (
                <figcaption className="mt-4 text-center text-ivory/80 text-sm tracking-wide">
                  {filtered[lightbox].caption}
                </figcaption>
              )}
            </motion.figure>
            <button
              className="absolute right-4 md:right-8 p-3 text-ivory hover:text-champagne"
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              aria-label="Next image"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

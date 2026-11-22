"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

const SLIDES = [
  { src: "/images/hero-1.png", alt: "Zaura Zanzibar — boutique apartment residence at golden hour" },
  { src: "/images/hero-2.png", alt: "Elegant living room opening onto an ocean-view terrace" },
  { src: "/images/hero-3.png", alt: "Private terrace at dusk with warm lanterns" },
];

export default function Hero({
  headline,
  subline,
}: {
  headline: string;
  subline: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 7000);
    return () => clearInterval(t);
  }, []);

  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  // Split headline: last two words carry a champagne italic accent
  const words = headline.split(" ");
  const head = words.slice(0, Math.max(0, words.length - 2)).join(" ");
  const accent = words.slice(Math.max(0, words.length - 2)).join(" ");

  return (
    <section id="home" className="relative min-h-[92vh] flex items-end overflow-hidden bg-charcoal" aria-label="Welcome">
      <div className="absolute inset-0">
        {SLIDES.map((s, i) => (
          <div
            key={s.src}
            className={`absolute inset-0 transition-opacity duration-[1600ms] ease-in ${i === index ? "opacity-100" : "opacity-0"}`}
            aria-hidden={i !== index}
          >
            <Image
              src={s.src}
              alt={s.alt}
              fill
              priority={i === 0}
              sizes="100vw"
              className={`object-cover ${i === index ? "kenburns" : ""}`}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/55 via-charcoal/25 to-charcoal/75" />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/45 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 md:px-8 pb-40 md:pb-44 pt-36">
        <motion.h1
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="font-display text-ivory max-w-4xl text-[2.6rem] leading-[1.08] sm:text-6xl md:text-7xl font-medium"
        >
          {head}{" "}
          <span className="italic text-champagne">{accent}</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-6 max-w-xl text-ivory/85 text-base md:text-lg leading-relaxed"
        >
          {subline}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.65 }}
          className="mt-9 flex flex-wrap items-center gap-4"
        >
          <button
            onClick={() => scrollTo("#apartments")}
            className="eyebrow bg-champagne text-charcoal rounded-[3px] px-7 py-4 transition-all duration-300 hover:bg-ivory"
          >
            Explore our apartments
          </button>
          <button
            onClick={() => scrollTo("#experience")}
            className="eyebrow rounded-[3px] border border-ivory/50 text-ivory px-7 py-4 transition-all duration-300 hover:border-ivory hover:bg-ivory/10"
          >
            Experience Zaura
          </button>
        </motion.div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center z-10" aria-hidden>
        <span className="block h-10 w-px bg-ivory/30 relative overflow-hidden">
          <motion.span
            className="absolute top-0 left-0 h-4 w-px bg-champagne"
            animate={{ y: [0, 26, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </div>
    </section>
  );
}

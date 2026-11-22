"use client";

// Editorial primitives shared across the site.

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import {
  Wifi, Snowflake, CookingPot, Bath, Sofa, Sun, Waves, CarFront, Plane,
  Sparkles, KeyRound, ShieldCheck, Clock, Check,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  wifi: Wifi,
  snowflake: Snowflake,
  "cooking-pot": CookingPot,
  cookingpot: CookingPot,
  bath: Bath,
  sofa: Sofa,
  sun: Sun,
  waves: Waves,
  "car-front": CarFront,
  carfront: CarFront,
  plane: Plane,
  sparkles: Sparkles,
  "key-round": KeyRound,
  shield: ShieldCheck,
  clock: Clock,
  check: Check,
};

export function AmenityIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] || Check;
  return <Icon className={className} />;
}

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "article" | "li";
}) {
  const Comp = (motion as unknown as Record<string, typeof motion.div>)[as] || motion.div;
  return (
    <Comp
      className={className}
      variants={revealVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay }}
    >
      {children}
    </Comp>
  );
}

export function Eyebrow({ children, tone = "champagne" }: { children: ReactNode; tone?: "champagne" | "olive" | "ivory" }) {
  const color =
    tone === "champagne" ? "text-champagne" : tone === "olive" ? "text-olive" : "text-ivory/80";
  return (
    <p className={`eyebrow ${color} mb-4 flex items-center gap-3`}>
      <span className="inline-block h-px w-8 bg-current opacity-60" aria-hidden />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  tone = "dark",
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  align?: "left" | "center";
  tone?: "dark" | "light";
}) {
  return (
    <Reveal className={align === "center" ? "text-center" : ""}>
      <div className={align === "center" ? "flex flex-col items-center" : ""}>
        <Eyebrow tone={tone === "light" ? "ivory" : "champagne"}>{eyebrow}</Eyebrow>
        <h2
          className={`font-display text-3xl md:text-[2.75rem] leading-[1.15] font-medium ${
            tone === "light" ? "text-ivory" : "text-foreground"
          }`}
        >
          {title}
        </h2>
        {intro && (
          <p className={`mt-5 max-w-2xl text-[15px] leading-relaxed ${tone === "light" ? "text-ivory/75" : "text-muted-foreground"} ${align === "center" ? "mx-auto" : ""}`}>
            {intro}
          </p>
        )}
      </div>
    </Reveal>
  );
}

export function formatMoney(amount: number, currency: string): string {
  if (!amount || amount <= 0) return "On request";
  return `${currency} ${amount.toLocaleString("en-US")}`;
}

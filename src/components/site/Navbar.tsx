"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useBookingFlow } from "@/store/booking";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#home", label: "Home" },
  { href: "#apartments", label: "Our Apartments" },
  { href: "#experience", label: "Experience" },
  { href: "#gallery", label: "Gallery" },
  { href: "#location", label: "Location" },
  { href: "#contact", label: "Contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const openWizard = useBookingFlow((s) => s.openWizard);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const go = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    else window.location.hash = href;
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-ivory/95 backdrop-blur-md border-b border-border/60 shadow-[0_1px_24px_rgba(36,37,34,0.06)]"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 md:h-20 max-w-7xl items-center justify-between px-5 md:px-8" aria-label="Main navigation">
        <button
          onClick={() => go("#home")}
          className="flex items-center"
          aria-label="Zaura Zanzibar — home"
        >
          <span className="relative block h-12 w-12 md:h-16 md:w-16 overflow-hidden rounded-[4px] shadow-sm">
            <Image src="/brand/logo.png" alt="Zaura Zanzibar logo" fill sizes="64px" className="object-cover" />
          </span>
        </button>

        <ul className="hidden lg:flex items-center gap-8">
          {LINKS.map((l) => (
            <li key={l.href}>
              <button
                onClick={() => go(l.href)}
                className={cn(
                  "eyebrow relative py-2 transition-colors after:absolute after:bottom-0 after:left-1/2 after:h-px after:w-0 after:-translate-x-1/2 after:bg-champagne after:transition-all after:duration-300 hover:after:w-full",
                  scrolled ? "text-foreground/80 hover:text-foreground" : "text-ivory/90 hover:text-ivory"
                )}
              >
                {l.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <button
            onClick={() => openWizard()}
            className={cn(
              "hidden sm:inline-flex eyebrow items-center rounded-[3px] px-5 py-3 transition-all duration-300",
              "bg-charcoal text-ivory hover:bg-champagne hover:text-charcoal"
            )}
          >
            Book your stay
          </button>
          <button
            className={cn("lg:hidden p-2", scrolled ? "text-foreground" : "text-ivory")}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-charcoal/98 flex flex-col"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <span className="relative block h-12 w-12 overflow-hidden rounded-[4px]">
                <Image src="/brand/logo.png" alt="Zaura Zanzibar logo" fill sizes="48px" className="object-cover" />
              </span>
              <button onClick={() => setMobileOpen(false)} className="p-2 text-ivory" aria-label="Close menu">
                <X className="h-6 w-6" />
              </button>
            </div>
            <ul className="flex flex-1 flex-col justify-center gap-2 px-8">
              {LINKS.map((l, i) => (
                <motion.li
                  key={l.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.05 }}
                >
                  <button
                    onClick={() => go(l.href)}
                    className="font-display text-3xl text-ivory/90 py-3 w-full text-left hover:text-champagne transition-colors"
                  >
                    {l.label}
                  </button>
                </motion.li>
              ))}
            </ul>
            <div className="px-8 pb-12">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  openWizard();
                }}
                className="w-full eyebrow bg-champagne text-charcoal rounded-[3px] px-6 py-4"
              >
                Book your stay
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

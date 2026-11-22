"use client";

import Image from "next/image";
import { useBookingFlow } from "@/store/booking";

export default function Footer({ phoneDisplay }: { phoneDisplay: string }) {
  const openWizard = useBookingFlow((s) => s.openWizard);
  const year = new Date().getFullYear();

  const go = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <footer className="mt-auto bg-charcoal text-ivory" aria-label="Footer">
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-16">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <span className="relative block h-10 w-10 overflow-hidden rounded-[4px]">
                <Image src="/brand/logo.png" alt="Zaura Zanzibar logo" fill sizes="40px" className="object-cover" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-display text-xl font-semibold">ZAURA</span>
                <span className="text-[0.6rem] tracking-[0.42em] opacity-90 mt-1">ZANZIBAR</span>
              </span>
            </div>
            <p className="mt-5 text-sm text-ivory/70 leading-relaxed max-w-sm">
              Private, thoughtfully designed apartments in Zanzibar, Tanzania — where contemporary comfort meets the timeless charm of the island.
            </p>
          </div>

          <nav className="md:col-span-3" aria-label="Footer navigation">
            <p className="eyebrow text-champagne mb-5">Explore</p>
            <ul className="space-y-3 text-sm text-ivory/80">
              <li><button onClick={() => go("#apartments")} className="hover:text-champagne transition-colors">Our Apartments</button></li>
              <li><button onClick={() => go("#experience")} className="hover:text-champagne transition-colors">Experience</button></li>
              <li><button onClick={() => go("#gallery")} className="hover:text-champagne transition-colors">Gallery</button></li>
              <li><button onClick={() => go("#location")} className="hover:text-champagne transition-colors">Location</button></li>
              <li><button onClick={() => go("#contact")} className="hover:text-champagne transition-colors">Contact</button></li>
            </ul>
          </nav>

          <div className="md:col-span-4">
            <p className="eyebrow text-champagne mb-5">Reservations</p>
            <p className="text-sm text-ivory/80 leading-relaxed">{phoneDisplay}</p>
            <p className="mt-2 text-sm text-ivory/60 leading-relaxed">WhatsApp preferred · Answered personally</p>
            <button
              onClick={() => openWizard()}
              className="mt-5 eyebrow bg-champagne text-charcoal rounded-[3px] px-6 py-3.5 hover:bg-ivory transition-colors"
            >
              Book your stay
            </button>
          </div>
        </div>

        <div className="mt-14 pt-7 border-t border-ivory/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-ivory/50" suppressHydrationWarning>
            © {year} Zaura Zanzibar · Zanzibar, Tanzania. All rights reserved.
          </p>
          <a
            href="#admin"
            className="text-[11px] text-ivory/40 hover:text-ivory/70 transition-colors tracking-wider"
            title="Staff access"
          >
            Staff Access
          </a>
        </div>
      </div>
    </footer>
  );
}

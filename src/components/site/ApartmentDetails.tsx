"use client";

// Apartment details overlay: gallery, configuration, amenities, availability calendar.

import { useEffect, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AmenityIcon, formatMoney } from "./atoms";
import { useBookingFlow } from "@/store/booking";
import { todayInPropertyTz, toDateKey, localFromKey } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { CategoryDTO, SiteSettingsDTO } from "@/types/site";
import { Users, BedDouble, Maximize, MapPin, X, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

type UnitCalendarResponse = {
  from: string;
  calendar: { date: string; free: number; total: number }[];
};

export default function ApartmentDetails({
  category,
  settings,
  onClose,
}: {
  category: CategoryDTO | null;
  settings: SiteSettingsDTO;
  onClose: () => void;
}) {
  useEffect(() => {
    if (category) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [category]);

  if (!category) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        showCloseButton={false}
        className="max-w-5xl p-0 overflow-hidden gap-0 rounded-[4px] bg-ivory max-h-[92vh] z-[75]"
      >
        <DetailsBody key={category.id} category={category} settings={settings} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function DetailsBody({
  category,
  settings,
  onClose,
}: {
  category: CategoryDTO;
  settings: SiteSettingsDTO;
  onClose: () => void;
}) {
  const openWizard = useBookingFlow((s) => s.openWizard);
  const [imgIndex, setImgIndex] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const today = todayInPropertyTz();

  const cal = useQuery<UnitCalendarResponse>({
    queryKey: ["unit-calendar", category.id, monthOffset],
    queryFn: async () => {
      const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + monthOffset, 1));
      const res = await fetch(`/api/unit-calendar?categoryId=${category.id}&from=${toDateKey(from)}&days=31`);
      if (!res.ok) throw new Error("Could not load availability.");
      return res.json();
    },
  });

  const images = category.images.length ? category.images : [{ url: "/images/hero-2.png", alt: category.name }];
  const cover = images[imgIndex] || images[0];
  const rules = settings.houseRules.split("\n").filter(Boolean);

  // Calendar grid: align first day to weekday
  const firstDay = cal.data?.calendar?.[0];
  const leadingBlanks = firstDay ? localFromKey(firstDay.date).getDay() : 0;
  const monthName = firstDay
    ? localFromKey(firstDay.date).toLocaleString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="overflow-y-auto max-h-[92vh]">
      {/* Gallery */}
      <div className="relative">
        <div className="relative aspect-[16/8] min-h-[280px]">
          <Image src={cover.url} alt={cover.alt || category.name} fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-charcoal/20" />
          <DialogTitle asChild>
            <div className="absolute bottom-6 left-6 md:left-9 right-6">
              <p className="eyebrow text-champagne mb-2">{category.tagline || "Zaura Zanzibar"}</p>
              <h2 className="font-display text-3xl md:text-4xl text-ivory">{category.name}</h2>
            </div>
          </DialogTitle>
          <div className="absolute top-5 right-5 flex gap-2">
            <button onClick={onClose} className="rounded-full bg-charcoal/70 backdrop-blur p-2.5 text-ivory hover:bg-charcoal" aria-label="Close details">
              <X className="h-5 w-5" />
            </button>
          </div>
          {images.length > 1 && (
            <>
              <button
                onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-charcoal/70 backdrop-blur p-2.5 text-ivory hover:bg-charcoal"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-charcoal/70 backdrop-blur p-2.5 text-ivory hover:bg-charcoal"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-4 right-5 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={cn("h-1.5 rounded-full transition-all", i === imgIndex ? "w-6 bg-champagne" : "w-1.5 bg-ivory/50")}
                    aria-label={`Image ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="grid lg:grid-cols-5 gap-8 px-6 md:px-9 py-8">
        <div className="lg:col-span-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Users, label: "Guests", value: `Up to ${category.maxOccupancy}` },
              { icon: BedDouble, label: "Beds", value: category.bedConfiguration || "—" },
              ...(category.sizeSqm ? [{ icon: Maximize, label: "Size", value: `${category.sizeSqm} m²` }] : []),
              ...(category.viewNote ? [{ icon: MapPin, label: "View", value: category.viewNote }] : []),
            ].map((m, i) => (
              <div key={i} className="rounded-[3px] border border-border bg-card px-3 py-3.5">
                <m.icon className="h-4 w-4 text-champagne" />
                <p className="mt-2 text-[0.6rem] eyebrow text-muted-foreground">{m.label}</p>
                <p className="mt-1 text-[13px] font-medium leading-snug">{m.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-7">
            <h3 className="eyebrow text-muted-foreground mb-3">About this apartment</h3>
            <p className="text-[15px] leading-[1.85] text-foreground/80 whitespace-pre-line">{category.description}</p>
          </div>

          {category.amenities.length > 0 && (
            <div className="mt-7">
              <h3 className="eyebrow text-muted-foreground mb-3">Amenities</h3>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                {category.amenities.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-sm text-foreground/75">
                    <AmenityIcon name={a.icon} className="h-4 w-4 text-champagne" />
                    {a.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rules.length > 0 && (
            <div className="mt-7">
              <h3 className="eyebrow text-muted-foreground mb-3">House rules</h3>
              <ul className="space-y-2">
                {rules.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/70">
                    <span className="mt-[7px] h-1 w-1 rounded-full bg-champagne shrink-0" aria-hidden />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-4 space-y-6">
            <div className="rounded-[3px] border border-border bg-card p-5">
              <p className="text-2xl font-display">{formatMoney(category.pricePerNight, category.currency)}</p>
              <p className="text-xs text-muted-foreground mt-1">per night · {category.totalUnits} {category.totalUnits === 1 ? "apartment" : "apartments"} in this collection</p>
              <button
                onClick={() => {
                  onClose();
                  openWizard({ categoryId: category.id });
                }}
                className="mt-5 w-full eyebrow bg-charcoal text-ivory rounded-[3px] px-6 py-4 hover:bg-champagne hover:text-charcoal transition-colors"
              >
                Check availability
              </button>
              <p className="mt-3 text-[11px] text-muted-foreground flex items-start gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-olive shrink-0 mt-0.5" />
                Request to book — no payment required to start.
              </p>
            </div>

            {/* Availability calendar */}
            <div className="rounded-[3px] border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="eyebrow text-muted-foreground">Availability</h3>
                <div className="flex gap-1">
                  <button onClick={() => setMonthOffset((m) => Math.max(0, m - 1))} disabled={monthOffset === 0} className="p-1.5 rounded-[3px] hover:bg-muted disabled:opacity-30" aria-label="Previous month">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setMonthOffset((m) => Math.min(5, m + 1))} className="p-1.5 rounded-[3px] hover:bg-muted" aria-label="Next month">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-display mb-3">{monthName}</p>
              {cal.isLoading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">Loading calendar...</div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                      <span key={i} className="text-[10px] text-muted-foreground py-1">{d}</span>
                    ))}
                    {Array.from({ length: leadingBlanks }).map((_, i) => (
                      <span key={`b${i}`} />
                    ))}
                    {cal.data?.calendar.map((c) => {
                      const day = localFromKey(c.date);
                      const ratio = c.total > 0 ? c.free / c.total : 1;
                      return (
                        <span
                          key={c.date}
                          title={`${c.free} of ${c.total} apartments available`}
                          className={cn(
                            "aspect-square flex items-center justify-center rounded-[3px] text-[11px]",
                            ratio === 1 ? "bg-olive/15 text-olive" : ratio > 0 ? "bg-champagne/25 text-foreground" : "bg-muted text-muted-foreground/50 line-through"
                          )}
                        >
                          {day.getDate()}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px] bg-olive/15" /> Fully available</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px] bg-champagne/25" /> Limited</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px] bg-muted" /> Fully requested</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

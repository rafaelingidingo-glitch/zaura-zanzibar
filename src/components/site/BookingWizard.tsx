"use client";

// Request-to-Book wizard: dates → category & unit → guest details → summary → WhatsApp.

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DateField, GuestSelect } from "./fields";
import { useBookingFlow } from "@/store/booking";
import { localFromKey, todayInPropertyTz, formatKeyLong, parseDateOnly, nightsBetween } from "@/lib/dates";
import { formatMoney } from "./atoms";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { AvailabilityResponse, SiteSettingsDTO } from "@/types/site";
import {
  ChevronLeft, Check, Users, BedDouble, CalendarDays, MessageCircle, ShieldCheck,
  Loader2, Send, Clock, AlertCircle,
} from "lucide-react";

const STEPS = ["Dates", "Apartment", "Your details", "Summary"];

export default function BookingWizard({ settings }: { settings: SiteSettingsDTO }) {
  const flow = useBookingFlow();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [guest, setGuest] = useState({ name: "", phone: "", email: "", requests: "" });
  const [guestErrors, setGuestErrors] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  // One idempotency key per wizard session so network retries never duplicate a request.
  const idempotencyRef = useRef<string>("");

  useEffect(() => {
    if (!flow.open) idempotencyRef.current = "";
  }, [flow.open]);

  const todayKey = todayInPropertyTz().toISOString().slice(0, 10);

  // Availability for chosen dates & guests
  const availability = useQuery<AvailabilityResponse>({
    queryKey: ["availability", flow.checkIn, flow.checkOut, flow.adults, flow.children, flow.categoryId],
    enabled: flow.open && Boolean(flow.checkIn && flow.checkOut && flow.step >= 2),
    queryFn: async () => {
      const params = new URLSearchParams({
        checkIn: flow.checkIn,
        checkOut: flow.checkOut,
        adults: String(flow.adults),
        children: String(flow.children),
      });
      if (flow.categoryId) params.set("categoryId", flow.categoryId);
      const res = await fetch(`/api/availability?${params.toString()}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not load availability.");
      }
      return res.json();
    },
  });

  const nights = useMemo(() => {
    const ci = parseDateOnly(flow.checkIn);
    const co = parseDateOnly(flow.checkOut);
    return ci && co ? nightsBetween(ci, co) : 0;
  }, [flow.checkIn, flow.checkOut]);

  const selectedCategory = availability.data?.categories.find((c) => c.id === flow.categoryId);
  const selectedUnit = availability.data?.unitDetail?.units.find((u) => u.id === flow.unitId);
  const pricePerNight = selectedUnit?.pricePerNight ?? selectedCategory?.pricePerNight ?? 0;
  const estTotal = Math.round(pricePerNight * nights * 100) / 100;

  // Hold countdown after success
  useEffect(() => {
    if (flow.step !== 5 || !flow.result?.holdExpiresAt) return;
    const target = new Date(flow.result.holdExpiresAt).getTime();
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((target - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [flow.step, flow.result?.holdExpiresAt]);

  const validateGuest = () => {
    const errs: Record<string, string> = {};
    if (guest.name.trim().length < 2) errs.name = "Please enter your full name.";
    if (guest.phone.replace(/[^\d]/g, "").length < 7) errs.phone = "A valid phone number is required.";
    if (guest.email && !/^\S+@\S+\.\S+$/.test(guest.email)) errs.email = "Please enter a valid email address.";
    setGuestErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitRequest = async () => {
    if (!idempotencyRef.current) {
      idempotencyRef.current = `zz-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn: flow.checkIn,
          checkOut: flow.checkOut,
          categoryId: flow.categoryId,
          unitId: flow.unitId || "",
          adults: flow.adults,
          children: flow.children,
          guestName: guest.name.trim(),
          guestPhone: guest.phone.trim(),
          guestEmail: guest.email.trim(),
          specialRequests: guest.requests.trim(),
          contactChoice: flow.contactChoice,
          idempotencyKey: idempotencyRef.current,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Your request could not be created.");
      flow.setResult(json.booking, json.whatsapp);
      flow.setStep(5);
    } catch (err) {
      toast({
        title: "Could not create your request",
        description: err instanceof Error ? err.message : "Please review your details and try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openWhatsApp = (link?: string) => {
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  };

  const mm = secondsLeft !== null ? Math.floor(secondsLeft / 60) : null;
  const ss = secondsLeft !== null ? secondsLeft % 60 : null;

  return (
    <Dialog open={flow.open} onOpenChange={(o) => !o && flow.closeWizard()}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-3xl md:max-w-4xl lg:max-w-5xl p-0 overflow-hidden gap-0 rounded-[4px] bg-ivory max-h-[92vh] z-[75]"
      >
        <div className="flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="px-6 md:px-10 pt-7 pb-5 border-b border-border/70 bg-ivory pr-16">
            <DialogTitle asChild>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-2xl md:text-3xl">
                  {flow.step === 5 ? "Your request is reserved" : "Request Your Stay"}
                </h2>
                <span className="eyebrow text-champagne hidden sm:block">Zaura Zanzibar</span>
              </div>
            </DialogTitle>
            {flow.step < 5 && (
              <ol className="mt-5 flex items-center gap-2 md:gap-3" aria-label="Booking steps">
                {STEPS.map((label, i) => {
                  const n = i + 1;
                  const active = flow.step === n;
                  const done = flow.step > n;
                  return (
                    <li key={label} className="flex items-center gap-2 md:gap-3">
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium transition-colors",
                          active ? "bg-charcoal text-ivory" : done ? "bg-champagne text-charcoal" : "border border-border text-muted-foreground"
                        )}
                        aria-current={active ? "step" : undefined}
                      >
                        {done ? <Check className="h-3.5 w-3.5" /> : n}
                      </span>
                      <span className={cn("text-xs tracking-wide hidden md:block", active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                      {i < STEPS.length - 1 && <span className="h-px w-4 md:w-8 bg-border" aria-hidden />}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 md:px-10 py-7">
            {/* STEP 1 — Dates */}
            {flow.step === 1 && (
              <div>
                <p className="text-[15px] text-muted-foreground leading-relaxed mb-7">
                  Choose your check-in and check-out dates. You will select your apartment in the next step.
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <DateField
                    label="Check-in"
                    value={flow.checkIn}
                    placeholder="Add date"
                    disabledBefore={localFromKey(todayKey)}
                    onChange={(v) => flow.setDates(v, flow.checkOut && v >= flow.checkOut ? "" : flow.checkOut)}
                  />
                  <DateField
                    label="Check-out"
                    value={flow.checkOut}
                    placeholder="Add date"
                    disabledBefore={flow.checkIn ? new Date(localFromKey(flow.checkIn).getTime() + 86400000) : new Date(localFromKey(todayKey).getTime() + 86400000)}
                    onChange={(v) => flow.setDates(flow.checkIn, v)}
                  />
                  <GuestSelect label="Adults" value={flow.adults} onChange={(n) => flow.setGuests(n, flow.children)} max={10} min={1} />
                  <GuestSelect label="Children" value={flow.children} onChange={(n) => flow.setGuests(flow.adults, n)} max={7} />
                </div>
                {nights > 0 && (
                  <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4 text-champagne" />
                    {nights} {nights === 1 ? "night" : "nights"} · {formatKeyLong(flow.checkIn)} → {formatKeyLong(flow.checkOut)}
                  </p>
                )}
              </div>
            )}

            {/* STEP 2 — Category & unit */}
            {flow.step === 2 && (
              <div>
                {availability.isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                    <Loader2 className="h-7 w-7 animate-spin text-champagne" />
                    <p className="text-sm">Checking live availability...</p>
                  </div>
                ) : availability.isError ? (
                  <div className="flex flex-col items-center py-14 gap-3 text-center">
                    <AlertCircle className="h-7 w-7 text-destructive" />
                    <p className="text-sm text-destructive">{(availability.error as Error).message}</p>
                    <Button variant="outline" onClick={() => availability.refetch()} className="rounded-[3px]">Try again</Button>
                  </div>
                ) : (
                  <>
                    {/* Dates recap + edit */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[3px] bg-card border border-border px-4 py-3 mb-7">
                      <p className="text-sm text-foreground/80">
                        <span className="font-medium">{formatKeyLong(flow.checkIn)}</span> → <span className="font-medium">{formatKeyLong(flow.checkOut)}</span>
                        <span className="text-muted-foreground"> · {nights} {nights === 1 ? "night" : "nights"} · {flow.adults + flow.children} {flow.adults + flow.children === 1 ? "guest" : "guests"}</span>
                      </p>
                      <Button variant="ghost" onClick={() => flow.setStep(1)} className="eyebrow text-[0.6rem] text-champagne hover:text-charcoal rounded-[3px] px-3 py-2 h-auto">
                        Edit dates
                      </Button>
                    </div>

                    <h3 className="eyebrow text-muted-foreground mb-4">1 · Choose accommodation type</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availability.data?.categories.map((c) => {
                        const selected = flow.categoryId === c.id;
                        const reason = !c.fitsGuests ? "Too few rooms for your party" : c.availableUnits === 0 ? "Fully requested" : null;
                        return (
                          <button
                            key={c.id}
                            disabled={!c.available}
                            onClick={() => flow.setCategory(c.id)}
                            className={cn(
                              "text-left rounded-[3px] border p-4 transition-all duration-300",
                              selected ? "border-champagne bg-champagne/10 shadow-[0_6px_24px_rgba(197,164,119,0.18)]" : "border-border bg-card hover:border-champagne/60",
                              !c.available && "opacity-55 cursor-not-allowed"
                            )}
                            aria-pressed={selected}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-display text-lg leading-snug">{c.name}</p>
                                <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                                  <Users className="h-3.5 w-3.5" /> up to {c.maxOccupancy} guests
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1.5">
                                  <BedDouble className="h-3.5 w-3.5" /> {c.bedConfiguration || "—"}
                                </p>
                              </div>
                              {selected && <Check className="h-5 w-5 text-champagne shrink-0" />}
                            </div>
                            <div className="mt-3 flex items-baseline justify-between">
                              <span className="text-sm font-medium">{formatMoney(c.pricePerNight, c.currency)}<span className="text-muted-foreground font-normal text-xs"> / night</span></span>
                              <span className={cn("text-xs", c.available ? "text-olive" : "text-destructive")}>
                                {reason || `${c.availableUnits} available`}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Units */}
                    {flow.categoryId && availability.data?.unitDetail && (
                      <>
                        <h3 className="eyebrow text-muted-foreground mt-9 mb-2">2 · Choose your apartment</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                          Each apartment is individually reserved. Pick a specific apartment, or let us assign the best one available.
                        </p>
                        <button
                          type="button"
                          onClick={() => flow.setUnit(null)}
                          aria-pressed={flow.unitId === null}
                          className={cn(
                            "cursor-pointer rounded-[3px] border px-4 py-3.5 flex items-center justify-between transition-all mb-3 w-full text-left",
                            flow.unitId === null ? "border-champagne bg-champagne/10" : "border-border bg-card hover:border-champagne/50"
                          )}
                        >
                          <span className="text-sm">No preference — assign me the best available apartment</span>
                          {flow.unitId === null && <Check className="h-4 w-4 text-champagne" />}
                        </button>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {availability.data.unitDetail.units.map((u) => {
                            const selected = flow.unitId === u.id;
                            const label = u.available ? "Available" : u.reason === "BOOKED" ? "Temporarily held" : u.reason === "MAINTENANCE" ? "Maintenance" : "Unavailable";
                            return (
                              <button
                                key={u.id}
                                disabled={!u.available}
                                onClick={() => flow.setUnit(u.id)}
                                className={cn(
                                  "text-left rounded-[3px] border p-4 transition-all duration-300",
                                  selected ? "border-champagne bg-champagne/10" : "border-border bg-card",
                                  u.available ? "hover:border-champagne/60" : "opacity-50 cursor-not-allowed bg-muted/50"
                                )}
                                aria-pressed={selected}
                              >
                                <div className="flex items-center justify-between">
                                  <p className="font-display text-base">{u.name}</p>
                                  {selected && <Check className="h-4 w-4 text-champagne" />}
                                </div>
                                <p className="mt-1.5 text-xs text-muted-foreground">
                                  {u.available ? `${formatMoney(u.pricePerNight, availability.data?.currency || "USD")} / night · up to ${u.maxOccupancy} guests` : label}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* STEP 3 — Guest details */}
            {flow.step === 3 && (
              <div className="max-w-2xl">
                <p className="text-[15px] text-muted-foreground leading-relaxed mb-7">
                  Your request will be saved and held for a short time. You will finish the conversation directly with our team on WhatsApp.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="bw-name" className="text-xs font-medium tracking-wide">Full name *</Label>
                    <Input id="bw-name" className="zaura-input rounded-[3px] h-11" value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} placeholder="e.g. John Doe" autoComplete="name" />
                    {guestErrors.name && <p className="text-xs text-destructive">{guestErrors.name}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bw-phone" className="text-xs font-medium tracking-wide">Phone number (WhatsApp) *</Label>
                    <Input id="bw-phone" className="zaura-input rounded-[3px] h-11" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} placeholder="+254 / +255 ..." autoComplete="tel" />
                    {guestErrors.phone && <p className="text-xs text-destructive">{guestErrors.phone}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bw-email" className="text-xs font-medium tracking-wide">Email (optional)</Label>
                    <Input id="bw-email" type="email" className="zaura-input rounded-[3px] h-11" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} placeholder="you@example.com" autoComplete="email" />
                    {guestErrors.email && <p className="text-xs text-destructive">{guestErrors.email}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="bw-requests" className="text-xs font-medium tracking-wide">Special requests (optional)</Label>
                    <Textarea id="bw-requests" rows={3} className="zaura-input rounded-[3px] resize-none" value={guest.requests} onChange={(e) => setGuest({ ...guest, requests: e.target.value })} placeholder="Airport pick-up, late check-in, celebrations..." />
                  </div>
                </div>

                {settings.primaryContact === "GUEST_CHOICE" && (
                  <div className="mt-7">
                    <Label className="eyebrow text-muted-foreground text-[0.6rem] mb-3 block">Send my request to</Label>
                    <RadioGroup
                      value={flow.contactChoice}
                      onValueChange={(v) => flow.setContactChoice(v as "PRIMARY" | "SECONDARY")}
                      className="grid sm:grid-cols-2 gap-3"
                    >
                      {[
                        { value: "PRIMARY", label: "Reservations Line 1", phone: settings.whatsappPrimary },
                        { value: "SECONDARY", label: "Reservations Line 2", phone: settings.whatsappSecondary },
                      ].map((opt) => (
                        <Label
                          key={opt.value}
                          htmlFor={`bw-contact-${opt.value}`}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-[3px] border px-4 py-3.5 transition-colors",
                            flow.contactChoice === opt.value ? "border-champagne bg-champagne/10" : "border-border bg-card"
                          )}
                        >
                          <RadioGroupItem id={`bw-contact-${opt.value}`} value={opt.value} />
                          <span>
                            <span className="block text-sm font-medium">{opt.label}</span>
                            <span className="block text-xs text-muted-foreground mt-0.5">{opt.phone}</span>
                          </span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4 — Summary */}
            {flow.step === 4 && (
              <div className="max-w-2xl">
                <div className="rounded-[3px] border border-border bg-card overflow-hidden">
                  <div className="px-6 py-5 border-b border-border/70 bg-muted/40">
                    <p className="eyebrow text-champagne">Booking summary</p>
                  </div>
                  <dl className="px-6 py-5 grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    <div><dt className="text-muted-foreground text-xs">Apartment type</dt><dd className="mt-1 font-medium">{selectedCategory?.name || "—"}</dd></div>
                    <div><dt className="text-muted-foreground text-xs">Apartment</dt><dd className="mt-1 font-medium">{flow.unitId ? selectedUnit?.name : "Best available — assigned by our team"}</dd></div>
                    <div><dt className="text-muted-foreground text-xs">Check-in</dt><dd className="mt-1 font-medium">{formatKeyLong(flow.checkIn)}</dd></div>
                    <div><dt className="text-muted-foreground text-xs">Check-out</dt><dd className="mt-1 font-medium">{formatKeyLong(flow.checkOut)}</dd></div>
                    <div><dt className="text-muted-foreground text-xs">Guests</dt><dd className="mt-1 font-medium">{flow.adults} adults{flow.children ? ` + ${flow.children} children` : ""}</dd></div>
                    <div><dt className="text-muted-foreground text-xs">Nights</dt><dd className="mt-1 font-medium">{nights}</dd></div>
                    <div><dt className="text-muted-foreground text-xs">Price per night</dt><dd className="mt-1 font-medium">{formatMoney(pricePerNight, selectedCategory?.currency || settings.currency)}</dd></div>
                    <div><dt className="text-muted-foreground text-xs">Estimated total</dt><dd className="mt-1 font-medium text-champagne">{formatMoney(estTotal, selectedCategory?.currency || settings.currency)}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-muted-foreground text-xs">Guest</dt><dd className="mt-1 font-medium">{guest.name || "—"} · {guest.phone}{guest.email ? ` · ${guest.email}` : ""}</dd></div>
                    {guest.requests && <div className="sm:col-span-2"><dt className="text-muted-foreground text-xs">Special requests</dt><dd className="mt-1">{guest.requests}</dd></div>}
                  </dl>
                  <div className="px-6 py-4 border-t border-border/70 bg-muted/40 flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                    <Clock className="h-4 w-4 text-champagne shrink-0 mt-0.5" />
                    On submission, this apartment is held for you for {settings.pendingExpiryMinutes} minutes while you complete your WhatsApp request. Opening WhatsApp does not send the message automatically — you will need to press SEND.
                  </div>
                </div>
                <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-olive shrink-0 mt-0.5" />
                  A request is not a confirmation. Our team confirms availability personally and replies with reservation details.
                </p>
              </div>
            )}

            {/* STEP 5 — Success */}
            {flow.step === 5 && flow.result && (
              <div className="max-w-2xl mx-auto text-center py-4">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-whatsapp/10 border border-whatsapp/30">
                  <Check className="h-7 w-7 text-whatsapp" />
                </span>
                <h3 className="mt-5 font-display text-3xl">Thank you, {flow.result.guestName.split(" ")[0]}.</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your booking request has been saved. Your reference is
                </p>
                <p className="mt-3 font-display text-2xl tracking-wide text-champagne" aria-label="Booking reference">
                  {flow.result.reference}
                </p>
                {secondsLeft !== null && secondsLeft > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-champagne" />
                    Your apartment is held for approximately {mm}m {String(ss).padStart(2, "0")}s — press SEND in WhatsApp now.
                  </p>
                )}

                <div className="mt-7 rounded-[3px] border border-whatsapp/30 bg-whatsapp/5 p-5 text-left">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-whatsapp" />
                    One step remains — send your request on WhatsApp
                  </p>
                  <ol className="mt-3 space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
                    <li>Tap the button below — WhatsApp opens with your booking request pre-filled.</li>
                    <li>Press <span className="font-medium text-foreground">SEND</span> in WhatsApp to deliver it to our team.</li>
                    <li>We reply personally to confirm availability and reservation details.</li>
                  </ol>
                  <div className="mt-5 grid sm:grid-cols-2 gap-3">
                    {flow.whatsappLinks.primary && (
                      <Button
                        onClick={() => openWhatsApp(flow.whatsappLinks.primary)}
                        className="h-12 eyebrow bg-whatsapp text-ivory rounded-[3px] hover:bg-whatsapp/90 transition-colors"
                      >
                        <Send className="h-4 w-4" /> Open WhatsApp
                      </Button>
                    )}
                    {flow.whatsappLinks.secondary && (
                      <Button
                        onClick={() => openWhatsApp(flow.whatsappLinks.secondary)}
                        variant="outline"
                        className="h-12 eyebrow rounded-[3px] border-whatsapp/50 text-whatsapp hover:bg-whatsapp/10"
                      >
                        <Send className="h-4 w-4" /> Line 2 instead
                      </Button>
                    )}
                  </div>
                  {!flow.whatsappLinks.primary && !flow.whatsappLinks.secondary && (
                    <p className="mt-4 text-sm text-destructive">
                      No WhatsApp contact is configured. Please call {settings.propertyPhoneDisplay} and quote your reference.
                    </p>
                  )}
                </div>
                <p className="mt-5 text-xs text-muted-foreground">
                  Keep your reference {flow.result.reference} — quote it in any conversation with our team.
                </p>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-6 md:px-10 py-5 border-t border-border/70 bg-ivory flex items-center justify-between gap-3">
            {flow.step === 1 && (
              <>
                <Button variant="ghost" onClick={flow.closeWizard} className="rounded-[3px] text-muted-foreground">Cancel</Button>
                <Button
                  onClick={() => {
                    if (!flow.checkIn || !flow.checkOut) return toast({ title: "Select your dates", description: "Please choose check-in and check-out dates.", variant: "destructive" });
                    if (flow.checkOut <= flow.checkIn) return toast({ title: "Check your dates", description: "Check-out must be after check-in.", variant: "destructive" });
                    flow.setStep(2);
                  }}
                  className="eyebrow bg-charcoal text-ivory rounded-[3px] px-6 py-3 hover:bg-champagne hover:text-charcoal"
                >
                  Continue
                </Button>
              </>
            )}
            {flow.step === 2 && (
              <>
                <Button variant="ghost" onClick={() => flow.setStep(1)} className="rounded-[3px] text-muted-foreground gap-1.5">
                  <ChevronLeft className="h-4 w-4" /> Dates
                </Button>
                <Button
                  onClick={() => flow.setStep(3)}
                  disabled={!flow.categoryId || !flow.checkIn || !flow.checkOut || availability.isLoading}
                  className="eyebrow bg-charcoal text-ivory rounded-[3px] px-6 py-3 hover:bg-champagne hover:text-charcoal disabled:opacity-50"
                >
                  Continue
                </Button>
              </>
            )}
            {flow.step === 3 && (
              <>
                <Button variant="ghost" onClick={() => flow.setStep(2)} className="rounded-[3px] text-muted-foreground gap-1.5">
                  <ChevronLeft className="h-4 w-4" /> Apartment
                </Button>
                <Button
                  onClick={() => {
                    if (validateGuest()) flow.setStep(4);
                  }}
                  className="eyebrow bg-charcoal text-ivory rounded-[3px] px-6 py-3 hover:bg-champagne hover:text-charcoal"
                >
                  Review request
                </Button>
              </>
            )}
            {flow.step === 4 && (
              <>
                <Button variant="ghost" onClick={() => flow.setStep(3)} className="rounded-[3px] text-muted-foreground gap-1.5">
                  <ChevronLeft className="h-4 w-4" /> Details
                </Button>
                <Button
                  onClick={submitRequest}
                  disabled={submitting}
                  className="eyebrow bg-whatsapp text-ivory rounded-[3px] px-6 py-3 hover:bg-whatsapp/90 disabled:opacity-60 gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  {submitting ? "Reserving..." : "Request your stay via WhatsApp"}
                </Button>
              </>
            )}
            {flow.step === 5 && (
              <>
                <span className="text-xs text-muted-foreground">Reference {flow.result?.reference}</span>
                <Button variant="outline" onClick={flow.closeWizard} className="rounded-[3px] eyebrow">
                  Done
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { Reveal, SectionHeading } from "./atoms";
import { MapPin, ExternalLink, MessageCircle, Mail, Send, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { waLink } from "@/lib/whatsapp";
import type { SiteSettingsDTO } from "@/types/site";

export default function LocationContact({ settings }: { settings: SiteSettingsDTO }) {
  const { toast } = useToast();
  const locationBlock = { title: "Find Us in Zanzibar", subtitle: "Zanzibar, Tanzania" };
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not send your message.");
      setSent(true);
      setForm({ name: "", email: "", phone: "", message: "" });
      toast({ title: "Message sent", description: "Thank you — the Zaura team will be in touch shortly." });
      // Allow sending another message without a page reload.
      window.setTimeout(() => setSent(false), 6000);
    } catch (err) {
      toast({ title: "Could not send message", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const primary = waLink(settings.whatsappPrimary, "Hello Zaura Zanzibar Team,\n\nI have a question about staying at Zaura Zanzibar.");
  const secondary = waLink(settings.whatsappSecondary, "Hello Zaura Zanzibar Team,\n\nI have a question about staying at Zaura Zanzibar.");

  return (
    <>
      {/* LOCATION */}
      <section id="location" className="py-24 md:py-32" aria-label="Location">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <Reveal className="lg:col-span-5">
              <SectionHeading eyebrow="Location" title={locationBlock.title} />
              <div className="mt-6 flex items-start gap-3 text-muted-foreground">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-champagne" />
                <div>
                  <p className="text-foreground font-medium tracking-wide">Zanzibar, Tanzania</p>
                  <p className="mt-3 text-[15px] leading-[1.85]">{settings.locationDescription}</p>
                </div>
              </div>
              <a
                href={settings.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex items-center gap-2 eyebrow border border-charcoal text-charcoal rounded-[3px] px-6 py-3.5 hover:bg-charcoal hover:text-ivory transition-colors"
              >
                Get directions <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Reveal>
            <Reveal className="lg:col-span-7" delay={0.1}>
              {settings.mapEmbedUrl ? (
                <div className="aspect-[16/10] rounded-[3px] overflow-hidden border border-border shadow-lg">
                  <iframe src={settings.mapEmbedUrl} title="Zaura Zanzibar location map" className="w-full h-full" loading="lazy" />
                </div>
              ) : (
                <div className="relative aspect-[16/10] rounded-[3px] overflow-hidden">
                  <Image src="/images/gal-exterior.png" alt="Zanzibar, Tanzania" fill sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" />
                  <div className="absolute inset-0 bg-charcoal/30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-charcoal/85 backdrop-blur-sm text-ivory px-8 py-6 rounded-[3px] text-center max-w-sm">
                      <MapPin className="h-6 w-6 text-champagne mx-auto mb-3" />
                      <p className="font-display text-xl">Zanzibar, Tanzania</p>
                      <p className="mt-2 text-sm text-ivory/75">Detailed arrival directions are shared with every confirmed guest.</p>
                    </div>
                  </div>
                </div>
              )}
            </Reveal>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-24 md:py-32 bg-muted/60" aria-label="Contact us">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <SectionHeading
            eyebrow="Contact"
            title="We Are Here For You"
            intro="Questions, special requests or travel planning — reach the Zaura team directly on WhatsApp, or send us a message below."
          />
          <div className="mt-14 grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Contact channels */}
            <Reveal>
              <div className="space-y-5">
                <div className="rounded-[3px] border border-border bg-card p-6">
                  <p className="eyebrow text-champagne mb-4">WhatsApp reservations</p>
                  <div className="space-y-3">
                    <a
                      href={primary}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-[3px] border border-border px-4 py-3.5 hover:border-whatsapp hover:bg-whatsapp/5 transition-colors group"
                    >
                      <span className="flex items-center gap-3">
                        <MessageCircle className="h-5 w-5 text-whatsapp" />
                        <span>
                          <span className="block text-sm font-medium">Reservations Line 1</span>
                          <span className="block text-xs text-muted-foreground mt-0.5">{settings.whatsappPrimary}</span>
                        </span>
                      </span>
                      <span className="eyebrow text-[0.6rem] text-whatsapp opacity-0 group-hover:opacity-100 transition-opacity">Chat</span>
                    </a>
                    <a
                      href={secondary}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-[3px] border border-border px-4 py-3.5 hover:border-whatsapp hover:bg-whatsapp/5 transition-colors group"
                    >
                      <span className="flex items-center gap-3">
                        <MessageCircle className="h-5 w-5 text-whatsapp" />
                        <span>
                          <span className="block text-sm font-medium">Reservations Line 2</span>
                          <span className="block text-xs text-muted-foreground mt-0.5">{settings.whatsappSecondary}</span>
                        </span>
                      </span>
                      <span className="eyebrow text-[0.6rem] text-whatsapp opacity-0 group-hover:opacity-100 transition-opacity">Chat</span>
                    </a>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                    WhatsApp is the fastest way to reach us — messages are answered personally by the Zaura team.
                  </p>
                </div>

                {settings.contactEmail && (
                  <div className="rounded-[3px] border border-border bg-card p-6 flex items-center gap-4">
                    <Mail className="h-5 w-5 text-champagne" />
                    <div>
                      <p className="eyebrow text-muted-foreground text-[0.6rem]">Email</p>
                      <a href={`mailto:${settings.contactEmail}`} className="text-sm font-medium hover:text-champagne transition-colors">
                        {settings.contactEmail}
                      </a>
                    </div>
                  </div>
                )}

                {settings.instagramProfileUrl && (
                  <div className="rounded-[3px] border border-border bg-card p-6 flex items-center gap-4">
                    <ExternalLink className="h-5 w-5 text-champagne" />
                    <div>
                      <p className="eyebrow text-muted-foreground text-[0.6rem]">Instagram</p>
                      <a href={settings.instagramProfileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-champagne transition-colors">
                        Follow Zaura Zanzibar
                      </a>
                    </div>
                  </div>
                )}

                <div className="rounded-[3px] bg-charcoal text-ivory p-6">
                  <p className="eyebrow text-champagne mb-3">Prefer to speak with us?</p>
                  <a
                    href={`tel:${settings.propertyPhoneDisplay.replace(/[^+\d]/g, "")}`}
                    className="text-sm text-ivory/85 leading-relaxed hover:text-champagne transition-colors"
                  >
                    {settings.propertyPhoneDisplay}
                  </a>
                </div>
              </div>
            </Reveal>

            {/* Contact form */}
            <Reveal delay={0.1}>
              <form onSubmit={submit} className="rounded-[3px] border border-border bg-card p-6 md:p-8" aria-label="Contact form">
                <p className="eyebrow text-champagne mb-6">Send a message</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="c-name" className="text-xs font-medium tracking-wide">Full name *</label>
                    <Input id="c-name" required minLength={2} className="zaura-input rounded-[3px] h-11" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="c-phone" className="text-xs font-medium tracking-wide">Phone</label>
                    <Input id="c-phone" className="zaura-input rounded-[3px] h-11" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+255 ..." />
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-1.5">
                  <label htmlFor="c-email" className="text-xs font-medium tracking-wide">Email</label>
                  <Input id="c-email" type="email" className="zaura-input rounded-[3px] h-11" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
                </div>
                <div className="mt-4 flex flex-col gap-1.5">
                  <label htmlFor="c-message" className="text-xs font-medium tracking-wide">Message *</label>
                  <Textarea id="c-message" required minLength={5} rows={5} className="zaura-input rounded-[3px] resize-none" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us how we can help..." />
                </div>
                <Button
                  type="submit"
                  disabled={sending || sent}
                  className="mt-6 w-full eyebrow h-12 bg-charcoal text-ivory rounded-[3px] hover:bg-champagne hover:text-charcoal transition-colors disabled:opacity-60"
                >
                  {sending ? (
                    "Sending..."
                  ) : sent ? (
                    <>
                      <Check className="h-4 w-4" /> Message sent
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" /> Send message
                    </>
                  )}
                </Button>
                <p className="mt-3 text-[11px] text-muted-foreground text-center">
                  We reply personally — usually within a few hours.
                </p>
              </form>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}

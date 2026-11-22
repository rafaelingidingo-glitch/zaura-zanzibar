"use client";

// Business settings: contacts, booking engine, homepage content, house rules, password.

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPut } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

type Settings = Record<string, string>;

export default function SettingsAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<{ settings: Settings }>({
    queryKey: ["admin-settings"],
    queryFn: () => apiGet("/api/admin/settings"),
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-champagne" /></div>;
  if (!data?.settings) return <p className="text-sm text-muted-foreground">Settings could not be loaded.</p>;

  return <SettingsForm initial={data.settings} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-settings"] })} onErrorToast={toast} />;
}

function SettingsForm({
  initial,
  onSaved,
  onErrorToast,
}: {
  initial: Settings;
  onSaved: () => void;
  onErrorToast: ReturnType<typeof useToast>["toast"];
}) {
  const [form, setForm] = useState<Settings>(initial);

  const save = useMutation({
    mutationFn: () => apiPut("/api/admin/settings", form),
    onSuccess: () => {
      onSaved();
      onErrorToast({ title: "Settings saved" });
    },
    onError: (e: Error) => onErrorToast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(initial) !== JSON.stringify(form);

  return (
    <div className="space-y-6 max-w-3xl">
      <Section title="Booking contacts" hint="Guests are directed to these WhatsApp lines. Choose which line receives booking requests.">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="WhatsApp primary"><Input className="zaura-input rounded-[3px] h-10" value={form.whatsappPrimary || ""} onChange={(e) => set("whatsappPrimary", e.target.value)} /></Field>
          <Field label="WhatsApp secondary"><Input className="zaura-input rounded-[3px] h-10" value={form.whatsappSecondary || ""} onChange={(e) => set("whatsappSecondary", e.target.value)} /></Field>
        </div>
        <div className="mt-4">
          <Label className="eyebrow text-muted-foreground text-[0.6rem] mb-3 block">Primary booking contact</Label>
          <RadioGroup value={form.primaryContact || "GUEST_CHOICE"} onValueChange={(v) => set("primaryContact", v)} className="flex flex-wrap gap-3">
            {[
              { value: "PRIMARY", label: "Line 1 only" },
              { value: "SECONDARY", label: "Line 2 only" },
              { value: "GUEST_CHOICE", label: "Let guests choose" },
            ].map((o) => (
              <Label key={o.value} htmlFor={`pc-${o.value}`} className="flex cursor-pointer items-center gap-2.5 rounded-[3px] border border-border px-4 py-3 has-[[data-state=checked]]:border-champagne has-[[data-state=checked]]:bg-champagne/10">
                <RadioGroupItem id={`pc-${o.value}`} value={o.value} />
                <span className="text-sm">{o.label}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <Field label="Contact email (optional)"><Input type="email" className="zaura-input rounded-[3px] h-10" value={form.contactEmail || ""} onChange={(e) => set("contactEmail", e.target.value)} /></Field>
          <Field label="Phone numbers displayed (contact section)"><Input className="zaura-input rounded-[3px] h-10" value={form.propertyPhoneDisplay || ""} onChange={(e) => set("propertyPhoneDisplay", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Booking engine" hint="Pending requests temporarily hold the selected apartment. After the hold expires, inventory is released automatically.">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Pending hold duration (minutes)"><Input type="number" min="5" max="1440" className="zaura-input rounded-[3px] h-10" value={form.pendingExpiryMinutes || "15"} onChange={(e) => set("pendingExpiryMinutes", e.target.value)} /></Field>
          <Field label="Currency code"><Input className="zaura-input rounded-[3px] h-10" value={form.currency || "USD"} onChange={(e) => set("currency", e.target.value.toUpperCase())} /></Field>
        </div>
      </Section>

      <Section title="Homepage content">
        <div className="flex flex-col gap-4">
          <Field label="Hero headline"><Input className="zaura-input rounded-[3px] h-10" value={form.heroHeadline || ""} onChange={(e) => set("heroHeadline", e.target.value)} /></Field>
          <Field label="Hero subline"><Textarea rows={2} className="zaura-input rounded-[3px] resize-none" value={form.heroSubline || ""} onChange={(e) => set("heroSubline", e.target.value)} /></Field>
          <Field label="Brand tagline (brand values row)"><Input className="zaura-input rounded-[3px] h-10" value={form.brandTagline || ""} onChange={(e) => set("brandTagline", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Instagram" hint="The reel is embedded in the Experience section. The profile link appears once supplied.">
        <div className="flex flex-col gap-4">
          <Field label="Featured reel URL"><Input className="zaura-input rounded-[3px] h-10" value={form.instagramReelUrl || ""} onChange={(e) => set("instagramReelUrl", e.target.value)} /></Field>
          <Field label="Instagram profile URL (optional)"><Input className="zaura-input rounded-[3px] h-10" value={form.instagramProfileUrl || ""} onChange={(e) => set("instagramProfileUrl", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Location" hint="The exact address is intentionally withheld until supplied by the business.">
        <div className="flex flex-col gap-4">
          <Field label="Location description"><Textarea rows={3} className="zaura-input rounded-[3px] resize-none" value={form.locationDescription || ""} onChange={(e) => set("locationDescription", e.target.value)} /></Field>
          <Field label="Google Maps embed URL (optional)"><Input className="zaura-input rounded-[3px] h-10" value={form.mapEmbedUrl || ""} onChange={(e) => set("mapEmbedUrl", e.target.value)} placeholder="https://www.google.com/maps/embed?pb=..." /></Field>
          <Field label="Directions link"><Input className="zaura-input rounded-[3px] h-10" value={form.directionsUrl || ""} onChange={(e) => set("directionsUrl", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="House rules" hint="One rule per line — shown on apartment details pages.">
        <Textarea rows={6} className="zaura-input rounded-[3px] resize-none font-mono text-[13px]" value={form.houseRules || ""} onChange={(e) => set("houseRules", e.target.value)} />
      </Section>

      <div className="flex justify-end sticky bottom-4">
        <Button
          onClick={() => save.mutate()}
          disabled={save.isPending || !dirty}
          className="rounded-[3px] bg-charcoal text-ivory hover:bg-champagne hover:text-charcoal gap-2 shadow-lg"
        >
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </Button>
      </div>

      <PasswordCard />
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[3px] border border-border bg-card p-6">
      <h3 className="font-display text-lg">{title}</h3>
      {hint && <p className="mt-1 text-xs text-muted-foreground mb-4">{hint}</p>}
      <div className={hint ? "" : "mt-4"}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="eyebrow text-muted-foreground text-[0.6rem]">{label}</span>
      {children}
    </div>
  );
}

function PasswordCard() {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const change = useMutation({
    mutationFn: () => apiPatch("/api/admin/settings", { currentPassword: current, newPassword: next }),
    onSuccess: () => {
      toast({ title: "Password changed", description: "Use your new password next time you sign in." });
      setCurrent("");
      setNext("");
    },
    onError: (e: Error) => toast({ title: "Could not change password", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="rounded-[3px] border border-border bg-card p-6">
      <h3 className="font-display text-lg mb-1">Change password</h3>
      <p className="text-xs text-muted-foreground mb-4">Minimum 8 characters.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Current password"><Input type="password" className="zaura-input rounded-[3px] h-10" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" /></Field>
        <Field label="New password"><Input type="password" className="zaura-input rounded-[3px] h-10" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
      </div>
      <Button
        className="mt-4 rounded-[3px] bg-charcoal text-ivory hover:bg-champagne hover:text-charcoal"
        onClick={() => change.mutate()}
        disabled={change.isPending || next.length < 8 || !current}
      >
        {change.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} Update password
      </Button>
    </div>
  );
}

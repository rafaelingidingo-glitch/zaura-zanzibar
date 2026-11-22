"use client";

// Apartments management: categories + individual units.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog, ImageManager } from "./shared";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Building2, DoorClosed } from "lucide-react";

type CatImage = { url: string; alt: string };
type Category = {
  id: string; slug: string; name: string; tagline?: string | null; description: string;
  basePrice: number; currency: string; maxOccupancy: number; maxAdults: number; maxChildren: number;
  bedConfiguration: string; sizeSqm?: number | null; viewNote?: string | null; sortOrder: number;
  active: boolean; images: CatImage[]; amenities: { amenityId: string; amenity: { name: string } }[];
  units: Unit[];
};
type Unit = {
  id: string; categoryId: string; name: string; number: string; description?: string | null;
  priceOverride?: number | null; maxOccupancyOverride?: number | null; status: string;
  maintenanceNote?: string | null; sortOrder: number; images: CatImage[];
};
type AmenityRow = { id: string; name: string; icon: string; active: boolean };

const emptyCategory = {
  name: "", slug: "", tagline: "", description: "", basePrice: 0, currency: "USD",
  maxOccupancy: 2, maxAdults: 2, maxChildren: 0, bedConfiguration: "", sizeSqm: 0,
  viewNote: "", sortOrder: 0, active: true, amenityIds: [] as string[], images: [] as CatImage[],
};

export default function ApartmentsAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [catDialog, setCatDialog] = useState<{ mode: "create" | "edit"; id?: string } | null>(null);
  const [unitDialog, setUnitDialog] = useState<{ mode: "create" | "edit"; id?: string; categoryId?: string } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "category" | "unit"; id: string; name: string } | null>(null);

  const cats = useQuery<{ categories: Category[] }>({ queryKey: ["admin-categories"], queryFn: () => apiGet("/api/admin/categories") });
  const amenities = useQuery<{ amenities: AmenityRow[] }>({ queryKey: ["admin-amenities"], queryFn: () => apiGet("/api/admin/amenities") });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const deleteCategory = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/categories/${id}`),
    onSuccess: () => { toast({ title: "Category deleted" }); refresh(); },
    onError: (e: Error) => toast({ title: "Could not delete", description: e.message, variant: "destructive" }),
  });
  const deleteUnit = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/units/${id}`),
    onSuccess: () => { toast({ title: "Apartment deleted" }); refresh(); },
    onError: (e: Error) => toast({ title: "Could not delete", description: e.message, variant: "destructive" }),
  });

  if (cats.isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-champagne" /></div>;

  return (
    <div className="space-y-10">
      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl flex items-center gap-2.5"><Building2 className="h-5 w-5 text-champagne" /> Accommodation categories</h2>
          <Button onClick={() => setCatDialog({ mode: "create" })} className="rounded-[3px] bg-charcoal text-ivory hover:bg-champagne hover:text-charcoal gap-1.5 eyebrow">
            <Plus className="h-4 w-4" /> Add category
          </Button>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cats.data?.categories.map((c) => (
            <div key={c.id} className={`rounded-[3px] border bg-card p-5 ${c.active ? "border-border" : "border-border opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-lg leading-tight">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">/{c.slug} · {c.units.length} units</p>
                </div>
                <span className={`text-[10px] eyebrow rounded-[3px] px-2 py-1 ${c.active ? "bg-olive/15 text-olive" : "bg-muted text-muted-foreground"}`}>
                  {c.active ? "Active" : "Hidden"}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{c.description}</p>
              <p className="mt-3 text-sm font-medium">{c.currency} {c.basePrice.toLocaleString()} / night</p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" className="rounded-[3px] gap-1.5" onClick={() => setCatDialog({ mode: "edit", id: c.id })}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="rounded-[3px] text-destructive hover:text-destructive" onClick={() => setConfirm({ kind: "category", id: c.id, name: c.name })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Units */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl flex items-center gap-2.5"><DoorClosed className="h-5 w-5 text-champagne" /> Individual apartments</h2>
          <Button onClick={() => setUnitDialog({ mode: "create" })} className="rounded-[3px] bg-charcoal text-ivory hover:bg-champagne hover:text-charcoal gap-1.5 eyebrow">
            <Plus className="h-4 w-4" /> Add apartment
          </Button>
        </div>
        <div className="rounded-[3px] border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  {["Apartment", "Category", "Price override", "Occupancy override", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-[0.6rem] eyebrow text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cats.data?.categories.flatMap((c) => c.units).map((u) => {
                  const cat = cats.data?.categories.find((c) => c.id === u.categoryId);
                  return (
                    <tr key={u.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className="font-medium">{u.name}</span>
                        <span className="block text-[11px] text-muted-foreground">No. {u.number}</span>
                      </td>
                      <td className="px-4 py-3">{cat?.name}</td>
                      <td className="px-4 py-3">{u.priceOverride != null ? `${cat?.currency} ${u.priceOverride}` : <span className="text-muted-foreground text-xs">Category price</span>}</td>
                      <td className="px-4 py-3">{u.maxOccupancyOverride ?? <span className="text-muted-foreground text-xs">Category default</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] eyebrow rounded-[3px] px-2 py-1 ${
                          u.status === "ACTIVE" ? "bg-olive/15 text-olive" : u.status === "MAINTENANCE" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"
                        }`}>
                          {u.status === "MAINTENANCE" ? "Blocked" : u.status === "ACTIVE" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button size="sm" variant="outline" className="rounded-[3px] mr-1.5" onClick={() => setUnitDialog({ mode: "edit", id: u.id })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-[3px] text-destructive hover:text-destructive" onClick={() => setConfirm({ kind: "unit", id: u.id, name: `${u.name} (No. ${u.number})` })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {cats.data?.categories.flatMap((c) => c.units).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">No apartments yet — add your first apartment.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === "category" ? "Delete category?" : "Delete apartment?"}
        description={
          confirm
            ? `This permanently removes "${confirm.name}"${confirm.kind === "unit" ? "" : " and all of its apartments"}. This action cannot be undone.`
            : ""
        }
        pending={deleteCategory.isPending || deleteUnit.isPending}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "category") deleteCategory.mutate(confirm.id);
          else deleteUnit.mutate(confirm.id);
          setConfirm(null);
        }}
        onOpenChange={(o) => !o && setConfirm(null)}
      />

      {catDialog && (
        <CategoryDialog
          amenities={amenities.data?.amenities.filter((a) => a.active) || []}
          categories={cats.data?.categories || []}
          mode={catDialog.mode}
          id={catDialog.id}
          onClose={() => setCatDialog(null)}
          onSaved={() => { setCatDialog(null); refresh(); }}
        />
      )}
      {unitDialog && (
        <UnitDialog
          categories={cats.data?.categories || []}
          mode={unitDialog.mode}
          id={unitDialog.id}
          presetCategoryId={unitDialog.categoryId}
          onClose={() => setUnitDialog(null)}
          onSaved={() => { setUnitDialog(null); refresh(); }}
        />
      )}
    </div>
  );
}

function CategoryDialog({
  amenities, categories, mode, id, onClose, onSaved,
}: {
  amenities: AmenityRow[];
  categories: Category[];
  mode: "create" | "edit";
  id?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const existing = mode === "edit" ? categories.find((c) => c.id === id) : undefined;
  const [form, setForm] = useState(() => existing ? {
    name: existing.name, slug: existing.slug, tagline: existing.tagline || "", description: existing.description,
    basePrice: existing.basePrice, currency: existing.currency, maxOccupancy: existing.maxOccupancy,
    maxAdults: existing.maxAdults, maxChildren: existing.maxChildren, bedConfiguration: existing.bedConfiguration,
    sizeSqm: existing.sizeSqm || 0, viewNote: existing.viewNote || "", sortOrder: existing.sortOrder,
    active: existing.active, amenityIds: existing.amenities.map((a) => a.amenityId),
    images: existing.images.map((i) => ({ url: i.url, alt: i.alt })),
  } : { ...emptyCategory });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        sizeSqm: Number(form.sizeSqm) || undefined,
        basePrice: Number(form.basePrice),
        maxOccupancy: Number(form.maxOccupancy),
        maxAdults: Number(form.maxAdults),
        maxChildren: Number(form.maxChildren),
        amenityIds: form.amenityIds,
      };
      return mode === "create"
        ? apiPost("/api/admin/categories", payload)
        : apiPatch(`/api/admin/categories/${id}`, payload);
    },
    onSuccess: () => { toast({ title: mode === "create" ? "Category created" : "Category updated" }); onSaved(); },
    onError: (e: Error) => setError(e.message),
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl rounded-[3px] max-h-[88vh] overflow-y-auto">
        <DialogTitle className="font-display text-2xl">{mode === "create" ? "New accommodation category" : "Edit category"}</DialogTitle>
        <div className="mt-5 grid sm:grid-cols-2 gap-4">
          <Field label="Name *"><Input className="zaura-input rounded-[3px] h-10" value={form.name} onChange={(e) => { set("name", e.target.value); if (mode === "create") set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")); }} /></Field>
          <Field label="Slug (URL)"><Input className="zaura-input rounded-[3px] h-10" value={form.slug} onChange={(e) => set("slug", e.target.value)} /></Field>
          <Field label="Tagline"><Input className="zaura-input rounded-[3px] h-10" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
          <Field label="Bed configuration"><Input className="zaura-input rounded-[3px] h-10" value={form.bedConfiguration} onChange={(e) => set("bedConfiguration", e.target.value)} placeholder="1 King Bed + Sofa Bed" /></Field>
          <Field label="Description *" className="sm:col-span-2">
            <Textarea rows={4} className="zaura-input rounded-[3px] resize-none" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label="Price per night *"><Input type="number" min="0" className="zaura-input rounded-[3px] h-10" value={form.basePrice} onChange={(e) => set("basePrice", Number(e.target.value))} /></Field>
          <Field label="Currency"><Input className="zaura-input rounded-[3px] h-10" value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} /></Field>
          <Field label="Max occupancy (total)"><Input type="number" min="1" className="zaura-input rounded-[3px] h-10" value={form.maxOccupancy} onChange={(e) => set("maxOccupancy", Number(e.target.value))} /></Field>
          <Field label="Max adults"><Input type="number" min="1" className="zaura-input rounded-[3px] h-10" value={form.maxAdults} onChange={(e) => set("maxAdults", Number(e.target.value))} /></Field>
          <Field label="Max children"><Input type="number" min="0" className="zaura-input rounded-[3px] h-10" value={form.maxChildren} onChange={(e) => set("maxChildren", Number(e.target.value))} /></Field>
          <Field label="Size (m²)"><Input type="number" min="0" className="zaura-input rounded-[3px] h-10" value={form.sizeSqm} onChange={(e) => set("sizeSqm", Number(e.target.value))} /></Field>
          <Field label="View note"><Input className="zaura-input rounded-[3px] h-10" value={form.viewNote} onChange={(e) => set("viewNote", e.target.value)} placeholder="Garden view" /></Field>
          <Field label="Sort order"><Input type="number" min="0" className="zaura-input rounded-[3px] h-10" value={form.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} /></Field>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} id="cat-active" />
            <Label htmlFor="cat-active" className="text-sm">Visible on the website</Label>
          </div>
          <div className="sm:col-span-2">
            <p className="eyebrow text-muted-foreground text-[0.6rem] mb-2">Amenities</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {amenities.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm rounded-[3px] border border-border px-3 py-2 cursor-pointer hover:border-champagne/60">
                  <Checkbox
                    checked={form.amenityIds.includes(a.id)}
                    onCheckedChange={(v) => set("amenityIds", v ? [...form.amenityIds, a.id] : form.amenityIds.filter((x) => x !== a.id))}
                  />
                  {a.name}
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <ImageManager label="Category images" images={form.images} onChange={(imgs) => set("images", imgs)} />
          </div>
        </div>
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" className="rounded-[3px]" onClick={onClose}>Cancel</Button>
          <Button className="rounded-[3px] bg-charcoal text-ivory hover:bg-champagne hover:text-charcoal" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} Save category
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UnitDialog({
  categories, mode, id, presetCategoryId, onClose, onSaved,
}: {
  categories: Category[];
  mode: "create" | "edit";
  id?: string;
  presetCategoryId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const existing = mode === "edit" ? categories.flatMap((c) => c.units).find((u) => u.id === id) : undefined;
  const [form, setForm] = useState(() => existing ? {
    categoryId: existing.categoryId, name: existing.name, number: existing.number,
    description: existing.description || "", priceOverride: existing.priceOverride?.toString() || "",
    maxOccupancyOverride: existing.maxOccupancyOverride?.toString() || "", status: existing.status,
    maintenanceNote: existing.maintenanceNote || "", sortOrder: existing.sortOrder,
    images: existing.images.map((i) => ({ url: i.url, alt: i.alt })),
  } : {
    categoryId: presetCategoryId || categories[0]?.id || "", name: "", number: "", description: "",
    priceOverride: "", maxOccupancyOverride: "", status: "ACTIVE", maintenanceNote: "", sortOrder: 0,
    images: [] as CatImage[],
  });
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        categoryId: form.categoryId, name: form.name, number: form.number,
        description: form.description,
        priceOverride: form.priceOverride === "" ? null : Number(form.priceOverride),
        maxOccupancyOverride: form.maxOccupancyOverride === "" ? null : Number(form.maxOccupancyOverride),
        status: form.status, maintenanceNote: form.maintenanceNote, sortOrder: Number(form.sortOrder),
        images: form.images,
      };
      return mode === "create" ? apiPost("/api/admin/units", payload) : apiPatch(`/api/admin/units/${id}`, payload);
    },
    onSuccess: () => { toast({ title: mode === "create" ? "Apartment added" : "Apartment updated" }); onSaved(); },
    onError: (e: Error) => setError(e.message),
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl rounded-[3px] max-h-[88vh] overflow-y-auto">
        <DialogTitle className="font-display text-2xl">{mode === "create" ? "Add individual apartment" : "Edit apartment"}</DialogTitle>
        <div className="mt-5 grid sm:grid-cols-2 gap-4">
          <Field label="Category *">
            <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
              <SelectTrigger className="zaura-input rounded-[3px] h-10"><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Apartment name *"><Input className="zaura-input rounded-[3px] h-10" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Apartment 01" /></Field>
          <Field label="Apartment number *"><Input className="zaura-input rounded-[3px] h-10" value={form.number} onChange={(e) => set("number", e.target.value)} placeholder="01" /></Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="zaura-input rounded-[3px] h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active — bookable</SelectItem>
                <SelectItem value="MAINTENANCE">Blocked for maintenance</SelectItem>
                <SelectItem value="INACTIVE">Inactive — hidden</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {form.status === "MAINTENANCE" && (
            <Field label="Maintenance note" className="sm:col-span-2">
              <Input className="zaura-input rounded-[3px] h-10" value={form.maintenanceNote} onChange={(e) => set("maintenanceNote", e.target.value)} placeholder="Bathroom renovation until 20 March" />
            </Field>
          )}
          <Field label="Price override (optional)">
            <Input type="number" min="0" className="zaura-input rounded-[3px] h-10" value={form.priceOverride} onChange={(e) => set("priceOverride", e.target.value)} placeholder="Uses category price" />
          </Field>
          <Field label="Occupancy override (optional)">
            <Input type="number" min="1" className="zaura-input rounded-[3px] h-10" value={form.maxOccupancyOverride} onChange={(e) => set("maxOccupancyOverride", e.target.value)} placeholder="Uses category default" />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea rows={3} className="zaura-input rounded-[3px] resize-none" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <ImageManager label="Apartment images" images={form.images} onChange={(imgs) => set("images", imgs)} />
          </div>
        </div>
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" className="rounded-[3px]" onClick={onClose}>Cancel</Button>
          <Button className="rounded-[3px] bg-charcoal text-ivory hover:bg-champagne hover:text-charcoal" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} Save apartment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className || ""}`}>
      <span className="eyebrow text-muted-foreground text-[0.6rem]">{label}</span>
      {children}
    </div>
  );
}

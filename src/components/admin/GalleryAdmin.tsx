"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog, ImageManager } from "./shared";
import { useToast } from "@/hooks/use-toast";
import { GALLERY_CATEGORIES, GALLERY_CATEGORY_LABELS } from "@/lib/constants";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";

type GalleryImage = { id: string; url: string; category: string; caption: string; alt: string; sortOrder: number; active: boolean };

export default function GalleryAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState("ALL");
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; image?: GalleryImage } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<GalleryImage | null>(null);

  const { data, isLoading } = useQuery<{ images: GalleryImage[] }>({
    queryKey: ["admin-gallery"],
    queryFn: () => apiGet("/api/admin/gallery"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/gallery/${id}`),
    onSuccess: () => { toast({ title: "Image removed" }); qc.invalidateQueries({ queryKey: ["admin-gallery"] }); },
    onError: (e: Error) => toast({ title: "Could not remove image", description: e.message, variant: "destructive" }),
  });

  const images = data?.images.filter((i) => filter === "ALL" || i.category === filter) || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-52 rounded-[3px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {GALLERY_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{GALLERY_CATEGORY_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setDialog({ mode: "create" })} className="rounded-[3px] bg-charcoal text-ivory hover:bg-champagne hover:text-charcoal gap-1.5 eyebrow">
          <Plus className="h-4 w-4" /> Add image
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-champagne" /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {images.map((img) => (
            <div key={img.id} className={`rounded-[3px] overflow-hidden border bg-card ${img.active ? "border-border" : "border-border opacity-50"}`}>
              <div className="relative aspect-[4/3]">
                <Image src={img.url} alt={img.alt || "gallery image"} fill sizes="200px" className="object-cover" unoptimized={img.url.startsWith("/api/")} />
              </div>
              <div className="p-2.5">
                <p className="text-[11px] font-medium truncate">{img.caption || "—"}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{GALLERY_CATEGORY_LABELS[img.category] || img.category}</p>
                <div className="mt-2 flex gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 rounded-[3px] flex-1" onClick={() => setDialog({ mode: "edit", image: img })}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 rounded-[3px] text-destructive hover:text-destructive" onClick={() => setPendingDelete(img)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {images.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No images in this category.</p>}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove image?"
        description={pendingDelete ? `"${pendingDelete.caption || "This image"}" will be permanently removed from the gallery.` : ""}
        pending={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      />

      {dialog && (
        <GalleryDialog
          image={dialog.image}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            qc.invalidateQueries({ queryKey: ["admin-gallery"] });
          }}
        />
      )}
    </div>
  );
}

function GalleryDialog({ image, onClose, onSaved }: { image?: GalleryImage; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState(() => ({
    url: image?.url || "",
    category: image?.category || "APARTMENTS",
    caption: image?.caption || "",
    alt: image?.alt || "",
    sortOrder: image?.sortOrder ?? 0,
    active: image?.active ?? true,
  }));
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () => (image ? apiPatch(`/api/admin/gallery/${image.id}`, form) : apiPost("/api/admin/gallery", form)),
    onSuccess: () => { toast({ title: image ? "Image updated" : "Image added" }); onSaved(); },
    onError: (e: Error) => setError(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-[3px] max-h-[88vh] overflow-y-auto">
        <DialogTitle className="font-display text-2xl">{image ? "Edit image" : "Add gallery image"}</DialogTitle>
        <div className="mt-4 flex flex-col gap-3.5">
          <ImageManager
            label="Image (upload or paste URL)"
            images={form.url ? [{ url: form.url, alt: form.alt }] : []}
            onChange={(imgs) => setForm({ ...form, url: imgs[imgs.length - 1]?.url || "", alt: imgs[imgs.length - 1]?.alt || form.alt })}
          />
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger className="zaura-input rounded-[3px] h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {GALLERY_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{GALLERY_CATEGORY_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input className="zaura-input rounded-[3px] h-10" placeholder="Caption" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
          <Input type="number" min="0" className="zaura-input rounded-[3px] h-10" placeholder="Sort order" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-[#c5a477]" /> Visible on website
          </label>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-[3px]" onClick={onClose}>Cancel</Button>
            <Button className="rounded-[3px] bg-charcoal text-ivory hover:bg-champagne hover:text-charcoal" onClick={() => save.mutate()} disabled={save.isPending || !form.url}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

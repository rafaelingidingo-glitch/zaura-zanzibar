"use client";

// Editable content blocks: brand intro, experience sections, location text.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog, ImageManager } from "./shared";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, FileText } from "lucide-react";

type Block = { id: string; key: string; title: string; subtitle?: string | null; body?: string | null; image?: string | null; sortOrder: number; active: boolean };

const KEY_LABELS: Record<string, string> = {
  "brand-intro": "Brand introduction (homepage)",
  location: "Location section",
};

export default function ContentAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Block | null>(null);
  const { data, isLoading } = useQuery<{ blocks: Block[] }>({
    queryKey: ["admin-content"],
    queryFn: () => apiGet("/api/admin/content"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/content/${id}`),
    onSuccess: () => { toast({ title: "Section deleted" }); qc.invalidateQueries({ queryKey: ["admin-content"] }); },
    onError: (e: Error) => toast({ title: "Could not delete", description: e.message, variant: "destructive" }),
  });

  const blocks = (data?.blocks || []).slice().sort((a, b) => {
    const rank = (k: string) => (k === "brand-intro" ? 0 : k === "location" ? 999 : 1);
    return rank(a.key) - rank(b.key) || a.sortOrder - b.sortOrder;
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-champagne" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-xl">
          Edit the website&apos;s editorial text: the brand introduction, experience sections and location copy. Homepage headline is under Settings.
        </p>
        <Button onClick={() => setAddOpen(true)} className="rounded-[3px] bg-charcoal text-ivory hover:bg-champagne hover:text-charcoal gap-1.5 eyebrow">
          <Plus className="h-4 w-4" /> New experience section
        </Button>
      </div>

      {blocks.map((b) => (
        <BlockEditor
          key={b.id}
          block={b}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-content"] });
            toast({ title: "Content saved" });
          }}
          onDelete={b.key.startsWith("exp-") ? () => setPendingDelete(b) : undefined}
        />
      ))}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete section?"
        description={pendingDelete ? `"${KEY_LABELS[pendingDelete.key] || pendingDelete.title}" will be permanently removed from the website.` : ""}
        pending={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      />

      <AddBlockDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          qc.invalidateQueries({ queryKey: ["admin-content"] });
        }}
      />
    </div>
  );
}

function BlockEditor({ block, onSaved, onDelete }: { block: Block; onSaved: () => void; onDelete?: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: block.title,
    subtitle: block.subtitle || "",
    body: block.body || "",
    image: block.image || "",
    sortOrder: block.sortOrder,
    active: block.active,
  });
  const [dirty, setDirty] = useState(false);
  const save = useMutation({
    mutationFn: () => apiPatch(`/api/admin/content/${block.id}`, form),
    onSuccess: () => { setDirty(false); onSaved(); },
    onError: (e: Error) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  const mark = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  return (
    <div className={`rounded-[3px] border bg-card p-5 ${block.active ? "border-border" : "border-border opacity-70"}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="eyebrow text-muted-foreground text-[0.6rem] flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-champagne" />
          {KEY_LABELS[block.key] || block.key}
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => mark("active", e.target.checked)}
              className="accent-[#c5a477]"
            />
            Visible
          </label>
          {onDelete && (
            <Button size="sm" variant="outline" className="rounded-[3px] text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          <Input className="zaura-input rounded-[3px] h-10 font-medium" value={form.title} onChange={(e) => mark("title", e.target.value)} placeholder="Title" />
          <Input className="zaura-input rounded-[3px] h-10" value={form.subtitle} onChange={(e) => mark("subtitle", e.target.value)} placeholder="Subtitle / eyebrow" />
          <Textarea rows={6} className="zaura-input rounded-[3px] resize-none" value={form.body} onChange={(e) => mark("body", e.target.value)} placeholder="Body text — separate paragraphs with an empty line" />
          <Input type="number" min="0" className="zaura-input rounded-[3px] h-10 w-28" value={form.sortOrder} onChange={(e) => mark("sortOrder", Number(e.target.value))} placeholder="Order" />
        </div>
        <div>
          <ImageManager
            label="Section image (optional)"
            images={form.image ? [{ url: form.image, alt: "" }] : []}
            onChange={(imgs) => mark("image", imgs[imgs.length - 1]?.url || "")}
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button size="sm" className="rounded-[3px] bg-charcoal text-ivory hover:bg-champagne hover:text-charcoal" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
          {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
          {dirty ? "Save changes" : "Saved"}
        </Button>
      </div>
    </div>
  );
}

function AddBlockDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ key: "exp-", title: "", subtitle: "", body: "", sortOrder: 0 });
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () => apiPost("/api/admin/content", { ...form, active: true }),
    onSuccess: () => { toast({ title: "Section created" }); onSaved(); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-[3px]">
        <DialogTitle className="font-display text-2xl">New experience section</DialogTitle>
        <div className="mt-4 flex flex-col gap-3.5">
          <Input className="zaura-input rounded-[3px] h-10" placeholder="key (e.g. exp-5)" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} />
          <Input className="zaura-input rounded-[3px] h-10" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input className="zaura-input rounded-[3px] h-10" placeholder="Subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          <Textarea rows={4} className="zaura-input rounded-[3px] resize-none" placeholder="Body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-[3px]" onClick={onClose}>Cancel</Button>
            <Button className="rounded-[3px] bg-charcoal text-ivory hover:bg-champagne hover:text-charcoal" onClick={() => save.mutate()} disabled={save.isPending || !form.key.startsWith("exp-") || !form.title}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

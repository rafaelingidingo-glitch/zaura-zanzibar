"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";

type Amenity = { id: string; name: string; icon: string; description?: string | null; active: boolean; sortOrder: number };

export default function AmenitiesAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; amenity?: Amenity } | null>(null);

  const { data, isLoading } = useQuery<{ amenities: Amenity[] }>({
    queryKey: ["admin-amenities"],
    queryFn: () => apiGet("/api/admin/amenities"),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => apiPatch(`/api/admin/amenities/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-amenities"] }),
    onError: (e: Error) => toast({ title: "Could not update", description: e.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/amenities/${id}`),
    onSuccess: () => { toast({ title: "Amenity deleted" }); qc.invalidateQueries({ queryKey: ["admin-amenities"] }); },
    onError: (e: Error) => toast({ title: "Could not delete", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-champagne" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Amenities shown on the website. Only active amenities appear publicly.</p>
        <Button onClick={() => setDialog({ mode: "create" })} className="rounded-[3px] bg-charcoal text-ivory hover:bg-champagne hover:text-charcoal gap-1.5 eyebrow">
          <Plus className="h-4 w-4" /> Add amenity
        </Button>
      </div>
      <div className="rounded-[3px] border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              {["Amenity", "Icon", "Description", "Visible", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-[0.6rem] eyebrow text-muted-foreground font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.amenities.map((a) => (
              <tr key={a.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{a.name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{a.icon}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">{a.description || "—"}</td>
                <td className="px-4 py-3">
                  <Switch checked={a.active} onCheckedChange={(v) => toggle.mutate({ id: a.id, active: v })} aria-label={`Toggle ${a.name}`} />
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Button size="sm" variant="outline" className="rounded-[3px] mr-1.5" onClick={() => setDialog({ mode: "edit", amenity: a })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-[3px] text-destructive hover:text-destructive" onClick={() => remove.mutate(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialog && (
        <AmenityDialog
          amenity={dialog.amenity}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            qc.invalidateQueries({ queryKey: ["admin-amenities"] });
            qc.invalidateQueries({ queryKey: ["admin-categories"] });
          }}
        />
      )}
    </div>
  );
}

function AmenityDialog({ amenity, onClose, onSaved }: { amenity?: Amenity; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState(() => ({
    name: amenity?.name || "", icon: amenity?.icon || "check", description: amenity?.description || "",
    active: amenity?.active ?? true, sortOrder: amenity?.sortOrder ?? 0,
  }));
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () =>
      amenity
        ? apiPatch(`/api/admin/amenities/${amenity.id}`, form)
        : apiPost("/api/admin/amenities", form),
    onSuccess: () => { toast({ title: amenity ? "Amenity updated" : "Amenity created" }); onSaved(); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-[3px]">
        <DialogTitle className="font-display text-2xl">{amenity ? "Edit amenity" : "New amenity"}</DialogTitle>
        <div className="mt-4 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Name *</Label>
            <Input className="zaura-input rounded-[3px] h-10" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Icon (lucide name)</Label>
            <Input className="zaura-input rounded-[3px] h-10" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="wifi, snowflake, waves..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Description</Label>
            <Input className="zaura-input rounded-[3px] h-10" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /> Visible on website
          </label>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" className="rounded-[3px]" onClick={onClose}>Cancel</Button>
            <Button className="rounded-[3px] bg-charcoal text-ivory hover:bg-champagne hover:text-charcoal" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />} Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

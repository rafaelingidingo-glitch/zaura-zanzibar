"use client";

// Guest CRM: search, history, notes.

import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/admin-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "./shared";
import { useToast } from "@/hooks/use-toast";
import { formatKeyLong } from "@/lib/dates";
import { Search, Loader2, StickyNote, ChevronDown } from "lucide-react";

type Guest = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  bookingCount: number;
  totalNights: number;
  lastStay?: string | null;
  bookings: { id: string; reference: string; status: string; checkIn: string; checkOut: string; nights: number; estTotal: number; currency: string; categoryName: string }[];
};

export default function GuestsAdmin() {
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading } = useQuery<{ guests: Guest[] }>({
    queryKey: ["admin-guests", q],
    queryFn: () => apiGet(`/api/admin/guests?q=${encodeURIComponent(q)}`),
    placeholderData: (prev) => prev,
  });

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9 rounded-[3px] h-10" placeholder="Search guests by name, phone or email..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="rounded-[3px] border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              {["Guest", "Contact", "Reservations", "Nights stayed", "Last stay", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-[0.6rem] eyebrow text-muted-foreground font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-champagne" /></td></tr>}
            {!isLoading && data?.guests.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">No guests found.</td></tr>
            )}
            {data?.guests.map((g) => (
              <Fragment key={g.id}>
                <tr
                  className="border-b border-border/60 hover:bg-muted/30 cursor-pointer"
                  onClick={() => setOpenId(openId === g.id ? null : g.id)}
                >
                  <td className="px-4 py-3.5 font-medium">{g.name}</td>
                  <td className="px-4 py-3.5">
                    {g.phone}
                    {g.email && <span className="block text-[11px] text-muted-foreground">{g.email}</span>}
                  </td>
                  <td className="px-4 py-3.5">{g.bookingCount}</td>
                  <td className="px-4 py-3.5">{g.totalNights}</td>
                  <td className="px-4 py-3.5">{g.lastStay ? formatKeyLong(g.lastStay) : "—"}</td>
                  <td className="px-4 py-3.5 text-right">
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openId === g.id ? "rotate-180" : ""}`} />
                  </td>
                </tr>
                {openId === g.id && (
                  <tr key={`${g.id}-detail`}>
                    <td colSpan={6} className="px-4 py-4 bg-muted/20">
                      <GuestDetail guest={g} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GuestDetail({ guest }: { guest: Guest }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [notes, setNotes] = useState(guest.notes || "");
  const saveNotes = useMutation({
    mutationFn: () => apiPatch(`/api/admin/guests/${guest.id}`, { notes }),
    onSuccess: () => {
      toast({ title: "Guest notes saved" });
      qc.invalidateQueries({ queryKey: ["admin-guests"] });
    },
    onError: (e: Error) => toast({ title: "Could not save notes", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2">
        <p className="eyebrow text-muted-foreground text-[0.6rem] mb-2.5">Reservation history</p>
        {guest.bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reservations yet.</p>
        ) : (
          <ul className="space-y-2">
            {guest.bookings.map((b) => (
              <li key={b.id} className="rounded-[3px] border border-border bg-card px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-champagne">{b.reference}</span>
                <span>{b.categoryName}</span>
                <span className="text-xs text-muted-foreground">{formatKeyLong(b.checkIn)} → {formatKeyLong(b.checkOut)}</span>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="eyebrow text-muted-foreground text-[0.6rem] mb-2.5 flex items-center gap-1.5">
          <StickyNote className="h-3.5 w-3.5" /> Internal notes
        </p>
        <Textarea rows={5} className="zaura-input rounded-[3px] resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preferences, VIP treatment, notes..." />
        <Button size="sm" className="mt-2 rounded-[3px] bg-charcoal text-ivory hover:bg-champagne hover:text-charcoal" onClick={() => saveNotes.mutate()} disabled={saveNotes.isPending}>
          {saveNotes.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} Save notes
        </Button>
      </div>
    </div>
  );
}

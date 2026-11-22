"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge, money } from "./shared";
import { useToast } from "@/hooks/use-toast";
import { BOOKING_STATUS_META } from "@/lib/constants";
import { formatKeyLong } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  Search, MoreHorizontal, Loader2, MessageCircle, StickyNote, Wallet, Clock,
  CheckCheck, XCircle, Ban, DoorOpen, DoorClosed, UserX, ArrowDownClockwiseArrow,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

type Booking = {
  id: string;
  reference: string;
  status: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  adults: number;
  children: number;
  categoryName: string;
  unitNumber: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  estTotal: number;
  currency: string;
  specialRequests?: string | null;
  internalNotes?: string | null;
  holdExpiresAt?: string | null;
  createdAt: string;
  payments: { id: string; amount: number; method: string; note?: string | null; recordedAt: string }[];
};

export default function Reservations({ currency, initialQuery }: { currency: string; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery || "");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const queryKey = ["admin-bookings", q, status, from, to, page];
  const { data, isLoading } = useQuery<{ total: number; bookings: Booking[] }>({
    queryKey,
    queryFn: () =>
      apiGet(`/api/admin/bookings?q=${encodeURIComponent(q)}&status=${status}&from=${from}&to=${to}&page=${page}`),
    placeholderData: (prev) => prev,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
    qc.invalidateQueries({ queryKey: ["admin-notifications"] });
  };

  const action = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiPatch(`/api/admin/bookings/${id}`, body),
    onSuccess: (_d, vars) => {
      const act = String(vars.body?.action || "");
      toast({ title: act === "confirm" ? "Booking confirmed" : act === "extend" ? "Hold extended" : `Request ${act} completed` });
      refresh();
    },
    onError: (e: Error) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 20)) : 1;

  const menuFor = (b: Booking) => {
    const items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[] = [];
    const doAction = (body: Record<string, unknown>, label: string) =>
      () => action.mutate({ id: b.id, body }, { onSuccess: undefined, onError: (e: Error) => toast({ title: `${label} failed`, description: e.message, variant: "destructive" }) });

    if (b.status === "PENDING") {
      items.push({ label: "Confirm booking", icon: <CheckCheck className="h-4 w-4" />, onClick: doAction({ action: "confirm" }, "Confirm") });
      items.push({ label: "Extend hold (+15 min)", icon: <Clock className="h-4 w-4" />, onClick: doAction({ action: "extend", extendMinutes: 15 }, "Extend") });
      items.push({ label: "Reject request", icon: <XCircle className="h-4 w-4" />, onClick: doAction({ action: "reject" }, "Reject"), danger: true });
    }
    if (b.status === "CONFIRMED") {
      items.push({ label: "Mark checked-in", icon: <DoorOpen className="h-4 w-4" />, onClick: doAction({ action: "checkin" }, "Check-in") });
      items.push({ label: "Mark no-show", icon: <UserX className="h-4 w-4" />, onClick: doAction({ action: "noshow" }, "No-show") });
      items.push({ label: "Cancel booking", icon: <Ban className="h-4 w-4" />, onClick: doAction({ action: "cancel" }, "Cancel"), danger: true });
    }
    if (b.status === "CHECKED_IN") {
      items.push({ label: "Mark checked-out", icon: <DoorClosed className="h-4 w-4" />, onClick: doAction({ action: "checkout" }, "Check-out") });
      items.push({ label: "Mark no-show", icon: <UserX className="h-4 w-4" />, onClick: doAction({ action: "noshow" }, "No-show") });
    }
    return items;
  };

  const contactGuest = async (b: Booking) => {
    try {
      const res = await apiGet<{ link: string }>(`/api/admin/bookings/${b.id}/whatsapp`);
      window.open(res.link, "_blank", "noopener,noreferrer");
    } catch {
      window.open(`https://wa.me/${b.guestPhone.replace(/[^\d]/g, "")}`, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 rounded-[3px] h-10"
            placeholder="Search reference, guest, phone..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44 rounded-[3px] h-10">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {Object.entries(BOOKING_STATUS_META).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Check-in from</span>
          <Input type="date" className="h-10 rounded-[3px] w-36" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          <span>to</span>
          <Input type="date" className="h-10 rounded-[3px] w-36" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[3px] border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                {["Reference", "Guest", "Apartment", "Dates", "Guests", "Status", "Total", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-[0.6rem] eyebrow text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>
              )}
              {!isLoading && data?.bookings.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">No reservations found.</td></tr>
              )}
              {data?.bookings.map((b) => (
                <tr key={b.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <button onClick={() => setDetailId(b.id)} className="font-medium text-champagne hover:underline">{b.reference}</button>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">{new Date(b.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-medium">{b.guestName}</span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">{b.guestPhone}</span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {b.categoryName}
                    <span className="block text-[11px] text-muted-foreground mt-0.5">{b.unitNumber ? `Apartment ${b.unitNumber}` : "—"}</span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {formatKeyLong(b.checkIn).slice(0, -5)} → {formatKeyLong(b.checkOut).slice(0, -5)}
                    <span className="block text-[11px] text-muted-foreground mt-0.5">{b.nights} nights</span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">{b.adults}{b.children ? `+${b.children}` : ""}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3.5 whitespace-nowrap font-medium">{money(b.estTotal, b.currency || currency)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-[3px]"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-[3px]">
                        <DropdownMenuItem onClick={() => setDetailId(b.id)}>
                          <StickyNote className="h-4 w-4 mr-2" /> Details & notes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => contactGuest(b)}>
                          <MessageCircle className="h-4 w-4 mr-2" /> Contact on WhatsApp
                        </DropdownMenuItem>
                        {menuFor(b).length > 0 && <DropdownMenuSeparator />}
                        {menuFor(b).map((item, i) => (
                          <DropdownMenuItem key={i} onClick={item.onClick} className={item.danger ? "text-destructive focus:text-destructive" : ""}>
                            {item.icon}
                            <span className="ml-2">{item.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
          <span className="text-xs text-muted-foreground">{data?.total ?? 0} reservations</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-[3px]">Previous</Button>
            <span className="text-xs">Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-[3px]">Next</Button>
          </div>
        </div>
      </div>

      {detailId && (
        <BookingDetail
          id={detailId}
          bookings={data?.bookings ?? []}
          currency={currency}
          onClose={() => setDetailId(null)}
          action={action}
        />
      )}
    </div>
  );
}

function BookingDetail({
  id,
  bookings,
  currency,
  onClose,
  action,
}: {
  id: string;
  bookings: Booking[];
  currency: string;
  onClose: () => void;
  action: ReturnType<typeof useMutation<unknown, Error, { id: string; body: Record<string, unknown> }>>;
}) {
  // Derive from the list payload (kept fresh by cache invalidation after actions).
  const b = useMemo(() => bookings.find((x) => x.id === id), [bookings, id]);
  const [notes, setNotes] = useState<string | null>(null);
  const [payment, setPayment] = useState({ amount: "", method: "CASH", note: "" });
  const qc = useQueryClient();
  const { toast } = useToast();

  const saveNotes = useMutation({
    mutationFn: () => apiPatch(`/api/admin/bookings/${id}`, { action: "notes", notes: notes ?? b?.internalNotes ?? "" }),
    onSuccess: () => {
      toast({ title: "Internal notes saved" });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: Error) => toast({ title: "Could not save notes", description: e.message, variant: "destructive" }),
  });

  const addPayment = useMutation({
    mutationFn: () =>
      apiPatch(`/api/admin/bookings/${id}`, { action: "addPayment", payment: { amount: Number(payment.amount), method: payment.method, note: payment.note || undefined } }),
    onSuccess: () => {
      toast({ title: "Payment recorded" });
      setPayment({ amount: "", method: "CASH", note: "" });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (e: Error) => toast({ title: "Could not record payment", description: e.message, variant: "destructive" }),
  });

  const paidTotal = useMemo(() => (b ? b.payments.reduce((s, p) => s + p.amount, 0) : 0), [b]);

  if (!b) return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined} className="rounded-[3px]"><Loader2 className="h-5 w-5 animate-spin mx-auto my-8" /></DialogContent>
    </Dialog>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-w-2xl rounded-[3px] max-h-[88vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <DialogTitle className="font-display text-2xl">{b.reference}</DialogTitle>
            <div className="mt-2 flex items-center gap-3">
              <StatusBadge status={b.status} />
              {b.status === "PENDING" && b.holdExpiresAt && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> holds until {new Date(b.holdExpiresAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
          {[
            ["Guest", b.guestName],
            ["Phone", b.guestPhone],
            ["Email", b.guestEmail || "—"],
            ["Apartment", `${b.categoryName}${b.unitNumber ? ` · Apartment ${b.unitNumber}` : ""}`],
            ["Check-in", formatKeyLong(b.checkIn)],
            ["Check-out", formatKeyLong(b.checkOut)],
            ["Nights", String(b.nights)],
            ["Guests", `${b.adults} adults${b.children ? ` + ${b.children} children` : ""}`],
            ["Estimated total", money(b.estTotal, b.currency || currency)],
            ["Recorded payments", money(paidTotal, b.currency || currency)],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-[0.6rem] eyebrow text-muted-foreground">{k}</p>
              <p className="mt-1 font-medium">{v}</p>
            </div>
          ))}
        </div>

        {b.specialRequests && (
          <div className="mt-4 rounded-[3px] bg-muted/50 p-3.5">
            <p className="text-[0.6rem] eyebrow text-muted-foreground mb-1.5">Special requests</p>
            <p className="text-sm whitespace-pre-line">{b.specialRequests}</p>
          </div>
        )}

        <Separator className="my-5" />

        {/* Internal notes */}
        <div>
          <p className="eyebrow text-muted-foreground text-[0.6rem] mb-2 flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5" /> Internal notes
          </p>
          <Textarea
            rows={3}
            className="zaura-input rounded-[3px] resize-none"
            placeholder="Private notes about this reservation..."
            value={notes ?? b.internalNotes ?? ""}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button size="sm" variant="outline" className="mt-2 rounded-[3px]" onClick={() => saveNotes.mutate()} disabled={saveNotes.isPending || notes === null}>
            {saveNotes.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save notes"}
          </Button>
        </div>

        <Separator className="my-5" />

        {/* Payments */}
        <div>
          <p className="eyebrow text-muted-foreground text-[0.6rem] mb-2 flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" /> Recorded payments
          </p>
          {b.payments.length > 0 ? (
            <ul className="space-y-2 mb-3">
              {b.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm rounded-[3px] border border-border px-3 py-2">
                  <span>{money(p.amount, b.currency || currency)} · {p.method.replace("_", " ")}</span>
                  <span className="text-xs text-muted-foreground">{new Date(p.recordedAt).toLocaleDateString("en-GB")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground mb-3">No payments recorded yet.</p>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            <Input className="h-9 w-28 rounded-[3px]" type="number" min="0" placeholder="Amount" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
            <Select value={payment.method} onValueChange={(v) => setPayment({ ...payment, method: v })}>
              <SelectTrigger className="h-9 w-40 rounded-[3px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["CASH", "CARD", "BANK_TRANSFER", "MOBILE_MONEY", "OTHER"].map((m) => (
                  <SelectItem key={m} value={m}>{m.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="rounded-[3px] bg-charcoal text-ivory hover:bg-champagne hover:text-charcoal" onClick={() => addPayment.mutate()} disabled={addPayment.isPending || !payment.amount}>
              {addPayment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Record payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

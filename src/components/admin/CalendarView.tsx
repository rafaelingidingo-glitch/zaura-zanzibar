"use client";

// Availability calendar: units × days with reservation & hold states.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/admin-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { localFromKey, formatShortDate, monthLabel, addDays, parseDateOnly, toDateKey, todayInPropertyTz } from "@/lib/dates";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type CalendarRow = {
  unitId: string;
  unitName: string;
  unitNumber: string;
  unitStatus: string;
  maintenanceNote?: string | null;
  categoryName: string;
  cells: {
    date: string;
    status: string;
    reference: string | null;
    bookingId: string | null;
    checkInToday: boolean;
    checkOutToday: boolean;
    guest: string | null;
  }[];
};

const CELL_STYLES: Record<string, string> = {
  FREE: "bg-card text-muted-foreground/40 hover:border-champagne/40",
  PENDING: "bg-[#f7edd8] text-[#9a6b1f] border-[#e5cf9d]",
  CONFIRMED: "bg-champagne/80 text-charcoal border-champagne",
  CHECKED_IN: "bg-olive text-ivory border-olive",
  CHECKED_OUT: "bg-muted text-muted-foreground border-border",
  MAINTENANCE: "bg-destructive/15 text-destructive border-destructive/40",
  INACTIVE: "bg-charcoal/10 text-muted-foreground/60 border-border",
};

export default function CalendarView({ onOpenBooking }: { onOpenBooking: (reference: string) => void }) {
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const today = todayInPropertyTz();
  const [anchor, setAnchor] = useState<string>(toDateKey(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))));

  const days = view === "month" ? 31 : view === "week" ? 7 : 1;

  const { data, isLoading } = useQuery<{ from: string; dates: string[]; rows: CalendarRow[] }>({
    queryKey: ["admin-calendar", anchor, days],
    queryFn: () => apiGet(`/api/admin/calendar?from=${anchor}&days=${days}`),
  });

  const shift = (dir: number) => {
    const base = parseDateOnly(anchor) || today;
    const step =
      view === "month"
        ? new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + dir, 1))
        : addDays(base, dir * days);
    setAnchor(toDateKey(step));
  };

  const goToday = () => setAnchor(toDateKey(today));

  const monthLabelStr = data
    ? view === "month"
      ? monthLabel(parseDateOnly(data.from)!.getUTCFullYear(), parseDateOnly(data.from)!.getUTCMonth())
      : view === "week"
        ? `${formatShortDate(parseDateOnly(data.from)!)} – ${formatShortDate(addDays(parseDateOnly(data.from)!, 6))}`
        : formatShortDate(parseDateOnly(data.from)!)
    : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => shift(-1)} className="rounded-[3px] h-9 w-9 p-0" aria-label="Previous period">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-display text-lg min-w-[150px] text-center">{monthLabelStr}</span>
          <Button variant="outline" size="sm" onClick={() => shift(1)} className="rounded-[3px] h-9 w-9 p-0" aria-label="Next period">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="rounded-[3px] eyebrow text-[0.6rem]">Today</Button>
        </div>
        <div className="flex gap-1 rounded-[3px] border border-border p-1 bg-card">
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => {
                setView(v);
                if (v !== "month") {
                  const t = todayInPropertyTz();
                  setAnchor(toDateKey(t));
                } else {
                  const t = todayInPropertyTz();
                  setAnchor(toDateKey(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1))));
                }
              }}
              className={cn("eyebrow text-[0.6rem] rounded-[2px] px-3.5 py-2 capitalize transition-colors", view === v ? "bg-charcoal text-ivory" : "text-muted-foreground hover:text-foreground")}
              aria-pressed={view === v}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
        {[
          ["PENDING", "Pending hold"],
          ["CONFIRMED", "Confirmed"],
          ["CHECKED_IN", "Checked-in"],
          ["CHECKED_OUT", "Checked-out"],
          ["MAINTENANCE", "Maintenance"],
          ["FREE", "Available"],
        ].map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded-[2px] border", CELL_STYLES[k])} /> {label}
          </span>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-champagne" /></div>
      ) : (
        <div className="rounded-[3px] border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto calendar-scroll">
            <table className="border-collapse text-xs min-w-[720px] w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-card border-b border-r border-border px-3 py-2.5 text-left min-w-[170px]">
                    <span className="eyebrow text-muted-foreground text-[0.55rem]">Apartment</span>
                  </th>
                  {data?.dates.map((d) => {
                    const dt = localFromKey(d);
                    const isToday = d === toDateKey(today);
                    return (
                      <th key={d} className={cn("border-b border-border px-1 py-2 min-w-[42px]", isToday && "bg-champagne/20")}>
                        <span className={cn("block text-[10px]", isToday ? "font-semibold text-champagne" : "text-muted-foreground")}>
                          {dt.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2)}
                        </span>
                        <span className={cn("block", isToday ? "font-semibold" : "")}>{dt.getDate()}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data?.rows.map((row) => (
                  <tr key={row.unitId}>
                    <td className="sticky left-0 z-10 bg-card border-b border-r border-border px-3 py-2">
                      <span className="font-medium">Apt {row.unitNumber}</span>
                      <span className="block text-[10px] text-muted-foreground">{row.categoryName}</span>
                    </td>
                    {row.cells.map((c) => (
                      <td key={c.date} className="border-b border-border/70 p-[2px]">
                        <button
                          disabled={!c.bookingId}
                          onClick={() => c.reference && onOpenBooking(c.reference)}
                          title={c.bookingId ? `${c.reference} · ${c.guest}` : c.status === "MAINTENANCE" ? row.maintenanceNote || "Maintenance" : "Available"}
                          className={cn(
                            "w-full h-9 rounded-[2px] border text-[9px] font-medium truncate px-1 transition-all",
                            CELL_STYLES[c.status] || CELL_STYLES.FREE,
                            c.bookingId && "cursor-pointer hover:brightness-95"
                          )}
                        >
                          {c.reference ? c.reference.slice(-4) : c.checkInToday || c.checkOutToday ? "" : ""}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
                {data?.rows.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">No apartments configured yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

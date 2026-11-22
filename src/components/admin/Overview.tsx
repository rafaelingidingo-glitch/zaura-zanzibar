"use client";

import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";
import { apiGet } from "@/lib/admin-client";
import { StatCard, money } from "./shared";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, LogIn, LogOut, TrendingUp } from "lucide-react";
import { formatKeyLong } from "@/lib/dates";

type Overview = {
  totals: { reservations: number; pending: number; confirmed: number; checkedIn: number; cancelled: number; expired: number; noShow: number };
  today: { checkIns: number; checkOuts: number };
  units: { active: number; available: number; occupied: number; maintenance: number };
  revenueThisMonth: number;
  expiringSoon: { reference: string; holdExpiresAt: string }[];
  recentPending: { id: string; reference: string; guestName: string; categoryName: string; unitNumber: string | null; createdAt: string; holdExpiresAt: string | null }[];
  trend: { label: string; bookings: number; revenue: number }[];
};

export default function Overview({ currency, onNavigate }: { currency: string; onNavigate: (tab: string, q?: string) => void }) {
  const { data, isLoading } = useQuery<Overview>({
    queryKey: ["admin-overview"],
    queryFn: () => apiGet<Overview>("/api/admin/overview"),
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-[3px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4">
        <StatCard label="Total reservations" value={data.totals.reservations} hint="All time" />
        <StatCard label="Pending requests" value={data.totals.pending} accent={data.totals.pending > 0} hint={data.totals.pending > 0 ? "Action required" : "No open requests"} />
        <StatCard label="Confirmed bookings" value={data.totals.confirmed} hint="Upcoming & future stays" />
        <StatCard label="Today's check-ins" value={data.today.checkIns} hint="Arrivals today" />
        <StatCard label="Today's check-outs" value={data.today.checkOuts} hint="Departures today" />
        <StatCard label="Revenue this month" value={money(data.revenueThisMonth, currency)} hint="From recorded payments" />
        <StatCard label="Available apartments" value={data.units.available} hint={`${data.units.active} active units`} />
        <StatCard label="Occupied apartments" value={data.units.occupied} hint="Guests currently in-house" />
        <StatCard label="Maintenance units" value={data.units.maintenance} hint={data.units.maintenance > 0 ? "Blocked for maintenance" : "All units operational"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-[3px] border border-border bg-card p-5">
          <p className="eyebrow text-muted-foreground text-[0.6rem] mb-1">Booking trend</p>
          <p className="text-xs text-muted-foreground mb-4">Reservations created & recorded revenue · last 6 months</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.trend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e1d2" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6d6d62" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="l" tick={{ fontSize: 11, fill: "#6d6d62" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis yAxisId="r" orientation="right" hide />
                <Tooltip
                  contentStyle={{ borderRadius: 3, border: "1px solid #e3dbc9", fontSize: 12 }}
                  formatter={(value, name) => (name === "Bookings" ? [value, "Bookings"] : [money(Number(value), currency), "Revenue"])}
                />
                <Bar yAxisId="l" dataKey="bookings" name="Bookings" fill="#c5a477" radius={[2, 2, 0, 0]} barSize={28} />
                <Line yAxisId="r" type="monotone" dataKey="revenue" name="Revenue" stroke="#777a61" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          {data.expiringSoon.length > 0 && (
            <div className="rounded-[3px] border border-destructive/30 bg-destructive/5 p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <Clock className="h-4 w-4" /> Requests expiring soon
              </p>
              <ul className="mt-3 space-y-2">
                {data.expiringSoon.slice(0, 4).map((e) => (
                  <li key={e.reference} className="flex items-center justify-between text-xs">
                    <span className="font-medium">{e.reference}</span>
                    <span className="text-muted-foreground">expires {new Date(e.holdExpiresAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => onNavigate("reservations", "")} className="mt-3 text-xs text-destructive underline underline-offset-2">
                Review requests →
              </button>
            </div>
          )}

          <div className="rounded-[3px] border border-border bg-card p-5">
            <p className="eyebrow text-muted-foreground text-[0.6rem] mb-3">Latest requests</p>
            {data.recentPending.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3">No pending requests right now.</p>
            ) : (
              <ul className="space-y-3">
                {data.recentPending.slice(0, 5).map((b) => (
                  <li key={b.id}>
                    <button onClick={() => onNavigate("reservations", b.reference)} className="w-full text-left hover:bg-muted/50 rounded-[3px] px-2 py-1.5 -mx-2 transition-colors">
                      <span className="flex items-center justify-between text-xs">
                        <span className="font-medium">{b.reference}</span>
                        <span className="text-champagne">{b.categoryName}{b.unitNumber ? ` · ${b.unitNumber}` : ""}</span>
                      </span>
                      <span className="block text-[11px] text-muted-foreground mt-0.5">{b.guestName} · requested {new Date(b.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-[3px] border border-border bg-card p-5">
            <p className="eyebrow text-muted-foreground text-[0.6rem] mb-2">Today at the property</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <span className="flex items-center gap-2"><LogIn className="h-4 w-4 text-olive" /> {data.today.checkIns} arrivals</span>
              <span className="flex items-center gap-2"><LogOut className="h-4 w-4 text-champagne" /> {data.today.checkOuts} departures</span>
            </div>
            <div className="mt-3 pt-3 border-t border-border/70 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <span><span className="font-medium text-foreground">{data.units.available}</span> free</span>
              <span><span className="font-medium text-foreground">{data.units.occupied}</span> in-house</span>
              <span><span className="font-medium text-foreground">{data.units.maintenance}</span> maint.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

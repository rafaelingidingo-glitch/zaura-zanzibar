"use client";

// Analytics & reporting with CSV export and print-to-PDF.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/admin-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatCard, money } from "./shared";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2, Download, Printer } from "lucide-react";
import { todayInPropertyTz, toDateKey, addDays, parseDateOnly } from "@/lib/dates";

type Report = {
  from: string;
  to: string;
  days: number;
  totalReservations: number;
  byStatus: Record<string, number>;
  avgStayNights: number;
  cancellationRate: number;
  noShowRate: number;
  occupancyRate: number;
  revenue: number;
  paymentsCount: number;
  monthlySeries: { key: string; bookings: number; revenue: number }[];
  categoryCounts: { name: string; count: number }[];
};

export default function ReportsAdmin({ currency }: { currency: string }) {
  const today = todayInPropertyTz();
  const [from, setFrom] = useState(toDateKey(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))));
  const [to, setTo] = useState(toDateKey(addDays(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)), 31)));

  const { data, isLoading } = useQuery<Report>({
    queryKey: ["admin-reports", from, to],
    queryFn: () => apiGet(`/api/admin/reports?from=${from}&to=${to}`),
    enabled: Boolean(from && to && parseDateOnly(from) && parseDateOnly(to)),
  });

  const exportCsv = () => {
    window.location.href = `/api/admin/reports?from=${from}&to=${to}&format=csv`;
  };

  return (
    <div id="report-print-area" className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow text-muted-foreground text-[0.6rem]">From</span>
          <Input type="date" className="h-10 rounded-[3px] w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow text-muted-foreground text-[0.6rem]">To</span>
          <Input type="date" className="h-10 rounded-[3px] w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button variant="outline" className="rounded-[3px] gap-1.5" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
        <Button variant="outline" className="rounded-[3px] gap-1.5" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / PDF
        </Button>
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-champagne" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard label="Total reservations" value={data.totalReservations} hint={data.byStatus["PENDING"] ? `${data.byStatus["PENDING"]} still pending` : "in period"} />
            <StatCard label="Avg. stay" value={`${data.avgStayNights} nights`} />
            <StatCard label="Occupancy rate" value={`${(data.occupancyRate * 100).toFixed(1)}%`} hint={`${data.bookedUnitNights} of ${data.capacityUnitNights} unit-nights`} />
            <StatCard label="Cancellation rate" value={`${(data.cancellationRate * 100).toFixed(1)}%`} />
            <StatCard label="No-show rate" value={`${(data.noShowRate * 100).toFixed(1)}%`} />
            <StatCard label="Recorded revenue" value={money(data.revenue, currency)} hint={`${data.paymentsCount} payments`} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-[3px] border border-border bg-card p-5">
              <p className="eyebrow text-muted-foreground text-[0.6rem] mb-4">Bookings per month</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlySeries} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e1d2" vertical={false} />
                    <XAxis dataKey="key" tick={{ fontSize: 10, fill: "#6d6d62" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#6d6d62" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 3, border: "1px solid #e3dbc9", fontSize: 12 }} />
                    <Bar dataKey="bookings" fill="#c5a477" radius={[2, 2, 0, 0]} barSize={30} name="Bookings" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-[3px] border border-border bg-card p-5">
              <p className="eyebrow text-muted-foreground text-[0.6rem] mb-4">Most booked categories</p>
              <ul className="space-y-3">
                {data.categoryCounts.map((c) => {
                  const max = Math.max(1, ...data.categoryCounts.map((x) => x.count));
                  return (
                    <li key={c.name}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span>{c.name}</span>
                        <span className="text-muted-foreground">{c.count}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-champagne" style={{ width: `${(c.count / max) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
                {data.categoryCounts.length === 0 && <p className="text-sm text-muted-foreground">No bookings in this period.</p>}
              </ul>
            </div>
          </div>

          <div className="rounded-[3px] border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/40">
              <p className="eyebrow text-muted-foreground text-[0.6rem]">Status breakdown</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="border-b border-border text-left">
                    {["Status", "Count"].map((h) => <th key={h} className="px-5 py-2.5 text-[0.6rem] eyebrow text-muted-foreground">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.byStatus).map(([k, v]) => (
                    <tr key={k} className="border-b border-border/50 last:border-0">
                      <td className="px-5 py-2.5">{k.replace("_", " ")}</td>
                      <td className="px-5 py-2.5 font-medium">{v}</td>
                    </tr>
                  ))}
                  {Object.keys(data.byStatus).length === 0 && (
                    <tr><td colSpan={2} className="px-5 py-6 text-center text-muted-foreground text-sm">No reservations created in this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

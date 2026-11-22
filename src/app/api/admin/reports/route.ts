import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError } from "@/lib/api";
import { parseDateOnly, addDays, toDateKey, todayInPropertyTz } from "@/lib/dates";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD&format=json|csv
 * Analytics over bookings created in the range + occupancy of stays overlapping it.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const sp = req.nextUrl.searchParams;
    const today = todayInPropertyTz();
    const from = parseDateOnly(sp.get("from") || "") ?? new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const to = parseDateOnly(sp.get("to") || "") ?? addDays(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)), 31);
    const format = sp.get("format") || "json";

    const rangeStart = from < to ? from : to;
    const rangeEnd = from < to ? to : from;
    // Inclusive day count (Jan 1 → Jan 31 = 31 days).
    const days = Math.max(1, Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000) + 1);

    const settings = await getSettings();
    const baseCurrency = settings.currency || "USD";

    const [createdBookings, activeUnits, payments, allCategories] = await Promise.all([
      db.booking.findMany({
        where: { createdAt: { gte: rangeStart, lt: addDays(rangeEnd, 1) } },
        include: { category: { select: { name: true } }, unit: { select: { number: true } }, payments: true },
        orderBy: { createdAt: "asc" },
      }),
      db.unit.count({ where: { status: "ACTIVE" } }),
      db.payment.findMany({
        where: { recordedAt: { gte: rangeStart, lt: addDays(rangeEnd, 1) } },
        include: { booking: { select: { reference: true, currency: true } } },
      }),
      db.category.findMany({ where: { active: true }, select: { id: true, name: true } }),
    ]);

    // Status breakdown
    const byStatus: Record<string, number> = {};
    for (const b of createdBookings) byStatus[b.status] = (byStatus[b.status] || 0) + 1;
    const total = createdBookings.length;
    const completedish = createdBookings.filter((b) => !["REJECTED", "CANCELLED", "EXPIRED"].includes(b.status));
    const avgStay = completedish.length ? completedish.reduce((s, b) => s + b.nights, 0) / completedish.length : 0;
    const cancellationRate = total ? (byStatus["CANCELLED"] || 0) / total : 0;
    const noShowRate = total ? (byStatus["NO_SHOW"] || 0) / total : 0;

    // Occupancy: unit-nights of stays overlapping the range
    const stays = await db.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
        checkIn: { lt: addDays(rangeEnd, 1) },
        checkOut: { gt: rangeStart },
        unitId: { not: null },
      },
      select: { checkIn: true, checkOut: true },
    });
    let bookedUnitNights = 0;
    for (const s of stays) {
      const start = Math.max(s.checkIn.getTime(), rangeStart.getTime());
      const end = Math.min(s.checkOut.getTime(), addDays(rangeEnd, 1).getTime());
      bookedUnitNights += Math.max(0, Math.round((end - start) / 86_400_000));
    }
    const capacityUnitNights = activeUnits * days;
    const occupancyRate = capacityUnitNights ? bookedUnitNights / capacityUnitNights : 0;

    // Revenue from recorded payments, grouped per currency.
    const revenueByCurrency: Record<string, number> = {};
    for (const p of payments) {
      const cur = p.currency || baseCurrency;
      revenueByCurrency[cur] = (revenueByCurrency[cur] || 0) + p.amount;
    }
    const revenue = revenueByCurrency[baseCurrency] || 0;
    const mixedCurrency = Object.keys(revenueByCurrency).some((c) => c !== baseCurrency && revenueByCurrency[c] > 0);

    // Monthly series across the range (calendar months touched)
    const monthKeys: string[] = [];
    {
      const cursor = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1));
      while (cursor <= rangeEnd) {
        monthKeys.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        if (monthKeys.length > 24) break;
      }
    }
    const monthlySeries = monthKeys.map((key) => ({ key, bookings: 0, revenue: 0 }));
    for (const b of createdBookings) {
      const key = `${b.createdAt.getUTCFullYear()}-${String(b.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const row = monthlySeries.find((m) => m.key === key);
      if (row) row.bookings++;
    }
    for (const p of payments) {
      if ((p.currency || baseCurrency) !== baseCurrency) continue; // series tracks the base currency only
      const key = `${p.recordedAt.getUTCFullYear()}-${String(p.recordedAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const row = monthlySeries.find((m) => m.key === key);
      if (row) row.revenue += p.amount;
    }

    // Most booked categories
    const categoryCounts = allCategories
      .map((c) => ({
        name: c.name,
        count: createdBookings.filter((b) => b.categoryId === c.id && !["REJECTED", "EXPIRED"].includes(b.status)).length,
      }))
      .sort((a, b) => b.count - a.count);

    const report = {
      from: toDateKey(rangeStart),
      to: toDateKey(rangeEnd),
      days,
      totalReservations: total,
      byStatus,
      avgStayNights: Math.round(avgStay * 10) / 10,
      cancellationRate,
      noShowRate,
      occupancyRate,
      capacityUnitNights,
      bookedUnitNights,
      revenue,
      baseCurrency,
      revenueByCurrency,
      mixedCurrency,
      paymentsCount: payments.length,
      monthlySeries,
      categoryCounts,
    };

    if (format === "csv") {
      const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
      const lines: string[] = [];
      lines.push("ZAURA ZANZIBAR — BOOKING REPORT");
      lines.push(`Period,${toDateKey(rangeStart)},to,${toDateKey(rangeEnd)}`);
      lines.push("");
      lines.push("Metric,Value");
      lines.push(`Total reservations,${report.totalReservations}`);
      lines.push(`Average stay (nights),${report.avgStayNights}`);
      lines.push(`Cancellation rate,${(report.cancellationRate * 100).toFixed(1)}%`);
      lines.push(`No-show rate,${(report.noShowRate * 100).toFixed(1)}%`);
      lines.push(`Occupancy rate,${(report.occupancyRate * 100).toFixed(1)}%`);
      lines.push(`Revenue from recorded payments,${report.revenue} ${report.baseCurrency}`);
      if (report.mixedCurrency) {
        const others = Object.entries(report.revenueByCurrency)
          .filter(([c]) => c !== report.baseCurrency && report.revenueByCurrency[c] > 0)
          .map(([c, v]) => `${c} ${v}`);
        lines.push(`Revenue in other currencies,${others.join("; ")}`);
      }
      lines.push("");
      lines.push("Status,Count");
      for (const [k, v] of Object.entries(byStatus)) lines.push(`${k},${v}`);
      lines.push("");
      lines.push("Month,Bookings,Revenue");
      for (const m of monthlySeries) lines.push(`${m.key},${m.bookings},${m.revenue.toFixed(2)}`);
      lines.push("");
      lines.push("Category,Bookings");
      for (const c of categoryCounts) lines.push(`${esc(c.name)},${c.count}`);
      lines.push("");
      lines.push("Reference,Guest,Phone,Category,Unit,Check-in,Check-out,Nights,Status,Estimated total,Currency,Created");
      for (const b of createdBookings) {
        lines.push(
          [
            esc(b.reference), esc(b.guestName), esc(b.guestPhone), esc(b.category.name),
            esc(b.unit?.number || ""), toDateKey(b.checkIn), toDateKey(b.checkOut), b.nights,
            b.status, b.estTotal, b.currency, b.createdAt.toISOString(),
          ].join(",")
        );
      }
      return new NextResponse(lines.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="zaura-report-${toDateKey(rangeStart)}_${toDateKey(rangeEnd)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      ...report,
      bookings: createdBookings.map((b) => ({
        reference: b.reference,
        guestName: b.guestName,
        categoryName: b.category.name,
        unitNumber: b.unit?.number || null,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        nights: b.nights,
        status: b.status,
        estTotal: b.estTotal,
        currency: b.currency,
        createdAt: b.createdAt,
        paid: b.payments.reduce((s, p) => s + p.amount, 0),
      })),
    });
  } catch (error) {
    return handleUnknownError(error, "admin:reports");
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError } from "@/lib/api";
import { todayInPropertyTz, parseDateOnly, addDays } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { ACTIVE_BOOKING_STATUSES, PROPERTY_TZ } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** GET /api/admin/overview — dashboard statistics. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  try {
    const today = todayInPropertyTz();
    const tomorrow = addDays(today, 1);
    // Month boundary in the property timezone (not UTC) so "this month" matches
    // what the property considers the current month.
    const ymKey = new Intl.DateTimeFormat("en-CA", { timeZone: PROPERTY_TZ, year: "numeric", month: "2-digit" }).format(new Date());
    const [y, m] = ymKey.split("-").map(Number);
    const monthStart = new Date(Date.UTC(y, m - 1, 1));

    const settings = await getSettings();
    const baseCurrency = settings.currency || "USD";

    const [statusCounts, todayCheckIns, todayCheckOuts, activeUnits, occupiedCount, maintenanceCount, revenueAgg, expiringSoon, recentBookings] =
      await Promise.all([
        db.booking.groupBy({ by: ["status"], _count: true }),
        db.booking.count({
          where: { checkIn: { gte: today, lt: tomorrow }, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
        }),
        db.booking.count({
          where: { checkOut: { gte: today, lt: tomorrow }, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
        }),
        db.unit.count({ where: { status: "ACTIVE" } }),
        db.booking.count({
          where: {
            status: "CHECKED_IN",
            checkIn: { lte: today },
            checkOut: { gt: today },
            unitId: { not: null },
          },
        }),
        db.unit.count({ where: { status: "MAINTENANCE" } }),
        db.payment.aggregate({
          where: { recordedAt: { gte: monthStart }, currency: baseCurrency },
          _sum: { amount: true },
        }),
        db.booking.findMany({
          where: { status: "PENDING", holdExpiresAt: { lt: new Date(Date.now() + 10 * 60_000) } },
          select: { reference: true, holdExpiresAt: true },
          orderBy: { holdExpiresAt: "asc" },
        }),
        db.booking.findMany({
          where: { status: "PENDING" },
          include: { category: { select: { name: true } }, unit: { select: { number: true } } },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
      ]);

    const statusMap: Record<string, number> = {};
    for (const row of statusCounts) statusMap[row.status] = row._count;

    // Booking trend: bookings created per month, last 6 months
    const trendStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));
    const trendBookings = await db.booking.findMany({
      where: { createdAt: { gte: trendStart } },
      select: { createdAt: true, status: true },
    });
    const months: { key: string; label: string; bookings: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
      months.push({ key, label, bookings: 0, revenue: 0 });
    }
    for (const b of trendBookings) {
      const key = `${b.createdAt.getUTCFullYear()}-${String(b.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const m = months.find((x) => x.key === key);
      if (m) m.bookings++;
    }
    const trendPayments = await db.payment.findMany({
      where: { recordedAt: { gte: trendStart }, currency: baseCurrency },
      select: { amount: true, recordedAt: true },
    });
    for (const p of trendPayments) {
      const key = `${p.recordedAt.getUTCFullYear()}-${String(p.recordedAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const m = months.find((x) => x.key === key);
      if (m) m.revenue += p.amount;
    }

    // Units currently free (active, not occupied today, no pending/confirmed hold today)
    const activeStatuses = [...ACTIVE_BOOKING_STATUSES];
    const holdingToday = await db.booking.findMany({
      where: {
        status: { in: activeStatuses as ("PENDING" | "CONFIRMED" | "CHECKED_IN")[] },
        checkIn: { lt: tomorrow },
        checkOut: { gt: today },
        unitId: { not: null },
      },
      select: { unitId: true },
    });
    const heldUnitIds = new Set(holdingToday.map((b) => b.unitId!));
    const allActiveUnits = await db.unit.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
    const availableUnits = allActiveUnits.filter((u) => !heldUnitIds.has(u.id)).length;

    const totalAll = await db.booking.count();

    return NextResponse.json({
      totals: {
        reservations: totalAll,
        pending: statusMap["PENDING"] || 0,
        confirmed: statusMap["CONFIRMED"] || 0,
        checkedIn: statusMap["CHECKED_IN"] || 0,
        cancelled: (statusMap["CANCELLED"] || 0) + (statusMap["REJECTED"] || 0),
        expired: statusMap["EXPIRED"] || 0,
        noShow: statusMap["NO_SHOW"] || 0,
      },
      today: { checkIns: todayCheckIns, checkOuts: todayCheckOuts },
      units: { active: allActiveUnits.length, available: availableUnits, occupied: occupiedCount, maintenance: maintenanceCount },
      revenueThisMonth: revenueAgg._sum.amount || 0,
      baseCurrency,
      expiringSoon,
      recentPending: recentBookings.map((b) => ({
        id: b.id,
        reference: b.reference,
        guestName: b.guestName,
        categoryName: b.category.name,
        unitNumber: b.unit?.number || null,
        createdAt: b.createdAt,
        holdExpiresAt: b.holdExpiresAt,
      })),
      trend: months,
    });
  } catch (error) {
    return handleUnknownError(error, "admin:overview");
  }
}

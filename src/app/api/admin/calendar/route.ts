import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError } from "@/lib/api";
import { expireStalePendings } from "@/lib/availability";
import { parseDateOnly, addDays, eachDate, todayInPropertyTz, toDateKey } from "@/lib/dates";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/calendar?from=YYYY-MM-DD&days=N
 * Reservation grid: units × days with hold/booking/maintenance states.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  try {
    await expireStalePendings();
    const sp = req.nextUrl.searchParams;
    const fromKey = sp.get("from");
    const days = Math.min(62, Math.max(1, parseInt(sp.get("days") || "31", 10) || 31));
    const today = todayInPropertyTz();
    const from = fromKey ? (parseDateOnly(fromKey) ?? today) : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const to = addDays(from, days);

    const units = await db.unit.findMany({
      orderBy: [{ number: "asc" }],
      include: { category: { select: { name: true } } },
    });

    const statuses = [...ACTIVE_BOOKING_STATUSES, "CHECKED_OUT"] as const;
    const bookings = await db.booking.findMany({
      where: {
        unitId: { not: null },
        checkIn: { lt: to },
        checkOut: { gt: from },
        status: { in: statuses as unknown as ("PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT")[] },
      },
      select: {
        id: true, reference: true, guestName: true, unitId: true, checkIn: true,
        checkOut: true, status: true,
      },
    });

    const dates = eachDate(from, to);
    const dateKeys = dates.map(toDateKey);

    const rows = units.map((u) => {
      const unitBookings = bookings.filter((b) => b.unitId === u.id);
      const cells = dateKeys.map((key) => {
        const dayStart = parseDateOnly(key)!;
        const dayEnd = addDays(dayStart, 1);
        const spanning = unitBookings.filter((b) => b.checkIn < dayEnd && b.checkOut > dayStart);
        // Priority: checked-in > confirmed > pending > checked-out (past)
        const order: Record<string, number> = { CHECKED_IN: 4, CONFIRMED: 3, PENDING: 2, CHECKED_OUT: 1 };
        spanning.sort((a, b) => (order[b.status] || 0) - (order[a.status] || 0));
        const top = spanning[0];
        let cellStatus: string = u.status === "MAINTENANCE" ? "MAINTENANCE" : u.status === "INACTIVE" ? "INACTIVE" : "FREE";
        let ref: string | null = null;
        let bookingId: string | null = null;
        if (top) {
          cellStatus = top.status;
          ref = top.reference;
          bookingId = top.id;
        }
        const checkInToday = top && toDateKey(top.checkIn) === key;
        const checkOutToday = top && toDateKey(top.checkOut) === key;
        return { date: key, status: cellStatus, reference: ref, bookingId, checkInToday, checkOutToday, guest: top?.guestName || null };
      });
      return {
        unitId: u.id,
        unitName: u.name,
        unitNumber: u.number,
        unitStatus: u.status,
        maintenanceNote: u.maintenanceNote,
        categoryName: u.category.name,
        cells,
      };
    });

    return NextResponse.json({ from: toDateKey(from), days, dates: dateKeys, rows });
  } catch (error) {
    return handleUnknownError(error, "admin:calendar");
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expireStalePendings, getCategoryUnitAvailability } from "@/lib/availability";
import { parseDateOnly, todayInPropertyTz, addDays, eachDate, toDateKey } from "@/lib/dates";
import { jsonError, handleUnknownError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/unit-calendar?categoryId=...&from=YYYY-MM-DD&days=30
 * Public per-day availability for the apartment details page.
 * Only aggregate states are exposed (no guest information).
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const categoryId = sp.get("categoryId") || "";
    const fromKey = sp.get("from") || "";
    const days = Math.min(45, Math.max(7, parseInt(sp.get("days") || "30", 10) || 30));
    if (!categoryId) return jsonError(400, "categoryId is required.");

    const today = todayInPropertyTz();
    const from = (fromKey && parseDateOnly(fromKey)) || today;
    const to = addDays(from, days);
    await expireStalePendings();

    const category = await db.category.findFirst({ where: { id: categoryId, active: true } });
    if (!category) return jsonError(404, "Category not found.");

    const states = await getCategoryUnitAvailability(db, categoryId, from, to);
    const unitIds = states.filter((s) => s.unit.status !== "INACTIVE").map((s) => s.unit.id);
    const isMaintained = (id: string) => states.some((s) => s.unit.id === id && s.unit.status === "MAINTENANCE");

    const statuses = ["PENDING", "CONFIRMED", "CHECKED_IN"] as const;
    const bookings = await db.booking.findMany({
      where: {
        unitId: { in: unitIds.length ? unitIds : ["-"] },
        status: { in: statuses as unknown as ("PENDING" | "CONFIRMED" | "CHECKED_IN")[] },
        checkIn: { lt: to },
        checkOut: { gt: from },
      },
      select: { unitId: true, checkIn: true, checkOut: true },
    });

    const dates = eachDate(from, to);
    const calendar = dates.map((d) => {
      const dayEnd = addDays(d, 1);
      // A stay occupies day d when checkIn <= d and checkOut > d
      // (half-open nights: same-day checkout does not block the following day).
      const busyIds = new Set(
        bookings.filter((b) => b.checkIn < dayEnd && b.checkOut > d).map((b) => b.unitId)
      );
      const free = unitIds.filter((id) => !busyIds.has(id) && !isMaintained(id)).length;
      return { date: toDateKey(d), free, total: unitIds.length };
    });

    return NextResponse.json({
      from: toDateKey(from),
      days,
      calendar,
      units: states.map((s) => ({ id: s.unit.id, number: s.unit.number, status: s.unit.status, available: s.available })),
    });
  } catch (error) {
    return handleUnknownError(error, "unit-calendar");
  }
}

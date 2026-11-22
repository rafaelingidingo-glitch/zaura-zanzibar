import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError, jsonError } from "@/lib/api";
import { expireStalePendings } from "@/lib/availability";
import { parseDateOnly } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** GET /api/admin/bookings — reservation list with filters. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  try {
    await expireStalePendings();
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status") || "";
    const q = (sp.get("q") || "").trim();
    const from = sp.get("from");
    const to = sp.get("to");
    const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
    const pageSize = 20;

    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") where.status = status;
    if (q) {
      where.OR = [
        { reference: { contains: q, mode: "insensitive" } },
        { guestName: { contains: q, mode: "insensitive" } },
        { guestPhone: { contains: q } },
        { guestEmail: { contains: q, mode: "insensitive" } },
      ];
    }
    if (from || to) {
      const fromDate = from ? parseDateOnly(from) : null;
      const toDate = to ? parseDateOnly(to) : null;
      if ((from && !fromDate) || (to && !toDate)) {
        return jsonError(400, "Invalid date filter format (expected YYYY-MM-DD).");
      }
      where.checkIn = {};
      if (fromDate) (where.checkIn as Record<string, unknown>).gte = fromDate;
      if (toDate) (where.checkIn as Record<string, unknown>).lte = toDate;
    }

    const [total, bookings] = await Promise.all([
      db.booking.count({ where }),
      db.booking.findMany({
        where,
        include: {
          category: { select: { name: true } },
          unit: { select: { number: true, name: true } },
          payments: { orderBy: { recordedAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      pageSize,
      bookings: bookings.map((b) => ({
        id: b.id,
        reference: b.reference,
        status: b.status,
        guestName: b.guestName,
        guestPhone: b.guestPhone,
        guestEmail: b.guestEmail,
        adults: b.adults,
        children: b.children,
        categoryName: b.category.name,
        unitNumber: b.unit?.number || null,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        nights: b.nights,
        estTotal: b.estTotal,
        currency: b.currency,
        specialRequests: b.specialRequests,
        internalNotes: b.internalNotes,
        holdExpiresAt: b.holdExpiresAt,
        confirmedAt: b.confirmedAt,
        createdAt: b.createdAt,
        payments: b.payments.map((p) => ({ id: p.id, amount: p.amount, method: p.method, note: p.note, recordedAt: p.recordedAt })),
      })),
    });
  } catch (error) {
    return handleUnknownError(error, "admin:bookings");
  }
}

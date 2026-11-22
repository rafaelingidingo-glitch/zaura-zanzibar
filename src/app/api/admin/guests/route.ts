import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/admin/guests?q= — simple guest CRM with search. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const guests = await db.guest.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        bookings: {
          orderBy: { checkIn: "desc" },
          select: {
            id: true, reference: true, status: true, checkIn: true, checkOut: true,
            nights: true, estTotal: true, currency: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      guests: guests.map((g) => ({
        id: g.id,
        name: g.name,
        phone: g.phone,
        email: g.email,
        notes: g.notes,
        createdAt: g.createdAt,
        bookingCount: g.bookings.length,
        totalNights: g.bookings.reduce((sum, b) => sum + (["CANCELLED", "REJECTED", "EXPIRED"].includes(b.status) ? 0 : b.nights), 0),
        lastStay: g.bookings[0]?.checkIn || null,
        bookings: g.bookings.map((b) => ({
          id: b.id,
          reference: b.reference,
          status: b.status,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          nights: b.nights,
          estTotal: b.estTotal,
          currency: b.currency,
          categoryName: b.category.name,
        })),
      })),
    });
  } catch (error) {
    return handleUnknownError(error, "admin:guests");
  }
}

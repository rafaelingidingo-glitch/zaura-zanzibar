import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError, jsonError } from "@/lib/api";
import { waLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/bookings/[id]/whatsapp — helper link (contact guest).
 * Targets the GUEST's WhatsApp number with a pre-filled intro message.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const booking = await db.booking.findUnique({ where: { id }, include: { category: true, unit: true } });
    if (!booking) return jsonError(404, "Booking not found.");
    const msg = [
      `Hello ${booking.guestName},`,
      "",
      `Regarding your reservation request ${booking.reference} (${booking.category.name}${booking.unit?.number ? `, Apartment ${booking.unit.number}` : ""}) from Zaura Zanzibar.`,
    ].join("\n");
    return NextResponse.json({ link: waLink(booking.guestPhone, msg), phone: booking.guestPhone });
  } catch (error) {
    return handleUnknownError(error, "admin:booking-whatsapp");
  }
}

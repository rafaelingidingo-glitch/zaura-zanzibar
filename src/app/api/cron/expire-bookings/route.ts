import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expireStalePendings } from "@/lib/availability";
import { formatLongDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/expire-bookings — reliable background expiration processing.
 * Called by Vercel Cron every 5 minutes (vercel.json) and safe to call anytime.
 * Secured with the CRON_SECRET env variable.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  const auth = req.headers.get("authorization") || "";
  const querySecret = req.nextUrl.searchParams.get("secret") || "";
  if (!secret || (auth !== `Bearer ${secret}` && querySecret !== secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Notify admins about requests that just expired
    const expiring = await db.booking.findMany({
      where: { status: "PENDING", holdExpiresAt: { lt: new Date() } },
      select: { id: true, reference: true, guestName: true, checkIn: true },
    });

    const count = await expireStalePendings();

    for (const b of expiring) {
      await db.adminNotification.create({
        data: {
          type: "REQUEST_EXPIRED",
          title: `Request ${b.reference} expired`,
          body: `${b.guestName} · check-in ${formatLongDate(b.checkIn)} — inventory released`,
          bookingId: b.id,
        },
      });
    }

    return NextResponse.json({ ok: true, expired: count });
  } catch (error) {
    console.error("[zaura:cron]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

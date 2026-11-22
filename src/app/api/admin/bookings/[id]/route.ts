import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError, jsonError } from "@/lib/api";
import { bookingActionSchema } from "@/lib/validators";
import { expireStalePendings, isUnitFree } from "@/lib/availability";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/bookings/[id] — reservation lifecycle actions.
 * Confirmation re-checks availability inside a transaction to prevent
 * double bookings of the same physical apartment.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = bookingActionSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message || "Invalid action.");
    const { action, notes, extendMinutes, payment } = parsed.data;

    const booking = await db.booking.findUnique({ where: { id }, include: { unit: true, category: true } });
    if (!booking) return jsonError(404, "Booking not found.");

    await expireStalePendings();

    switch (action) {
      case "confirm": {
        if (booking.status !== "PENDING") {
          return jsonError(409, `Only pending requests can be confirmed (current status: ${booking.status}).`);
        }
        if (!booking.unitId) return jsonError(409, "This request has no apartment assigned.");

        // Concurrency-safe confirmation: recheck availability in a transaction
        // (with retries for serialization conflicts under load)
        let confirmed: { id: string; status: string; reference: string } | null = null;
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            confirmed = await db.$transaction(
              async (tx) => {
                const current = await tx.booking.findUnique({ where: { id } });
                if (!current || current.status !== "PENDING") {
                  throw new Error("STATUS_CHANGED");
                }
                const free = await isUnitFree(
                  tx,
                  current.unitId!,
                  current.checkIn,
                  current.checkOut,
                  current.id
                );
                if (!free) throw new Error("NOT_AVAILABLE");
                return tx.booking.update({
                  where: { id },
                  data: { status: "CONFIRMED", confirmedAt: new Date(), holdExpiresAt: null },
                });
              },
              { isolationLevel: "Serializable", timeout: 20_000 }
            );
            break;
          } catch (e) {
            if ((e as { code?: string }).code === "P2034") continue; // write conflict → retry
            throw e;
          }
        }
        if (!confirmed) {
          throw new Error("NOT_AVAILABLE");
        }

        await db.adminNotification.create({
          data: {
            type: "BOOKING_CONFIRMED",
            title: `Booking ${confirmed.reference} confirmed`,
            body: `${booking.guestName} · ${booking.category.name} ${booking.unit?.number ? `Apt ${booking.unit.number}` : ""}`,
            bookingId: id,
          },
        });
        return NextResponse.json({ ok: true, booking: { id: confirmed.id, status: confirmed.status } });
      }

      case "reject": {
        if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
          return jsonError(409, `Cannot reject a booking with status ${booking.status}.`);
        }
        await db.booking.update({ where: { id }, data: { status: "REJECTED", rejectedAt: new Date(), holdExpiresAt: null } });
        return NextResponse.json({ ok: true, status: "REJECTED" });
      }

      case "cancel": {
        if (["REJECTED", "CANCELLED", "EXPIRED"].includes(booking.status)) {
          return jsonError(409, `Booking is already ${booking.status}.`);
        }
        await db.booking.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date(), holdExpiresAt: null } });
        return NextResponse.json({ ok: true, status: "CANCELLED" });
      }

      case "extend": {
        if (booking.status !== "PENDING") return jsonError(409, "Only pending requests can be extended.");
        const settings = await getSettings();
        const minutes = extendMinutes ?? Math.max(5, parseInt(settings.pendingExpiryMinutes, 10) || 15);
        const base = booking.holdExpiresAt && booking.holdExpiresAt > new Date() ? booking.holdExpiresAt : new Date();
        const holdExpiresAt = new Date(base.getTime() + minutes * 60_000);
        await db.booking.update({ where: { id }, data: { holdExpiresAt } });
        return NextResponse.json({ ok: true, holdExpiresAt });
      }

      case "checkin": {
        if (booking.status !== "CONFIRMED") return jsonError(409, "Only confirmed bookings can be checked in.");
        await db.booking.update({ where: { id }, data: { status: "CHECKED_IN" } });
        return NextResponse.json({ ok: true, status: "CHECKED_IN" });
      }

      case "checkout": {
        if (booking.status !== "CHECKED_IN") return jsonError(409, "Only checked-in bookings can be checked out.");
        await db.booking.update({ where: { id }, data: { status: "CHECKED_OUT" } });
        return NextResponse.json({ ok: true, status: "CHECKED_OUT" });
      }

      case "noshow": {
        if (!["CONFIRMED", "CHECKED_IN"].includes(booking.status)) {
          return jsonError(409, "Only confirmed or checked-in bookings can be marked as no-show.");
        }
        await db.booking.update({ where: { id }, data: { status: "NO_SHOW", holdExpiresAt: null } });
        return NextResponse.json({ ok: true, status: "NO_SHOW" });
      }

      case "notes": {
        if (typeof notes !== "string") return jsonError(400, "Notes are required.");
        await db.booking.update({ where: { id }, data: { internalNotes: notes } });
        return NextResponse.json({ ok: true });
      }

      case "addPayment": {
        if (!payment || payment.amount <= 0) return jsonError(400, "A payment amount is required.");
        await db.payment.create({
          data: { bookingId: id, amount: payment.amount, method: payment.method, note: payment.note || null },
        });
        return NextResponse.json({ ok: true });
      }
    }
    return jsonError(400, "Unknown action.");
  } catch (error) {
    // Only surface our own sentinel messages; everything else stays a generic 500.
    if (error instanceof Error && (error.message === "STATUS_CHANGED" || error.message === "NOT_AVAILABLE")) {
      const friendly: Record<string, string> = {
        STATUS_CHANGED: "This request was already updated by someone else. Refresh and try again.",
        NOT_AVAILABLE: "This apartment now conflicts with another reservation for these dates. Reject this request or reassign dates.",
      };
      return jsonError(409, friendly[error.message]);
    }
    return handleUnknownError(error, "admin:booking-action");
  }
}

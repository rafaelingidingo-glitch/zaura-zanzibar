import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookingRequestSchema } from "@/lib/validators";
import { expireStalePendings, getCategoryUnitAvailability, isUnitFree } from "@/lib/availability";
import { parseDateOnly, todayInPropertyTz, nightsBetween, formatLongDate } from "@/lib/dates";
import { jsonError, handleUnknownError, guardRate, getClientIp } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { buildBookingMessage, waLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

class BookingError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * POST /api/bookings — create a request-to-book reservation (status PENDING).
 * Concurrency-safe: availability is re-checked inside a serializable transaction
 * and a physical unit is atomically reserved.
 */
export async function POST(req: NextRequest) {
  const limited = guardRate(req, "bookings", 8, 10 * 60_000);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => null);
    const parsed = bookingRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, parsed.error.issues[0]?.message || "Invalid booking details.");
    }
    const data = parsed.data;

    const checkIn = parseDateOnly(data.checkIn);
    const checkOut = parseDateOnly(data.checkOut);
    if (!checkIn || !checkOut) return jsonError(400, "Invalid dates.");
    const today = todayInPropertyTz();
    if (checkIn < today) return jsonError(400, "Check-in cannot be in the past.");
    if (checkOut <= checkIn) return jsonError(400, "Check-out must be after check-in.");
    const nights = nightsBetween(checkIn, checkOut);
    if (nights > 60) return jsonError(400, "Stays longer than 60 nights are not supported online. Please contact us directly.");

    await expireStalePendings();

    const settings = await getSettings();
    const category = await db.category.findFirst({ where: { id: data.categoryId, active: true } });
    if (!category) return jsonError(400, "This accommodation type is no longer available.");

    const totalGuests = data.adults + data.children;
    if (data.adults > category.maxAdults || data.children > category.maxChildren || totalGuests > category.maxOccupancy) {
      return jsonError(400, `This accommodation hosts up to ${category.maxOccupancy} guests (${category.maxAdults} adults, ${category.maxChildren} children).`);
    }

    const result = await createBookingWithRetry(
      {
        ...data,
        guestEmail: data.guestEmail || null,
        specialRequests: data.specialRequests || null,
      },
      category,
      checkIn,
      checkOut,
      nights,
      settings,
      getClientIp(req)
    );

    if ("duplicate" in result && result.duplicate) {
      // Idempotent replay: return the original booking so the UI can recover
      const dup = result.booking;
      const cat = await db.category.findUnique({ where: { id: dup.categoryId } });
      const message = buildBookingMessage({
        reference: dup.reference,
        guestName: dup.guestName,
        categoryName: cat?.name || "",
        unitNumber: dup.unit?.number || null,
        checkIn,
        checkOut,
        adults: data.adults,
        children: data.children,
        nights,
        estTotal: dup.estTotal,
        currency: dup.currency,
      });
      const links: { primary?: string; secondary?: string } = {};
      const choice = settings.primaryContact === "SECONDARY" ? "SECONDARY" : settings.primaryContact === "PRIMARY" ? "PRIMARY" : data.contactChoice;
      if (choice === "PRIMARY" || choice === "GUEST_CHOICE") links.primary = waLink(settings.whatsappPrimary, message);
      if (choice === "SECONDARY" || choice === "GUEST_CHOICE") links.secondary = waLink(settings.whatsappSecondary, message);
      return NextResponse.json({
        booking: {
          id: dup.id,
          reference: dup.reference,
          status: dup.status,
          holdExpiresAt: dup.holdExpiresAt,
          guestName: dup.guestName,
          categoryName: cat?.name || "",
          unitNumber: dup.unit?.number || null,
          checkIn: formatLongDate(checkIn),
          checkOut: formatLongDate(checkOut),
          nights,
          adults: data.adults,
          children: data.children,
          estTotal: dup.estTotal,
          currency: dup.currency,
        },
        whatsapp: links,
        message,
        holdExpiresAt: dup.holdExpiresAt,
      });
    }

    const created = result.booking;
    const message = buildBookingMessage({
      reference: created.reference,
      guestName: created.guestName,
      categoryName: category.name,
      unitNumber: created.unit?.number || null,
      checkIn,
      checkOut,
      adults: data.adults,
      children: data.children,
      nights,
      estTotal: created.estTotal,
      currency: created.currency,
    });

    const choice = settings.primaryContact === "SECONDARY" ? "SECONDARY" : settings.primaryContact === "PRIMARY" ? "PRIMARY" : data.contactChoice;
    const links: { primary?: string; secondary?: string } = {};
    if (choice === "PRIMARY" || choice === "GUEST_CHOICE") links.primary = waLink(settings.whatsappPrimary, message);
    if (choice === "SECONDARY" || choice === "GUEST_CHOICE") links.secondary = waLink(settings.whatsappSecondary, message);

    return NextResponse.json(
      {
        booking: {
          id: created.id,
          reference: created.reference,
          status: created.status,
          holdExpiresAt: created.holdExpiresAt,
          guestName: created.guestName,
          categoryName: category.name,
          unitNumber: created.unit?.number || null,
          checkIn: formatLongDate(checkIn),
          checkOut: formatLongDate(checkOut),
          nights,
          adults: data.adults,
          children: data.children,
          estTotal: created.estTotal,
          currency: created.currency,
        },
        whatsapp: links,
        message,
        holdExpiresAt: created.holdExpiresAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof BookingError) return jsonError(error.status, error.message);
    return handleUnknownError(error, "bookings");
  }
}

type CreateResult =
  | { booking: Awaited<ReturnType<typeof doCreate>>; duplicate?: false }
  | { booking: {
      id: string; reference: string; status: string; holdExpiresAt: Date | null;
      guestName: string; estTotal: number; currency: string; categoryId: string;
      unit: { number: string } | null;
    }; duplicate: true };

async function createBookingWithRetry(
  data: {
    checkIn: string; checkOut: string; categoryId: string; unitId?: string | "";
    adults: number; children: number; guestName: string; guestPhone: string;
    guestEmail: string | null; specialRequests: string | null;
    contactChoice: "PRIMARY" | "SECONDARY"; idempotencyKey: string;
  },
  category: { id: string; basePrice: number; currency: string; name: string },
  checkIn: Date,
  checkOut: Date,
  nights: number,
  settings: Awaited<ReturnType<typeof getSettings>>,
  ip: string
): Promise<CreateResult> {
  // Duplicate submission protection via idempotency key
  const existing = await db.booking.findUnique({ where: { idempotencyKey: data.idempotencyKey } });
  if (existing) {
    const unit = existing.unitId ? await db.unit.findUnique({ where: { id: existing.unitId } }) : null;
    return {
      booking: {
        id: existing.id,
        reference: existing.reference,
        status: existing.status,
        holdExpiresAt: existing.holdExpiresAt,
        guestName: existing.guestName,
        estTotal: existing.estTotal,
        currency: existing.currency,
        categoryId: existing.categoryId,
        unit: unit ? { number: unit.number } : null,
      },
      duplicate: true,
    };
  }

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const booking = await db.$transaction(
        (tx) => doCreate(tx, data, category, checkIn, checkOut, nights, settings, ip),
        { isolationLevel: "Serializable", timeout: 20_000 }
      );
      return { booking, duplicate: false };
    } catch (e) {
      lastError = e;
      const code = (e as { code?: string }).code;
      if (code === "P2034") continue; // serialization conflict → retry
      throw e;
    }
  }
  throw lastError ?? new BookingError(500, "Booking could not be created.");
}

async function doCreate(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  data: {
    checkIn: string; checkOut: string; categoryId: string; unitId?: string | "";
    adults: number; children: number; guestName: string; guestPhone: string;
    guestEmail: string | null; specialRequests: string | null;
    contactChoice: "PRIMARY" | "SECONDARY"; idempotencyKey: string;
  },
  category: { id: string; basePrice: number; currency: string; name: string },
  checkIn: Date,
  checkOut: Date,
  nights: number,
  settings: Awaited<ReturnType<typeof getSettings>>,
  ip: string
) {
  // Resolve unit: either the guest's selection, or auto-assign a free unit
  let unitId: string | null = null;
  if (data.unitId) {
    const unit = await tx.unit.findUnique({ where: { id: data.unitId } });
    if (!unit || unit.categoryId !== category.id) {
      throw new BookingError(400, "Selected apartment does not exist in this category.");
    }
    if (unit.status !== "ACTIVE") {
      throw new BookingError(409, "The selected apartment is currently unavailable.");
    }
    const free = await isUnitFree(tx, unit.id, checkIn, checkOut);
    if (!free) throw new BookingError(409, "The selected apartment was just requested by another guest. Please choose another apartment.");
    unitId = unit.id;
  } else {
    const states = await getCategoryUnitAvailability(tx, category.id, checkIn, checkOut);
    const free = states.find((s) => s.available);
    if (!free) throw new BookingError(409, "No apartments of this type are available for your dates. Please adjust your dates or choose another type.");
    unitId = free.unit.id;
  }

  const unit = await tx.unit.findUnique({ where: { id: unitId } });
  const pricePerNight = unit?.priceOverride ?? category.basePrice;
  const estTotal = Math.round(pricePerNight * nights * 100) / 100;

  // Booking reference ZZA-YYYY-NNNN (collision-safe)
  const year = new Date().getUTCFullYear();
  const prefix = `ZZA-${year}-`;
  const count = await tx.booking.count({ where: { reference: { startsWith: prefix } } });

  const holdMinutes = Math.max(5, parseInt(settings.pendingExpiryMinutes, 10) || 15);
  const holdExpiresAt = new Date(Date.now() + holdMinutes * 60_000);

  // Guest CRM upsert
  const guest = await tx.guest.upsert({
    where: { phone: data.guestPhone },
    create: { phone: data.guestPhone, name: data.guestName, email: data.guestEmail },
    update: { name: data.guestName, email: data.guestEmail || undefined },
  });

  for (let i = 1; i <= 30; i++) {
    const reference = `${prefix}${String(count + i).padStart(4, "0")}`;
    try {
      const booking = await tx.booking.create({
        data: {
          reference,
          status: "PENDING",
          categoryId: category.id,
          unitId,
          guestId: guest.id,
          guestName: data.guestName,
          guestPhone: data.guestPhone,
          guestEmail: data.guestEmail,
          adults: data.adults,
          children: data.children,
          checkIn,
          checkOut,
          nights,
          pricePerNight,
          estTotal,
          currency: category.currency || settings.currency,
          specialRequests: data.specialRequests,
          contactChoice: data.contactChoice,
          holdExpiresAt,
          idempotencyKey: data.idempotencyKey,
          guestIp: ip,
        },
        include: { unit: true },
      });
      await tx.adminNotification.create({
        data: {
          type: "NEW_BOOKING_REQUEST",
          title: `New request ${reference}`,
          body: `${data.guestName} · ${category.name} ${unit?.number ? `Apt ${unit.number} · ` : ""}${formatLongDate(checkIn)} → ${formatLongDate(checkOut)}`,
          bookingId: booking.id,
        },
      });
      return booking;
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "P2002") continue; // reference collision → try next number
      throw e;
    }
  }
  throw new BookingError(500, "Could not generate a booking reference. Please try again.");
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { availabilityQuerySchema } from "@/lib/validators";
import { expireStalePendings, getCategoryUnitAvailability } from "@/lib/availability";
import { parseDateOnly, todayInPropertyTz, nightsBetween, addDays } from "@/lib/dates";
import { jsonError, handleUnknownError } from "@/lib/api";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability
 * Public availability search: returns categories with free unit counts,
 * and (optionally) per-unit states for one category.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const parsed = availabilityQuerySchema.safeParse({
      checkIn: sp.get("checkIn") || "",
      checkOut: sp.get("checkOut") || "",
      adults: sp.get("adults") || 2,
      children: sp.get("children") || 0,
      categoryId: sp.get("categoryId") || undefined,
    });
    if (!parsed.success) {
      return jsonError(400, "Please provide valid check-in and check-out dates.");
    }
    const { checkIn: checkInKey, checkOut: checkOutKey, adults, children, categoryId } = parsed.data;
    const checkIn = parseDateOnly(checkInKey);
    const checkOut = parseDateOnly(checkOutKey);
    if (!checkIn || !checkOut) return jsonError(400, "Invalid dates.");

    const today = todayInPropertyTz();
    if (checkIn < today) return jsonError(400, "Check-in cannot be in the past.");
    if (checkOut <= checkIn) return jsonError(400, "Check-out must be after check-in.");
    const nights = nightsBetween(checkIn, checkOut);
    if (nights > 60) return jsonError(400, "Stays longer than 60 nights are not supported online. Please contact us directly.");

    await expireStalePendings();
    const settings = await getSettings();

    const categories = await db.category.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        amenities: { include: { amenity: true } },
        units: { orderBy: [{ sortOrder: "asc" }, { number: "asc" }], where: { status: { not: "INACTIVE" } } },
      },
    });

    const results = await Promise.all(
      categories.map(async (c) => {
        const unitStates = await getCategoryUnitAvailability(db, c.id, checkIn, checkOut);
        const activeUnits = unitStates.filter((u) => u.unit.status !== "INACTIVE");
        const freeCount = activeUnits.filter((u) => u.available).length;
        const fitsGuests =
          c.maxOccupancy >= adults + children &&
          c.maxAdults >= adults &&
          c.maxChildren >= children;
        return {
          id: c.id,
          slug: c.slug,
          name: c.name,
          tagline: c.tagline,
          description: c.description,
          pricePerNight: c.basePrice,
          currency: c.currency || settings.currency,
          maxOccupancy: c.maxOccupancy,
          maxAdults: c.maxAdults,
          maxChildren: c.maxChildren,
          bedConfiguration: c.bedConfiguration,
          sizeSqm: c.sizeSqm,
          viewNote: c.viewNote,
          images: c.images.map((i) => ({ url: i.url, alt: i.alt })),
          amenities: c.amenities
            .filter((a) => a.amenity.active)
            .map((a) => ({ id: a.amenity.id, name: a.amenity.name, icon: a.amenity.icon })),
          totalUnits: activeUnits.length,
          availableUnits: freeCount,
          available: freeCount > 0 && fitsGuests,
          fitsGuests,
        };
      })
    );

    let unitDetail: unknown = undefined;
    if (categoryId) {
      const c = categories.find((x) => x.id === categoryId);
      if (c) {
        const states = await getCategoryUnitAvailability(db, c.id, checkIn, checkOut);
        unitDetail = {
          category: { id: c.id, name: c.name, pricePerNight: c.basePrice, currency: c.currency || settings.currency },
          units: states.map((s) => ({
            id: s.unit.id,
            name: s.unit.name,
            number: s.unit.number,
            available: s.available,
            reason: s.reason,
            pricePerNight: s.unit.price ?? c.basePrice,
            maxOccupancy: s.unit.maxOccupancy ?? c.maxOccupancy,
          })),
        };
      }
    }

    return NextResponse.json({
      checkIn: checkInKey,
      checkOut: checkOutKey,
      nights,
      maxCheckIn: addDays(today, 365).toISOString().slice(0, 10),
      currency: settings.currency,
      categories: results,
      unitDetail,
    });
  } catch (error) {
    return handleUnknownError(error, "availability");
  }
}

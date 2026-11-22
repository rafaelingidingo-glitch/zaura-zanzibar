// Concurrency-safe availability engine.
// All overlap checks use half-open intervals [checkIn, checkOut):
// a new check-in on the same date as an existing check-out is allowed.

import { db } from "./db";
import type { Prisma } from "@prisma/client";
import { ACTIVE_BOOKING_STATUSES } from "./constants";

type Tx = Prisma.TransactionClient | typeof db;

/** Expire pending requests whose hold has elapsed. Returns the number expired. */
export async function expireStalePendings(tx: Tx = db): Promise<number> {
  const res = await tx.booking.updateMany({
    where: { status: "PENDING", holdExpiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
  return res.count;
}

/** Unit IDs unavailable for [checkIn, checkOut) due to active bookings. */
export async function getBookedUnitIds(
  tx: Tx,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<string[]> {
  const statuses: string[] = [...ACTIVE_BOOKING_STATUSES];
  const rows = await tx.booking.findMany({
    where: {
      unitId: { not: null },
      status: { in: statuses as ("PENDING" | "CONFIRMED" | "CHECKED_IN")[] },
      // PENDING rows only block inventory while their hold is still valid;
      // stale pendings are expired by expireStalePendings() beforehand.
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: { unitId: true },
  });
  return rows.map((r) => r.unitId!).filter(Boolean);
}

export type UnitAvailability = {
  unit: { id: string; name: string; number: string; status: string; price: number | null; maxOccupancy: number | null };
  available: boolean;
  reason: "BOOKED" | "MAINTENANCE" | "INACTIVE" | null;
};

/** Per-unit availability states for one category over [checkIn, checkOut). */
export async function getCategoryUnitAvailability(
  tx: Tx,
  categoryId: string,
  checkIn: Date,
  checkOut: Date
): Promise<UnitAvailability[]> {
  const units = await tx.unit.findMany({
    where: { categoryId },
    orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  const bookedIds = new Set(await getBookedUnitIds(tx, checkIn, checkOut));
  return units.map((u) => {
    let available = true;
    let reason: UnitAvailability["reason"] = null;
    if (bookedIds.has(u.id)) {
      available = false;
      reason = "BOOKED";
    } else if (u.status === "MAINTENANCE") {
      available = false;
      reason = "MAINTENANCE";
    } else if (u.status !== "ACTIVE") {
      available = false;
      reason = "INACTIVE";
    }
    return {
      unit: {
        id: u.id,
        name: u.name,
        number: u.number,
        status: u.status,
        price: u.priceOverride,
        maxOccupancy: u.maxOccupancyOverride,
      },
      available,
      reason,
    };
  });
}

/** Auto-select a free, active unit for a category over [checkIn, checkOut). */
export async function pickAvailableUnit(
  tx: Tx,
  categoryId: string,
  checkIn: Date,
  checkOut: Date
): Promise<string | null> {
  const avail = await getCategoryUnitAvailability(tx, categoryId, checkIn, checkOut);
  const free = avail.find((u) => u.available);
  return free ? free.unit.id : null;
}

/** Is one specific unit free for [checkIn, checkOut)? */
export async function isUnitFree(
  tx: Tx,
  unitId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const unit = await tx.unit.findUnique({ where: { id: unitId } });
  if (!unit || unit.status !== "ACTIVE") return false;
  const bookedIds = new Set(await getBookedUnitIds(tx, checkIn, checkOut, excludeBookingId));
  return !bookedIds.has(unitId);
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError, jsonError } from "@/lib/api";
import { unitInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/units/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = unitInputSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message || "Invalid unit data.");
    const data = parsed.data;

    const existing = await db.unit.findUnique({ where: { id } });
    if (!existing) return jsonError(404, "Unit not found.");

    const duplicate = await db.unit.findUnique({
      where: { categoryId_number: { categoryId: data.categoryId, number: data.number } },
    });
    if (duplicate && duplicate.id !== id) {
      return jsonError(409, `An apartment with number ${data.number} already exists in this category.`);
    }

    const unit = await db.unit.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
        name: data.name,
        number: data.number,
        description: data.description || null,
        priceOverride: data.priceOverride ?? null,
        maxOccupancyOverride: data.maxOccupancyOverride ?? null,
        status: data.status,
        maintenanceNote: data.maintenanceNote || null,
        sortOrder: data.sortOrder,
        images: {
          deleteMany: {},
          create: (data.images || []).map((img, i) => ({ url: img.url, alt: img.alt, sortOrder: i })),
        },
      },
      include: { category: { select: { id: true, name: true } }, images: true },
    });
    return NextResponse.json({ unit });
  } catch (error) {
    return handleUnknownError(error, "admin:units:update");
  }
}

/** DELETE /api/admin/units/[id] — blocked when bookings reference the unit. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const bookingCount = await db.booking.count({ where: { unitId: id } });
    if (bookingCount > 0) {
      return jsonError(409, "This apartment has reservation history. Set it to INACTIVE instead of deleting.");
    }
    await db.unit.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleUnknownError(error, "admin:units:delete");
  }
}

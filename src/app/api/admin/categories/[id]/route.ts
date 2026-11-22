import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError, jsonError } from "@/lib/api";
import { categoryInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/categories/[id] — update category. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = categoryInputSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message || "Invalid category data.");
    const data = parsed.data;

    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) return jsonError(404, "Category not found.");

    const category = await db.category.update({
      where: { id },
      data: {
        name: data.name,
        tagline: data.tagline || null,
        description: data.description,
        basePrice: data.basePrice,
        currency: data.currency,
        maxOccupancy: data.maxOccupancy,
        maxAdults: data.maxAdults,
        maxChildren: data.maxChildren,
        bedConfiguration: data.bedConfiguration,
        sizeSqm: data.sizeSqm || null,
        viewNote: data.viewNote || null,
        sortOrder: data.sortOrder,
        active: data.active,
        // Replace image set
        images: {
          deleteMany: {},
          create: (data.images || []).map((img, i) => ({ url: img.url, alt: img.alt, sortOrder: i })),
        },
        // Replace amenity set
        amenities: {
          deleteMany: {},
          create: (data.amenityIds || []).map((amenityId) => ({ amenityId })),
        },
      },
      include: { images: true, amenities: true, units: true },
    });
    return NextResponse.json({ category });
  } catch (error) {
    return handleUnknownError(error, "admin:categories:update");
  }
}

/** DELETE /api/admin/categories/[id] — remove a category (blocked when bookings exist). */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const bookingCount = await db.booking.count({ where: { categoryId: id } });
    if (bookingCount > 0) {
      return jsonError(409, "This category has reservations in history. Deactivate it instead of deleting.");
    }
    await db.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleUnknownError(error, "admin:categories:delete");
  }
}

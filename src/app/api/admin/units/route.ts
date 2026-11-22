import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError, jsonError } from "@/lib/api";
import { unitInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

/** GET /api/admin/units */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const units = await db.unit.findMany({
      orderBy: [{ number: "asc" }],
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: "asc" } },
      },
    });
    return NextResponse.json({ units });
  } catch (error) {
    return handleUnknownError(error, "admin:units");
  }
}

/** POST /api/admin/units — create an individual apartment unit. */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json().catch(() => null);
    const parsed = unitInputSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message || "Invalid unit data.");
    const data = parsed.data;

    const category = await db.category.findUnique({ where: { id: data.categoryId } });
    if (!category) return jsonError(400, "Category not found.");

    const duplicate = await db.unit.findUnique({
      where: { categoryId_number: { categoryId: data.categoryId, number: data.number } },
    });
    if (duplicate) return jsonError(409, `An apartment with number ${data.number} already exists in this category.`);

    const unit = await db.unit.create({
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
        images: { create: (data.images || []).map((img, i) => ({ url: img.url, alt: img.alt, sortOrder: i })) },
      },
      include: { category: { select: { id: true, name: true } }, images: true },
    });
    return NextResponse.json({ unit }, { status: 201 });
  } catch (error) {
    return handleUnknownError(error, "admin:units:create");
  }
}

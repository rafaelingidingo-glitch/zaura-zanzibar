import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError, jsonError } from "@/lib/api";
import { amenityInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

/** GET /api/admin/amenities */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const amenities = await db.amenity.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { categories: { select: { categoryId: true } } },
    });
    return NextResponse.json({
      amenities: amenities.map((a) => ({
        ...a,
        categoryIds: a.categories.map((c) => c.categoryId),
        categories: undefined,
      })),
    });
  } catch (error) {
    return handleUnknownError(error, "admin:amenities");
  }
}

/** POST /api/admin/amenities */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json().catch(() => null);
    const parsed = amenityInputSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message || "Invalid amenity data.");
    const amenity = await db.amenity.create({ data: parsed.data });
    return NextResponse.json({ amenity }, { status: 201 });
  } catch (error) {
    return handleUnknownError(error, "admin:amenities:create");
  }
}

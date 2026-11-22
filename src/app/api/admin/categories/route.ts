import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError, jsonError } from "@/lib/api";
import { categoryInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

/** GET /api/admin/categories — full list incl. inactive, with units. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const categories = await db.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        amenities: { include: { amenity: true } },
        units: { orderBy: [{ sortOrder: "asc" }, { number: "asc" }], include: { images: { orderBy: { sortOrder: "asc" } } } },
      },
    });
    return NextResponse.json({ categories });
  } catch (error) {
    return handleUnknownError(error, "admin:categories");
  }
}

/** POST /api/admin/categories — create a new accommodation category. */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json().catch(() => null);
    const parsed = categoryInputSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message || "Invalid category data.");
    const data = parsed.data;

    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const exists = await db.category.findUnique({ where: { slug } });
    if (exists) return jsonError(409, "A category with this slug already exists.");

    const category = await db.category.create({
      data: {
        slug,
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
        images: { create: (data.images || []).map((img, i) => ({ url: img.url, alt: img.alt, sortOrder: i })) },
        amenities: {
          create: (data.amenityIds || []).map((amenityId) => ({ amenityId })),
        },
      },
      include: { images: true, amenities: true, units: true },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return handleUnknownError(error, "admin:categories:create");
  }
}

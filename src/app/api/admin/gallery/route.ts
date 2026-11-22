import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError, jsonError } from "@/lib/api";
import { galleryInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

/** GET /api/admin/gallery */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const images = await db.galleryImage.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ images });
  } catch (error) {
    return handleUnknownError(error, "admin:gallery");
  }
}

/** POST /api/admin/gallery */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json().catch(() => null);
    const parsed = galleryInputSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message || "Invalid image data.");
    const image = await db.galleryImage.create({ data: parsed.data });
    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    return handleUnknownError(error, "admin:gallery:create");
  }
}

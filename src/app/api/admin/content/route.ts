import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError, jsonError } from "@/lib/api";
import { contentBlockInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

/** GET /api/admin/content — editable content blocks. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const blocks = await db.contentBlock.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ blocks });
  } catch (error) {
    return handleUnknownError(error, "admin:content");
  }
}

/** POST /api/admin/content — create a content block (e.g. new experience section). */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json().catch(() => null);
    const parsed = contentBlockInputSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message || "Invalid content data.");
    const exists = await db.contentBlock.findUnique({ where: { key: parsed.data.key } });
    if (exists) return jsonError(409, "A content block with this key already exists.");
    const block = await db.contentBlock.create({ data: parsed.data });
    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    return handleUnknownError(error, "admin:content:create");
  }
}

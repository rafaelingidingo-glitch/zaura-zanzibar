import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError, jsonError } from "@/lib/api";
import { contentBlockInputSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/content/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = contentBlockInputSchema.partial().safeParse(body);
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message || "Invalid content data.");
    const block = await db.contentBlock.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ block });
  } catch (error) {
    return handleUnknownError(error, "admin:content:update");
  }
}

/** DELETE /api/admin/content/[id] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    await db.contentBlock.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleUnknownError(error, "admin:content:delete");
  }
}

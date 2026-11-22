import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/guests/[id] — internal guest notes. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const notes = typeof body?.notes === "string" ? body.notes.slice(0, 2000) : "";
    const guest = await db.guest.update({ where: { id }, data: { notes } });
    return NextResponse.json({ guest: { id: guest.id, notes: guest.notes } });
  } catch (error) {
    return jsonError(404, "Guest not found.");
  }
}

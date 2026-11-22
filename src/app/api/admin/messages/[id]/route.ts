import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/messages/[id] — mark inquiry handled / unhandled. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const handled = Boolean(body?.handled);
    const message = await db.contactMessage.update({ where: { id }, data: { handled } });
    return NextResponse.json({ message: { id: message.id, handled: message.handled } });
  } catch (error) {
    return jsonError(404, "Message not found.");
  }
}

/** DELETE /api/admin/messages/[id] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    await db.contactMessage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(404, "Message not found.");
  }
}

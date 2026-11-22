import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/admin/notifications — latest alerts + unread count. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const [notifications, unreadCount, pendingCount] = await Promise.all([
      db.adminNotification.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      db.adminNotification.count({ where: { read: false } }),
      db.booking.count({ where: { status: "PENDING" } }),
    ]);
    return NextResponse.json({ notifications, unreadCount, pendingCount });
  } catch (error) {
    return handleUnknownError(error, "admin:notifications");
  }
}

/** PATCH /api/admin/notifications — mark read. */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.all) {
      await db.adminNotification.updateMany({ data: { read: true } });
    } else if (Array.isArray(body.ids) && body.ids.length) {
      await db.adminNotification.updateMany({ where: { id: { in: body.ids } }, data: { read: true } });
    } else {
      return jsonError(400, "Provide notification ids or all=true.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleUnknownError(error, "admin:notifications:update");
  }
}

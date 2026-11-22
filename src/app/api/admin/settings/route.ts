import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleUnknownError, jsonError } from "@/lib/api";
import { getSettings, saveSettings } from "@/lib/settings";
import { settingsInputSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** GET /api/admin/settings */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return handleUnknownError(error, "admin:settings");
  }
}

/** PUT /api/admin/settings */
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json().catch(() => null);
    const parsed = settingsInputSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message || "Invalid settings.");
    await saveSettings(parsed.data as unknown as Record<string, string>);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleUnknownError(error, "admin:settings:update");
  }
}

/** PATCH /api/admin/settings — change admin password. */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json().catch(() => null);
    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");
    if (newPassword.length < 8) return jsonError(400, "New password must be at least 8 characters.");
    const admin = await db.adminUser.findUnique({ where: { id: auth.session.sub } });
    if (!admin) return jsonError(404, "Admin not found.");
    const ok = await verifyPassword(currentPassword, admin.passwordHash);
    if (!ok) return jsonError(401, "Current password is incorrect.");
    await db.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleUnknownError(error, "admin:settings:password");
  }
}

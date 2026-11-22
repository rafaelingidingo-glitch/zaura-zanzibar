import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validators";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { jsonError, handleUnknownError, guardRate } from "@/lib/api";

export const dynamic = "force-dynamic";

/** POST /api/admin/auth/login */
export async function POST(req: NextRequest) {
  const limited = guardRate(req, "login", 8, 10 * 60_000);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "Invalid credentials format.");

    const { email, password } = parsed.data;
    const admin = await db.adminUser.findUnique({ where: { email: email.toLowerCase() } });
    // Constant-ish work for both branches so unknown emails are not
    // distinguishable from wrong passwords by response timing.
    const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO7ZBkU3gHcPZofJkZZZprTmUuE8mF3Xu";
    const ok = await verifyPassword(password, admin ? admin.passwordHash : DUMMY_HASH);
    if (!admin || !ok) return jsonError(401, "Incorrect email or password.");

    await setSessionCookie({ sub: admin.id, email: admin.email, name: admin.name });
    return NextResponse.json({ user: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (error) {
    return handleUnknownError(error, "admin:login");
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/admin/messages — contact form inquiries. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const messages = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return NextResponse.json({ messages });
  } catch (error) {
    return handleUnknownError(error, "admin:messages");
  }
}

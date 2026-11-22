import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contactSchema } from "@/lib/validators";
import { jsonError, handleUnknownError, guardRate } from "@/lib/api";

export const dynamic = "force-dynamic";

/** POST /api/contact — public contact form. */
export async function POST(req: NextRequest) {
  const limited = guardRate(req, "contact", 5, 60 * 60_000);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => null);
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, parsed.error.issues[0]?.message || "Invalid message.");
    }
    const data = parsed.data;
    const msg = await db.contactMessage.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        message: data.message,
      },
    });
    await db.adminNotification.create({
      data: {
        type: "CONTACT_MESSAGE",
        title: `New inquiry from ${data.name}`,
        body: data.message.slice(0, 140),
      },
    });
    return NextResponse.json({ ok: true, id: msg.id }, { status: 201 });
  } catch (error) {
    return handleUnknownError(error, "contact");
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/images/[id] — serve uploaded images stored in Postgres. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const image = await db.uploadedImage.findUnique({ where: { id } });
  if (!image) return new NextResponse("Not found", { status: 404 });
  const body = Buffer.from(image.data);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": image.mimeType,
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

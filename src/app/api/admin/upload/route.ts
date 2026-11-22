import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleUnknownError, jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 4 * 1024 * 1024; // 4MB

/**
 * POST /api/admin/upload — secure image upload.
 * Images are stored in Postgres and served via /api/images/[id],
 * which works on both local development and serverless (Vercel) deployments.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  try {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || !(file instanceof File)) return jsonError(400, "No file provided.");
    if (!ALLOWED_TYPES.includes(file.type)) {
      return jsonError(400, "Only JPEG, PNG or WebP images are allowed.");
    }
    if (file.size > MAX_SIZE) return jsonError(400, "Image must be smaller than 4MB.");

    const buffer = Buffer.from(await file.arrayBuffer());
    const image = await db.uploadedImage.create({
      data: { mimeType: file.type, sizeBytes: buffer.length, data: buffer },
    });
    return NextResponse.json({ url: `/api/images/${image.id}`, id: image.id }, { status: 201 });
  } catch (error) {
    return handleUnknownError(error, "admin:upload");
  }
}

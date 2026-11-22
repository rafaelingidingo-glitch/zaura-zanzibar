/**
 * Brand asset processing: favicon from logo, OG image composite.
 * Run: bun scripts/process-brand.ts
 */
import sharp from "sharp";
import fs from "fs";

const LOGO = "/home/z/my-project/upload/logo zaura.jpg";
const OUT_DIR = "/home/z/my-project/public/brand";
const ICON_PATH = "/home/z/my-project/src/app/icon.png";
const HERO = "/home/z/my-project/public/images/hero-1.png";

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Logo: clean 512px version for general use
  await sharp(LOGO).resize(512, 512, { fit: "cover" }).png().toFile(`${OUT_DIR}/logo.png`);

  // Favicon: 128px (Next.js picks up src/app/icon.png automatically)
  await sharp(LOGO).resize(128, 128, { fit: "cover" }).png().toFile(ICON_PATH);

  // OG image: hero photo + charcoal overlay + centered logo
  const logoBuffer = await sharp(LOGO).resize(300, 300, { fit: "cover" }).toBuffer();
  const overlay = Buffer.from(
    `<svg width="1440" height="720"><rect width="1440" height="720" fill="#242522" opacity="0.62"/></svg>`
  );
  await sharp(HERO)
    .resize(1440, 720, { fit: "cover" })
    .composite([
      { input: overlay, top: 0, left: 0 },
      { input: logoBuffer, top: 210, left: 570 },
    ])
    .png()
    .toFile(`${OUT_DIR}/og-image.png`);

  console.log("Brand assets processed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import sharp from "sharp";
import { mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");
const inputImage = process.argv[2];

if (!inputImage) {
  console.error("Usage: node scripts/generate-icons.mjs <path-to-image>");
  process.exit(1);
}

const sizes = [
  { name: "icon-512x512.png", size: 512 },
  { name: "icon-192x192.png", size: 192 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "favicon-16x16.png", size: 16 },
];

// Maskable icons need padding (safe zone is inner 80%)
const maskableSizes = [
  { name: "icon-maskable-512x512.png", size: 512 },
  { name: "icon-maskable-192x192.png", size: 192 },
];

async function generateIcons() {
  console.log(`Processing: ${inputImage}`);

  for (const { name, size } of sizes) {
    const output = resolve(publicDir, name);
    await sharp(inputImage)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(output);
    console.log(`  Created: ${name} (${size}x${size})`);
  }

  for (const { name, size } of maskableSizes) {
    const output = resolve(publicDir, name);
    const padding = Math.round(size * 0.1);
    const innerSize = size - padding * 2;

    const resized = await sharp(inputImage)
      .resize(innerSize, innerSize, { fit: "cover" })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 232, g: 67, b: 147, alpha: 1 },
      },
    })
      .composite([{ input: resized, left: padding, top: padding }])
      .png()
      .toFile(output);

    console.log(`  Created: ${name} (${size}x${size}, maskable with padding)`);
  }

  console.log("\nAll icons generated successfully!");
}

generateIcons().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});

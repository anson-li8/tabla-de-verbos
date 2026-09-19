// generates PWA icon PNGs (192/512 + maskable variants) from
// public/icon.svg into public/icons/ — run once, committed output
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

async function main() {
  await mkdir("public/icons", { recursive: true });
  const svg = "public/icon.svg";

  for (const size of [192, 512]) {
    // regular icon — exact svg art
    await sharp(svg, { density: 400 })
      .resize(size, size)
      .png()
      .toFile(`public/icons/icon-${size}.png`);

    // maskable — the svg already fills its rounded square; pad to
    // keep the safe zone (inner 80%) inside a flat brick background
    const pad = Math.round(size * 0.1);
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 176, g: 61, b: 44, alpha: 1 },
      },
    })
      .composite([
        {
          input: await sharp(svg, { density: 400 })
            .resize(size - pad * 2, size - pad * 2)
            .png()
            .toBuffer(),
          left: pad,
          top: pad,
        },
      ])
      .png()
      .toFile(`public/icons/icon-maskable-${size}.png`);
  }
  console.log("icons written to public/icons/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

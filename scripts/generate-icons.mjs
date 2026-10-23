import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "src/lib/assets/wishlist-logo.png");
const output = (name) => resolve(root, "static", name);
const png = (size) => sharp(source).resize(size, size).png().toBuffer();

for (const [name, size] of [
    ["favicon-16x16.png", 16],
    ["favicon-32x32.png", 32],
    ["apple-touch-icon.png", 180],
    ["android-chrome-192x192.png", 192],
    ["android-chrome-512x512.png", 512],
    ["mstile-150x150.png", 150]
]) {
    await writeFile(output(name), await png(size));
}

// Keep the list and star inside the central safe circle when launchers crop the icon.
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#4b087d" } })
    .composite([{ input: await png(416), gravity: "centre" }])
    .png()
    .toFile(output("android-chrome-maskable-512x512.png"));

// ICO supports PNG frames; include native sizes for tabs and desktop shortcuts.
const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6 + 16 * frames.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
for (const [index, frame] of frames.entries()) {
    const entry = 6 + index * 16;
    header[entry] = sizes[index];
    header[entry + 1] = sizes[index];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(frame.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
}
await writeFile(output("favicon.ico"), Buffer.concat([header, ...frames]));
console.log("Generated favicon, touch, PWA and Windows icons from wishlist-logo.png.");

import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "src/lib/assets/wishlist-logo.png");
const output = (name) => resolve(root, "static", name);
const background = "#f3ebf3";
const mark = await sharp(source).trim().png().toBuffer();
const { width, height } = await sharp(mark).metadata();

async function png(size, { opaque = false, maskable = false } = {}) {
    // Fit the whole bounding rectangle inside the W3C safe circle (radius 40%),
    // with a little breathing room. A fixed 80% square can lose its corners.
    // https://www.w3.org/TR/appmanifest/#icon-masks
    const scale = maskable ? (size * 0.76) / Math.hypot(width, height) : (size * 0.9) / Math.max(width, height);
    const foreground = await sharp(mark)
        .resize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)))
        .png()
        .toBuffer();
    return sharp({
        create: { width: size, height: size, channels: 4, background: opaque ? background : "#00000000" }
    })
        .composite([{ input: foreground, gravity: "centre" }])
        .png()
        .toBuffer();
}

for (const [name, size] of [
    ["favicon-16x16.png", 16],
    ["favicon-32x32.png", 32],
    ["android-chrome-192x192.png", 192],
    ["android-chrome-512x512.png", 512],
    ["mstile-150x150.png", 150]
]) {
    await writeFile(output(name), await png(size));
}

// iOS and adaptive Android launchers get an explicit opaque background.
await writeFile(output("apple-touch-icon.png"), await png(180, { opaque: true }));
await writeFile(output("android-chrome-maskable-512x512.png"), await png(512, { opaque: true, maskable: true }));

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

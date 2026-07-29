import sharp from "sharp";

const map = await sharp("public/landing/earth-print-map.png").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const pencil = await sharp("public/landing/print-pencil.png").ensureAlpha().resize({ width: 520 }).raw().toBuffer({ resolveWithObject: true });

const size = 720;
const out = Buffer.alloc(size * size * 4);
const R = size * 0.38;
const cx = size * 0.52;
const cy = size * 0.55;
const rot = 0.55;
const cosR = Math.cos(rot);
const sinR = Math.sin(rot);
const mapW = map.info.width;
const mapH = map.info.height;
const md = map.data;

function sample(lon, lat) {
  let u = (lon / (Math.PI * 2) + 0.5) * mapW;
  let v = (0.5 - lat / Math.PI) * mapH;
  u = ((u % mapW) + mapW) % mapW;
  v = Math.max(0, Math.min(mapH - 1.0001, v));
  const i = ((v | 0) * mapW + (u | 0)) * 4;
  return [md[i], md[i + 1], md[i + 2]];
}

for (let py = 0; py < size; py++) {
  for (let px = 0; px < size; px++) {
    const i = (py * size + px) * 4;
    out[i] = 0;
    out[i + 1] = 0;
    out[i + 2] = 0;
    out[i + 3] = 255;
    const dx = px + 0.5 - cx;
    const dy = py + 0.5 - cy;
    if (dx * dx + dy * dy > R * R) continue;
    const x = dx / R;
    const y = dy / R;
    const rr = x * x + y * y;
    let r = 0xe6,
      g = 0xdf,
      b = 0xd2;
    if (rr <= 1) {
      const z = Math.sqrt(1 - rr);
      const xr = x * cosR + z * sinR;
      const zr = -x * sinR + z * cosR;
      const lon = Math.atan2(xr, zr);
      const lat = Math.asin(Math.max(-1, Math.min(1, -y)));
      [r, g, b] = sample(lon, lat);
    }
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = 255;
  }
}

// draw pencil (simple nearest blit with rotation approx via affine)
const ang = (-32 * Math.PI) / 180;
const cosA = Math.cos(ang);
const sinA = Math.sin(ang);
const pw = pencil.info.width;
const ph = pencil.info.height;
const pox = cx + R * 0.05;
const poy = cy - R * 0.72;
const pd = pencil.data;

for (let py = 0; py < ph; py++) {
  for (let px = 0; px < pw; px++) {
    const pi = (py * pw + px) * 4;
    const a = pd[pi + 3];
    if (a < 8) continue;
    const lx = px - pw * 0.45;
    const ly = py - ph * 0.5;
    const wx = pox + lx * cosA - ly * sinA;
    const wy = poy + lx * sinA + ly * cosA;
    const x = wx | 0;
    const y = wy | 0;
    if (x < 0 || y < 0 || x >= size || y >= size) continue;
    const oi = (y * size + x) * 4;
    const alpha = a / 255;
    out[oi] = pd[pi] * alpha + out[oi] * (1 - alpha);
    out[oi + 1] = pd[pi + 1] * alpha + out[oi + 1] * (1 - alpha);
    out[oi + 2] = pd[pi + 2] * alpha + out[oi + 2] * (1 - alpha);
    out[oi + 3] = 255;
  }
}

await sharp(out, { raw: { width: size, height: size, channels: 4 } })
  .png()
  .toFile("public/landing/earth-print-preview.png");
console.log("wrote preview");

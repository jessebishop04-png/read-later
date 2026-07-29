import { feature } from "topojson-client";
import { readFileSync } from "fs";
import sharp from "sharp";

const topo = JSON.parse(readFileSync("scripts/land-110m.json", "utf8"));
const land = feature(topo, topo.objects.land);
const w = 2048;
const h = 1024;

function project(lon, lat) {
  return [((lon + 180) / 360) * w, ((90 - lat) / 180) * h];
}

function ringToPath(ring) {
  return (
    ring
      .map((p, i) => {
        const [x, y] = project(p[0], p[1]);
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + " Z"
  );
}

function geomToPaths(g) {
  if (!g) return "";
  if (g.type === "Polygon") return g.coordinates.map(ringToPath).join(" ");
  if (g.type === "MultiPolygon") {
    return g.coordinates.map((poly) => poly.map(ringToPath).join(" ")).join(" ");
  }
  return "";
}

let d = "";
if (land.type === "Feature") d += geomToPaths(land.geometry);
else if (land.type === "FeatureCollection") {
  for (const f of land.features) d += geomToPaths(f.geometry) + " ";
} else d += geomToPaths(land);

let grid = "";
for (let lat = -75; lat <= 75; lat += 15) {
  const y = ((90 - lat) / 180) * h;
  grid += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#0c0c0c" stroke-width="1.6"/>`;
}
for (let lon = -180; lon < 180; lon += 15) {
  const x = ((lon + 180) / 360) * w;
  grid += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="#0c0c0c" stroke-width="1.6"/>`;
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#e6dfd2"/>
  <path d="${d}" fill="#0c0c0c"/>
  ${grid}
</svg>`;

await sharp(Buffer.from(svg)).png().toFile("public/landing/earth-print-map.png");
console.log("wrote public/landing/earth-print-map.png");

/* Print-style pencil on transparent PNG */
const pencilSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="880" height="200" viewBox="0 0 880 200">
  <g stroke="#0c0c0c" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round">
    <path d="M110 48 H640 L670 100 L640 152 H110 L88 100 Z" fill="#e6dfd2"/>
    <rect x="640" y="48" width="78" height="104" fill="#e6dfd2"/>
    <line x1="658" y1="48" x2="658" y2="152"/>
    <line x1="678" y1="48" x2="678" y2="152"/>
    <line x1="698" y1="48" x2="698" y2="152"/>
    <path d="M718 54 H790 C820 54 836 72 836 100 C836 128 820 146 790 146 H718 Z" fill="#e6dfd2"/>
    <path d="M110 48 L28 100 L110 152 Z" fill="#e6dfd2"/>
    <path d="M58 78 L8 100 L58 122 Z" fill="#0c0c0c" stroke="none"/>
    <line x1="128" y1="100" x2="620" y2="100" stroke-width="2" opacity="0.55"/>
  </g>
</svg>`;

await sharp(Buffer.from(pencilSvg)).png().toFile("public/landing/print-pencil.png");
console.log("wrote public/landing/print-pencil.png");

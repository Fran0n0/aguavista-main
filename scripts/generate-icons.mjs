/**
 * generate-icons.mjs — Genera el set completo de favicons y la OG image
 * a partir del monograma SVG de AguaVista.
 *
 * Salidas en /public:
 *   icon.svg          vectorial, el que usan los navegadores modernos
 *   favicon.ico       32px, fallback para navegadores viejos
 *   icon-192.png      Android / manifest
 *   icon-512.png      Android / splash del manifest
 *   apple-icon.png    180px, iOS "Agregar a inicio" (ignora el manifest)
 *   og/aguavista-og.jpg  1200x630 para WhatsApp, Facebook, LinkedIn, X
 *
 * Uso:  node scripts/generate-icons.mjs
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");

const BASE = "#0A1A14";
const VIVO = "#A3D45B";
const LUX = "#C9A962";
const LUX_LIGHT = "#E8D5A3";
const INK = "#F0F4EF";

/* El monograma: círculo de contención + onda de agua + techo/montaña.
   Con fondo sólido porque un favicon transparente desaparece sobre las
   pestañas claras de algunos navegadores. */
const monogram = ({ size = 512, rounded = true } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="${rounded ? 22 : 0}" fill="${BASE}"/>
  <circle cx="50" cy="50" r="38" fill="none" stroke="${LUX}" stroke-width="2.5" opacity="0.75"/>
  <path d="M30 58c7-8 13-8 20 0s13 8 20 0" fill="none" stroke="${VIVO}"
        stroke-width="6.5" stroke-linecap="round"/>
  <path d="M35 43l15-12 15 12" fill="none" stroke="${LUX_LIGHT}"
        stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* OG image 1200x630. Se compone el monograma sobre un fondo con la
   fotografía aérea oscurecida, más el wordmark en texto SVG. */
const ogOverlay = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${BASE}" stop-opacity="0.62"/>
      <stop offset="55%"  stop-color="${BASE}" stop-opacity="0.80"/>
      <stop offset="100%" stop-color="${BASE}" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#veil)"/>

  <g transform="translate(88, 168)">
    <circle cx="34" cy="34" r="30" fill="none" stroke="${LUX}" stroke-width="2.4" opacity="0.8"/>
    <path d="M15 40c5.5-6 10-6 15.5 0s10 6 15.5 0" fill="none" stroke="${VIVO}"
          stroke-width="5" stroke-linecap="round"/>
    <path d="M19 28l11.5-9 11.5 9" fill="none" stroke="${LUX_LIGHT}"
          stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <text x="88" y="322" fill="${INK}" font-family="Georgia, 'Times New Roman', serif"
        font-size="86" font-weight="300" letter-spacing="14">AGUAVISTA</text>

  <text x="90" y="380" fill="${VIVO}" font-family="Helvetica, Arial, sans-serif"
        font-size="21" font-weight="500" letter-spacing="5.5">
    CONDOMINIO PRIVADO SOBRE EL RIO PARANA
  </text>

  <rect x="90" y="416" width="86" height="2" fill="${LUX}" opacity="0.85"/>

  <text x="90" y="474" fill="${INK}" fill-opacity="0.72"
        font-family="Helvetica, Arial, sans-serif" font-size="24" font-weight="300">
    Golf · Nautica · Aeropuerto ejecutivo · Lotes desde 800 m2
  </text>
</svg>`;

async function main() {
  await fs.mkdir(path.join(PUBLIC, "og"), { recursive: true });

  // ── Favicon vectorial ──
  await fs.writeFile(path.join(PUBLIC, "icon.svg"), monogram({ rounded: false }).trim());

  // ── PNGs ──
  const png = (size, rounded) =>
    sharp(Buffer.from(monogram({ size, rounded }))).png({ compressionLevel: 9 });

  await png(192, true).toFile(path.join(PUBLIC, "icon-192.png"));
  await png(512, true).toFile(path.join(PUBLIC, "icon-512.png"));
  // iOS recorta la esquina él mismo: se entrega cuadrado, sin redondear.
  await png(180, false).toFile(path.join(PUBLIC, "apple-icon.png"));

  // ── favicon.ico ── (PNG dentro de contenedor .ico, soportado desde IE11)
  await png(32, false).toFile(path.join(PUBLIC, "favicon.png"));
  await fs.rename(path.join(PUBLIC, "favicon.png"), path.join(PUBLIC, "favicon.ico"));

  // ── Open Graph ──
  const bg = path.join(PUBLIC, "banner-poster.webp");
  await sharp(await fs.readFile(bg))
    .resize(1200, 630, { fit: "cover", position: "attention" })
    .composite([{ input: Buffer.from(ogOverlay), top: 0, left: 0 }])
    // JPEG y no WebP: WhatsApp e iMessage todavía no previsualizan WebP.
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(PUBLIC, "og", "aguavista-og.jpg"));

  console.log("Iconos y OG image generados en /public");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * optimize-media.mjs — Compresión de /public con backup e idempotencia.
 *
 * Diseño clave: el ORIGEN de verdad siempre es ../media-originales/.
 * En la primera corrida se copia /public ahí; en las siguientes se
 * re-encodea desde el backup, nunca encima de un archivo ya comprimido.
 * Eso permite reajustar CRF, anchos o recortes y volver a correr sin
 * degradar la calidad de forma acumulativa.
 *
 * Imágenes: se mantiene nombre y extensión para no romper referencias.
 *           next/image se encarga de negociar AVIF/WebP por request.
 * Videos:   micro-loops H.264 + faststart, sin audio, con poster .webp.
 *
 * Uso:
 *   npm run optimize:media              # todo, con los recortes de VIDEO_PROFILES
 *   npm run optimize:media -- --images  # solo imágenes
 *   npm run optimize:media -- --videos  # solo videos
 *   npm run optimize:media -- --full    # ignora los recortes (metraje completo)
 *   npm run optimize:media -- --dry     # no escribe nada
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const BACKUP = path.join(ROOT, "..", "media-originales");

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const ONLY_IMAGES = args.includes("--images");
const ONLY_VIDEOS = args.includes("--videos");
/** Desactiva los recortes: re-encodea el metraje completo. */
const FULL = args.includes("--full");

/* ── Perfiles de imagen ────────────────────────────────────────── */

const IMAGE_MAX_WIDTH = 2560;
/* Las panorámicas equirectangulares del visor 360 reparten su ancho
   entre los 360° de la escena: a 2560px se ven pixeladas. */
const IMAGE_WIDTH_OVERRIDES = { "exterior.jpg": 4096 };

/* ── Perfiles de video ─────────────────────────────────────────────
   Micro-loops estilo Porsche: nadie mira un minuto fijo de metraje de
   fondo. Cada video se recorta a una ventana corta y representativa.

     start     segundo de entrada (saltea fades y arranques muertos)
     duration  duración del recorte ANTES del crossfade
     seamless  cruza la cola con la cabeza para que el loop no tenga
               salto visible; descuenta CROSSFADE_S de la duración final
     maxDim    lado mayor del cuadro de salida
     crf       calidad (más alto = más compresión)

   El hero vive detrás de un velo negro al 55% + gradiente radial: nadie
   percibe la diferencia entre 1080p y 720p, pero pesa la mitad. Los
   reels son verticales en una columna angosta, con 720px de ancho sobra. */

const CROSSFADE_S = 0.7;

const VIDEO_DEFAULT = { start: 1, duration: 10, seamless: true, maxDim: 720, crf: 30, fps: 24 };

const VIDEO_PROFILES = {
  // Hero: la ventana más larga permitida, porque es la que se mira.
  "banner.mp4": { start: 6, duration: 14.7, seamless: true, maxDim: 1280, crf: 30, fps: 25 },
  /* aeropuertoreel es un montaje de cortes rápidos (160 cortes en 99s):
     no existe ninguna ventana de 10s sin cortes, así que el crossfade
     se vería como un disolvido fuera de lugar. En su lugar se recorta
     EXACTAMENTE entre dos cortes de plano detectados (60.6s y 71.4s):
     el punto de loop queda sobre un corte y se lee como uno más del
     montaje, en vez de como un salto. */
  "aeropuertoreel.mp4": { start: 60.6, duration: 10.8, seamless: false, maxDim: 720, crf: 30, fps: 24 },
  "golfreel.mp4": { start: 4, duration: 10.7, seamless: true, maxDim: 720, crf: 30, fps: 24 },
  "tenisreel.mp4": { start: 3, duration: 10.7, seamless: true, maxDim: 720, crf: 30, fps: 24 },
  "reel.mp4": { start: 5, duration: 8.7, seamless: true, maxDim: 720, crf: 30, fps: 24 },
  "reel-1.mp4": { start: 3, duration: 8.7, seamless: true, maxDim: 720, crf: 30, fps: 24 },
  "reel-2.mp4": { start: 1, duration: 8.7, seamless: true, maxDim: 720, crf: 30, fps: 24 },
  "reel-3.mp4": { start: 2, duration: 8.7, seamless: true, maxDim: 720, crf: 30, fps: 24 },
};

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov"]);

const mb = (bytes) => (bytes / 1048576).toFixed(2);
let savedBytes = 0;

/* ── Backup / origen ───────────────────────────────────────────── */

/**
 * Devuelve la ruta del ORIGINAL de un archivo de /public, creando el
 * respaldo la primera vez. Todas las conversiones leen desde acá.
 */
async function sourceOf(publicFile) {
  await fs.mkdir(BACKUP, { recursive: true });
  const backupFile = path.join(BACKUP, path.basename(publicFile));
  try {
    await fs.access(backupFile);
  } catch {
    if (DRY) return publicFile;
    await fs.copyFile(publicFile, backupFile);
  }
  return backupFile;
}

/* ── Imágenes ──────────────────────────────────────────────────── */

async function optimizeImage(destFile) {
  const name = path.basename(destFile);
  const ext = path.extname(destFile).toLowerCase();
  const srcFile = await sourceOf(destFile);

  // Se lee a Buffer en vez de darle el path a sharp: en Windows el
  // copyFile del backup deja el handle tomado unos ms y sharp falla con
  // "UNKNOWN: unknown error, open". Con Buffer no hay contención posible.
  const input = await fs.readFile(srcFile);
  const before = input.length;
  const current = (await fs.stat(destFile)).size;

  const image = sharp(input, { failOn: "none" });
  const meta = await image.metadata();
  const maxWidth = IMAGE_WIDTH_OVERRIDES[name] ?? IMAGE_MAX_WIDTH;

  let pipeline = image.rotate(); // aplica orientación EXIF y la descarta
  if (meta.width && meta.width > maxWidth) {
    pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }

  if (ext === ".png") {
    pipeline = pipeline.png({ compressionLevel: 9, palette: true });
  } else if (ext === ".webp") {
    pipeline = pipeline.webp({ quality: 78, effort: 6 });
  } else {
    pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true, progressive: true });
  }

  const out = await pipeline.toBuffer();

  if (out.length >= before) {
    console.log(`  = ${name} ya estaba óptima (${mb(before)} MB)`);
    return;
  }

  if (!DRY) await fs.writeFile(destFile, out);
  savedBytes += current - out.length;
  console.log(
    `  ✓ ${name}  ${mb(before)} → ${mb(out.length)} MB  (-${Math.round(
      (1 - out.length / before) * 100
    )}%)`
  );
}

/* ── Videos ────────────────────────────────────────────────────── */

/**
 * Filtro de escalado. `force_original_aspect_ratio=decrease` encaja el
 * video dentro del cuadro maxDim sin deformarlo, sea vertical u
 * horizontal; `force_divisible_by=2` cumple el requisito de H.264.
 */
const scaleFilter = (p) =>
  `scale='min(${p.maxDim},iw)':'min(${p.maxDim},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=${p.fps}`;

/**
 * Construye el filter_complex de un loop sin costura.
 *
 * Idea: se toma una ventana de D segundos y se devuelve una de D-X,
 * donde los primeros X segundos son un cruce entre la COLA original y
 * la CABEZA original. Así el último frame del resultado coincide con
 * el primero y el `loop` del <video> no muestra ningún salto.
 *
 *   head = [0 .. X]        cola = [D-X .. D]        medio = [X .. D-X]
 *   salida = crossfade(cola → head) + medio
 */
function seamlessFilter(p, duration) {
  const x = CROSSFADE_S;
  const s = scaleFilter(p);
  return [
    `[0:v]${s},split=3[a][b][c]`,
    `[a]trim=0:${x},setpts=PTS-STARTPTS[head]`,
    `[b]trim=${x}:${duration - x},setpts=PTS-STARTPTS[mid]`,
    `[c]trim=${duration - x}:${duration},setpts=PTS-STARTPTS[tail]`,
    // A = head, B = tail. En T=0 pesa todo la cola; en T=X, toda la cabeza.
    `[head][tail]blend=all_expr='A*(T/${x})+B*(1-(T/${x}))'[fade]`,
    `[fade][mid]concat=n=2:v=1[out]`,
  ].join(";");
}

async function optimizeVideo(destFile) {
  const name = path.basename(destFile);
  const srcFile = await sourceOf(destFile);
  const before = (await fs.stat(srcFile)).size;
  const current = (await fs.stat(destFile)).size;
  const p = VIDEO_PROFILES[name] ?? VIDEO_DEFAULT;
  const tmp = path.join(PUBLIC, `.__tmp_${name}`);
  const poster = destFile.replace(/\.\w+$/, "-poster.webp");

  const trimming = !FULL;
  const seamless = trimming && p.seamless;
  const finalDuration = seamless ? p.duration - CROSSFADE_S : p.duration;

  if (DRY) {
    console.log(
      `  · ${name} (${mb(before)} MB) → ${trimming ? `${finalDuration.toFixed(1)}s` : "completo"}` +
        ` ${p.maxDim}px crf${p.crf}${seamless ? " loop sin costura" : ""}`
    );
    return;
  }

  const ffArgs = ["-y"];
  // -ss ANTES del -i hace seek rápido por keyframe; el reencode posterior
  // corrige el desfase, así que el corte igual queda donde se pidió.
  if (trimming) ffArgs.push("-ss", String(p.start), "-t", String(p.duration));
  ffArgs.push("-i", srcFile);

  if (seamless) {
    ffArgs.push("-filter_complex", seamlessFilter(p, p.duration), "-map", "[out]");
  } else {
    ffArgs.push("-vf", scaleFilter(p));
  }

  ffArgs.push(
    "-c:v", "libx264",
    "-preset", "slower",
    "-crf", String(p.crf),
    "-profile:v", "high",
    "-pix_fmt", "yuv420p",
    // Keyframe cada segundo: el loop reinicia sin tener que decodificar
    // hacia atrás y el navegador puede hacer seek al frame 0 al instante.
    "-g", String(p.fps),
    // faststart mueve el moov atom al inicio: el video empieza a
    // reproducirse sin esperar la descarga completa del archivo.
    "-movflags", "+faststart",
    // Son loops ambiente muteados: el track de audio es peso muerto.
    "-an",
    tmp
  );

  await run(ffmpegPath, ffArgs, { maxBuffer: 1024 * 1024 * 32 });

  const after = (await fs.stat(tmp)).size;
  await fs.rename(tmp, destFile);
  savedBytes += current - after;
  console.log(
    `  ✓ ${name}  ${mb(before)} → ${mb(after)} MB  (-${Math.round(
      (1 - after / before) * 100
    )}%)  ${trimming ? `${finalDuration.toFixed(1)}s` : "completo"}`
  );

  // Poster: sin él el navegador pinta un rectángulo negro hasta el
  // primer frame decodificado, y ese hueco es el LCP del hero.
  const posterTmp = path.join(PUBLIC, `.__poster_${name}.png`);
  await run(ffmpegPath, ["-y", "-i", destFile, "-frames:v", "1", posterTmp]);
  await sharp(await fs.readFile(posterTmp))
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 62 })
    .toFile(poster);
  await fs.unlink(posterTmp);
  console.log(`    └ poster: ${path.basename(poster)}`);
}

/* ── Main ──────────────────────────────────────────────────────── */

async function main() {
  console.log(DRY ? "\n[DRY RUN] Nada se escribe.\n" : "\nOptimizando /public…\n");
  if (FULL) console.log("Modo --full: sin recortes, metraje completo.\n");

  const entries = await fs.readdir(PUBLIC, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => path.join(PUBLIC, e.name))
    .filter((f) => !path.basename(f).startsWith("."))
    // Los posters y temporales de corridas previas no se re-procesan.
    .filter((f) => !f.includes("-poster."));

  const images = files.filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()));
  const videos = files.filter((f) => VIDEO_EXT.has(path.extname(f).toLowerCase()));

  if (!ONLY_VIDEOS) {
    console.log(`Imágenes (${images.length})`);
    for (const f of images) {
      try {
        await optimizeImage(f);
      } catch (err) {
        console.warn(`  ! ${path.basename(f)}: ${err.message}`);
      }
    }
  }

  if (!ONLY_IMAGES) {
    console.log(`\nVideos (${videos.length})`);
    for (const f of videos) {
      try {
        await optimizeVideo(f);
      } catch (err) {
        console.warn(`  ! ${path.basename(f)}: ${err.message}`);
      }
    }
  }

  console.log("\n──────────────────────────────");
  console.log(`Ahorro en esta corrida: ${mb(savedBytes)} MB`);
  console.log(`Originales intactos en: ${BACKUP}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

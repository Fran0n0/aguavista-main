/**
 * Prueba ventanas candidatas de un video y mide cuánto se nota el corte
 * del loop: compara el frame del segundo `start` contra el del segundo
 * `start + duration - crossfade`. Cuanto más parecidos, mejor cierra.
 *
 * Uso: node probe_loop.mjs <archivo> <duracion> <crossfade> <start...>
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);
const [file, durationArg, xfadeArg, ...starts] = process.argv.slice(2);
const duration = Number(durationArg);
const xfade = Number(xfadeArg);

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "probe-"));

async function frameAt(seconds, tag) {
  const out = path.join(tmp, `${tag}.png`);
  await run(ffmpegPath, ["-y", "-ss", String(seconds), "-i", file, "-frames:v", "1", out]);
  return sharp(out).resize({ width: 64, height: 64, fit: "fill" }).greyscale().raw().toBuffer();
}

console.log(`\n${path.basename(file)} — ventana de ${duration}s, crossfade ${xfade}s`);
console.log("start   dif.media   veredicto");

const results = [];
for (const s of starts.map(Number)) {
  try {
    // Extremos del loop final: el primer frame visible y el que queda
    // justo antes de volver a empezar.
    const a = await frameAt(s, `a${s}`);
    const b = await frameAt(s + duration - xfade, `b${s}`);
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
    const diff = sum / a.length;
    results.push({ s, diff });
    const verdict = diff < 6 ? "SIN SALTO" : diff < 18 ? "salto leve" : "SALTO VISIBLE";
    console.log(`${String(s).padStart(4)}s   ${diff.toFixed(2).padStart(6)}      ${verdict}`);
  } catch {
    console.log(`${String(s).padStart(4)}s   (fuera de rango)`);
  }
}

results.sort((x, y) => x.diff - y.diff);
if (results.length) {
  console.log(`\n→ mejor start: ${results[0].s}s (dif. ${results[0].diff.toFixed(2)})`);
}

await fs.rm(tmp, { recursive: true, force: true });

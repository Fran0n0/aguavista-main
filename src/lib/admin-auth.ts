import "server-only";

import { createHmac, randomBytes, timingSafeEqual, scryptSync } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Sesión del panel /admin.
 *
 * Reemplaza al PIN '1234' que estaba hardcodeado dentro de un client
 * component: esa comparación viajaba en el bundle y cualquiera podía
 * leerla con abrir devtools. Acá la contraseña nunca sale del servidor.
 *
 * El token es un cookie httpOnly con la forma `<expiración>.<firma>`,
 * firmado con HMAC-SHA256. No hace falta almacenamiento de sesiones:
 * la firma es la que prueba que el servidor emitió ese token.
 *
 * Variables de entorno (ver .env.example):
 *   ADMIN_PASSWORD        contraseña del panel — obligatoria
 *   ADMIN_SESSION_SECRET  clave para firmar el token — obligatoria
 */

export const SESSION_COOKIE = "av_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 h: una jornada de trabajo

/** Sal fija para derivar el hash de la contraseña antes de compararla.
 *  No es un almacén de credenciales (la contraseña vive en el entorno),
 *  solo iguala el largo de ambos lados para poder usar timingSafeEqual. */
const COMPARE_SALT = "aguavista-admin-compare";

function getSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  // Un secreto corto haría la firma trivial de forzar.
  if (!secret || secret.length < 32) return null;
  return secret;
}

/** true si el panel está configurado; si no, se bloquea el acceso entero. */
export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && getSecret());
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Compara dos strings en tiempo constante.
 *
 * Se comparan los hashes y no los textos: `timingSafeEqual` exige buffers
 * del mismo largo, y comparar los originales filtraría el largo de la
 * contraseña real a través de la excepción.
 */
function safeEqual(a: string, b: string): boolean {
  const ha = scryptSync(a, COMPARE_SALT, 32);
  const hb = scryptSync(b, COMPARE_SALT, 32);
  return timingSafeEqual(ha, hb);
}

/* ── Rate limit de intentos ────────────────────────────────────────
   En memoria y por instancia. Suficiente para un panel interno; si el
   sitio pasa a varias réplicas, mover a Redis. */
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const attempts = new Map<string, number[]>();

export function isLockedOut(ip: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < LOCKOUT_MS);
  attempts.set(ip, recent);
  return recent.length >= MAX_ATTEMPTS;
}

export function registerFailedAttempt(ip: string): void {
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < LOCKOUT_MS);
  recent.push(now);
  attempts.set(ip, recent);
}

export function clearAttempts(ip: string): void {
  attempts.delete(ip);
}

/* ── Verificación de credenciales ──────────────────────────────── */

export function verifyPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(candidate, expected);
}

/* ── Emisión y validación del token ────────────────────────────── */

function createToken(secret: string): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  // El nonce hace que dos logins seguidos no produzcan el mismo token.
  const nonce = randomBytes(8).toString("hex");
  const payload = `${expiresAt}.${nonce}`;
  return `${payload}.${sign(payload, secret)}`;
}

function isTokenValid(token: string | undefined): boolean {
  const secret = getSecret();
  if (!token || !secret) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [expiresAt, nonce, signature] = parts;
  const payload = `${expiresAt}.${nonce}`;

  // Primero la firma: sin ella, la expiración es un dato que el cliente
  // podría haber escrito él mismo.
  let signatureOk = false;
  try {
    signatureOk = timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(sign(payload, secret), "hex")
    );
  } catch {
    return false; // largo inesperado en la firma
  }
  if (!signatureOk) return false;

  const exp = Number(expiresAt);
  return Number.isFinite(exp) && exp > Date.now();
}

/* ── API para server actions y server components ───────────────── */

export async function createSession(): Promise<boolean> {
  const secret = getSecret();
  if (!secret) return false;

  const store = await cookies();
  store.set(SESSION_COOKIE, createToken(secret), {
    httpOnly: true, // invisible para document.cookie
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // sobrevive a la navegación normal, no a un POST cross-site
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return true;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Se llama desde el server component de /admin antes de renderizar nada. */
export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  return isTokenValid(store.get(SESSION_COOKIE)?.value);
}

/**
 * Guard para el CUERPO de cada página del panel.
 *
 * El chequeo del layout no alcanza y esto no es paranoia: los segmentos
 * de una misma ruta se renderizan en paralelo, así que aunque el layout
 * decida mostrar el login y descartar `children`, la página hija ya
 * ejecutó su cuerpo — sus consultas incluidas — y el resultado viaja en
 * el payload RSC de una request sin sesión. Se verificó levantando el
 * server sin cookie: el encabezado de la bandeja de consultas aparecía
 * en la respuesta.
 *
 * Cada página del panel llama a esto ANTES de consultar la base y corta
 * con `return null` si da false. Lo que se ve lo sigue decidiendo el
 * layout; esto solo garantiza que no se lea ni se serialice nada.
 */
export async function canReadAdminData(): Promise<boolean> {
  return hasValidSession();
}

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { locales } from "@/i18n/routing";
import {
  clearAttempts,
  createSession,
  destroySession,
  isAdminConfigured,
  isLockedOut,
  registerFailedAttempt,
  verifyPassword,
} from "@/lib/admin-auth";

export type LoginState = {
  error: "credentials" | "locked" | "unconfigured" | null;
};

/**
 * Rutas a las que el login puede mandar despues de autenticar.
 *
 * El destino lo propone el cliente (campo `next`), asi que se valida
 * contra esta lista blanca: aceptar el valor crudo seria un
 * open-redirect — bastaria un enlace al login con
 * `next=https://otro-sitio` para rebotar al usuario recien logueado
 * fuera del dominio.
 */
const SAFE_NEXT = new RegExp(`^/(${locales.join("|")})/admin(?:/[a-z-]+)?$`);

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "unknown";
}

/**
 * Login del panel. Se usa con `useActionState`, por eso recibe el estado
 * previo aunque no lo lea.
 *
 * La contraseña llega por FormData y se compara del lado del servidor:
 * el bundle del cliente no contiene ni la contraseña ni la lógica de
 * comparación.
 */
export async function adminLogin(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  if (!isAdminConfigured()) {
    console.error(
      "[admin] Falta ADMIN_PASSWORD o ADMIN_SESSION_SECRET (min. 32 caracteres)."
    );
    return { error: "unconfigured" };
  }

  const ip = await clientIp();
  if (isLockedOut(ip)) return { error: "locked" };

  const password = formData.get("password");
  if (typeof password !== "string" || !password) {
    registerFailedAttempt(ip);
    return { error: "credentials" };
  }

  if (!verifyPassword(password)) {
    registerFailedAttempt(ip);
    return { error: "credentials" };
  }

  clearAttempts(ip);
  await createSession();

  // revalidatePath sola no alcanzaba de forma confiable: el que decide
  // mostrar el login es el LAYOUT, y invalidar el segmento "page" no
  // garantiza que el layout se vuelva a evaluar en la respuesta de la
  // action. El redirect fuerza una navegación real, que re-ejecuta el
  // árbol entero — ahí el layout encuentra la cookie recién creada y
  // sirve el panel. Sin esto el riesgo es el peor de todos: la
  // contraseña era correcta y la pantalla no cambia.
  revalidatePath("/[locale]/admin", "layout");

  const proposed = String(formData.get("next") ?? "");
  const target = SAFE_NEXT.test(proposed) ? proposed : "/es/admin";

  // redirect() lanza NEXT_REDIRECT y su tipo de retorno es `never`, así
  // que no hace falta devolver un LoginState después de esta línea.
  redirect(target);
}

export async function adminLogout(): Promise<void> {
  await destroySession();
  revalidatePath("/[locale]/admin", "page");
}

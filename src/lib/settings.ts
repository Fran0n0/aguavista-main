import "server-only";

import { getServiceClient } from "./supabase-admin";
import { SETTING_DEFAULTS, type Settings } from "@/config/media";

/**
 * Lectura de los medios globales configurables desde el panel.
 *
 * Las claves, etiquetas y valores por defecto viven en
 * src/config/media.ts porque el panel las necesita en el cliente; acá
 * queda solo el acceso a la base, que es lo que obliga al guard
 * `server-only`.
 *
 * Devuelve SIEMPRE un valor usable: si no hay Supabase, si la tabla no
 * existe o si la fila está vacía, cae al archivo de /public. Así el
 * sitio nunca queda con un <video src=""> ni un poster roto.
 */
export async function getSettings(): Promise<Settings> {
  const resolved: Settings = { ...SETTING_DEFAULTS };
  const supabase = getServiceClient();
  if (!supabase) return resolved;

  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", Object.keys(SETTING_DEFAULTS));

  if (error) {
    console.warn("[settings] No se pudo leer site_settings:", error.message);
    return resolved;
  }

  for (const row of data ?? []) {
    const key = row.key as keyof Settings;
    if (key in resolved && typeof row.value === "string" && row.value.trim()) {
      resolved[key] = row.value.trim();
    }
  }
  return resolved;
}

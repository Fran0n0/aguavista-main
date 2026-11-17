import { SETTING_DEFAULTS, type Settings } from "@/config/media";

/**
 * Medios globales del sitio.
 *
 * Version HTML estatico: ya no se leen de Supabase (el panel /admin esta
 * deshabilitado), se usan siempre los archivos de /public definidos en
 * src/config/media.ts.
 */
export async function getSettings(): Promise<Settings> {
  return { ...SETTING_DEFAULTS };
}

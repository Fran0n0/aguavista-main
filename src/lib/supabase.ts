import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para el navegador, creado de forma perezosa.
 *
 * Antes se instanciaba a nivel de módulo con `createClient(url || '', ...)`,
 * lo que hacía dos cosas malas:
 *   1. Reventaba el build ("supabaseUrl is required") cuando las variables
 *      de entorno no estaban definidas, porque el prerender evalúa el
 *      módulo aunque el componente nunca llegue a renderizar.
 *   2. Metía el SDK entero en el grafo del primer render.
 *
 * Ahora el cliente se crea en la primera llamada real y se cachea.
 * Devuelve null si falta configuración, para que quien lo use pueda
 * mostrar un estado vacío en vez de tirar una excepción.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  client = createClient(url, key);
  return client;
}

/** true cuando hay credenciales cargadas; útil para renderizar fallbacks. */
export const isSupabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

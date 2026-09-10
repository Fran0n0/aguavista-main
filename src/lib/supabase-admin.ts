import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase con service role. SOLO servidor.
 *
 * Usa `SUPABASE_SERVICE_ROLE_KEY`, que saltea las políticas de RLS: con
 * esto el panel puede escribir en tablas cerradas al navegador y la
 * server action del formulario puede insertar en `leads` sin que la
 * tabla quede abierta a la anon key.
 *
 * El módulo es `server-only`: si alguien lo importa desde un componente
 * cliente, el build falla en vez de filtrar la clave al bundle.
 */
let client: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

/** true cuando hay credenciales de servidor cargadas. */
export const isServiceConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

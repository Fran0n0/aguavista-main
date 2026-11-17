"use server";

import { revalidatePath } from "next/cache";
import { getServiceClient } from "@/lib/supabase-admin";
import { hasValidSession } from "@/lib/admin-auth";
import { buildSeedRows } from "@/lib/amenities";

export type ActionResult =
  | { ok: true; message: string; url?: string }
  | { ok: false; message: string };

const NOT_CONFIGURED =
  "Supabase no está configurado. Falta NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el .env.local.";

/**
 * Toda acción del CMS pasa por acá primero.
 *
 * Que la UI del panel esté detrás del guard del layout NO alcanza: las
 * server actions son endpoints HTTP reales y cualquiera puede invocarlas
 * directamente conociendo su id. La sesión se revalida en cada llamada.
 */
async function guard(): Promise<ActionResult | null> {
  if (!(await hasValidSession())) {
    return { ok: false, message: "Sesión expirada. Volvé a iniciar sesión." };
  }
  return null;
}

/** Refresca el sitio público y el panel tras un cambio de contenido. */
function revalidateAll() {
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/admin", "layout");
}

/* ══════════════════════════ AMENITIES ═══════════════════════════ */

export async function seedAmenities(): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  const supabase = getServiceClient();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const rows = await buildSeedRows();
  // upsert y no insert: volver a sembrar restaura los textos originales
  // sin duplicar filas ni romper por clave repetida.
  const { error } = await supabase.from("amenities").upsert(rows, { onConflict: "id" });

  if (error) return { ok: false, message: `No se pudo sembrar: ${error.message}` };

  revalidateAll();
  return { ok: true, message: `${rows.length} amenities cargadas desde el catálogo base.` };
}

export async function updateAmenity(formData: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  const supabase = getServiceClient();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, message: "Falta el id de la amenity." };

  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };

  const image = text("image");
  if (!image) return { ok: false, message: "La portada es obligatoria." };

  /* Galería: el editor manda un campo `gallery` por foto, así que se leen
     todos con getAll(). Se descartan los vacíos (una fila recién agregada
     y no completada) y la portada repetida, que si no aparecería dos veces
     seguidas en el carrusel. */
  const gallery = formData
    .getAll("gallery")
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v, i, all) => v && v !== image && all.indexOf(v) === i);

  const { error } = await supabase
    .from("amenities")
    .update({
      image,
      gallery,
      video: text("video"),
      featured: formData.get("featured") === "on",
      enabled: formData.get("enabled") === "on",
      sort_order: Number(formData.get("sort_order") ?? 0) || 0,
      title_es: text("title_es"),
      title_en: text("title_en"),
      title_pt: text("title_pt"),
      description_es: text("description_es"),
      description_en: text("description_en"),
      description_pt: text("description_pt"),
      description_long_es: text("description_long_es"),
      description_long_en: text("description_long_en"),
      description_long_pt: text("description_long_pt"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, message: `No se pudo guardar: ${error.message}` };

  revalidateAll();
  return { ok: true, message: "Amenity actualizada." };
}

/* ══════════════════════════ MEDIA ═══════════════════════════════ */

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ALLOWED = new Set([
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/avif",
  "video/mp4",
  "video/webm",
]);

/**
 * Sube un archivo al bucket `media` y devuelve su URL pública.
 *
 * El tipo se valida contra una lista blanca y no por extensión: un
 * `.mp4` renombrado no debería poder colarse como otra cosa.
 */
export async function uploadMedia(formData: FormData): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  const supabase = getServiceClient();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "No se recibió ningún archivo." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `El archivo pesa ${(file.size / 1048576).toFixed(1)} MB. El máximo es 20 MB.`,
    };
  }
  if (!ALLOWED.has(file.type)) {
    return { ok: false, message: `Tipo no permitido: ${file.type || "desconocido"}.` };
  }

  // Nombre saneado + timestamp: evita colisiones y caracteres raros en
  // la URL, y permite subir dos versiones del mismo archivo sin pisar
  // la anterior (importante para poder volver atrás).
  const safeName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const path = `${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from("media")
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });

  if (error) return { ok: false, message: `Error al subir: ${error.message}` };

  const { data } = supabase.storage.from("media").getPublicUrl(path);

  revalidateAll();
  return { ok: true, message: `${file.name} subido.`, url: data.publicUrl };
}

export async function deleteMedia(path: string): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  const supabase = getServiceClient();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const { error } = await supabase.storage.from("media").remove([path]);
  if (error) return { ok: false, message: `No se pudo borrar: ${error.message}` };

  revalidateAll();
  return { ok: true, message: "Archivo borrado." };
}

/* ══════════════════════════ SETTINGS ════════════════════════════ */

export async function setSetting(key: string, value: string): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  const supabase = getServiceClient();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const { error } = await supabase
    .from("site_settings")
    .upsert(
      { key, value: value.trim() || null, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (error) return { ok: false, message: `No se pudo guardar: ${error.message}` };

  revalidateAll();
  return { ok: true, message: "Guardado." };
}

/* ══════════════════════════ LEADS ═══════════════════════════════ */

export async function updateLeadStatus(
  id: number,
  status: "nuevo" | "contactado" | "archivado"
): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  const supabase = getServiceClient();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const { error } = await supabase.from("leads").update({ status }).eq("id", id);
  if (error) return { ok: false, message: `No se pudo actualizar: ${error.message}` };

  revalidatePath("/[locale]/admin", "layout");
  return { ok: true, message: "Estado actualizado." };
}

export async function deleteLead(id: number): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;

  const supabase = getServiceClient();
  if (!supabase) return { ok: false, message: NOT_CONFIGURED };

  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return { ok: false, message: `No se pudo borrar: ${error.message}` };

  revalidatePath("/[locale]/admin", "layout");
  return { ok: true, message: "Consulta borrada." };
}

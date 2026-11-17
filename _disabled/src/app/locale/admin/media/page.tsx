import { getServiceClient, isServiceConfigured } from "@/lib/supabase-admin";
import { canReadAdminData } from "@/lib/admin-auth";
import { SETTING_DEFAULTS, type SettingKey } from "@/config/media";
import { getSettings } from "@/lib/settings";
import { NotConfigured, PageHeader } from "../AdminUI";
import { MediaManager, type MediaSlot, type StoredFile } from "../MediaManager";

// Los medios cambian desde el propio panel: nunca se cachea esta vista.
export const dynamic = "force-dynamic";

/**
 * Gestión de medios reemplazables.
 *
 * Cada slot es una clave de `site_settings`; el sitio público las lee
 * con getSettings() y cae al archivo de /public cuando la fila no
 * existe. Eso hace que la vista sea segura de tocar: guardar vacío
 * restaura el original en vez de dejar la sección sin video.
 */
export default async function MediaPage() {
  // El guard del layout NO alcanza: los segmentos hermanos renderizan en
  // paralelo, asi que este cuerpo se ejecuta —y sus consultas viajan en
  // el payload RSC— aunque el layout muestre el login. Ver canReadAdminData().
  if (!(await canReadAdminData())) return null;

  if (!isServiceConfigured()) {
    return (
      <>
        <PageHeader
          title="Medios"
          subtitle="Video del hero y micro-videos de la sección de estilo de vida."
        />
        <NotConfigured what="La gestión de medios" />
      </>
    );
  }

  const supabase = getServiceClient()!;
  const settings = await getSettings();

  const slots: MediaSlot[] = (Object.keys(SETTING_DEFAULTS) as SettingKey[]).map((key) => ({
    key,
    value: settings[key],
    fallback: SETTING_DEFAULTS[key],
    isDefault: settings[key] === SETTING_DEFAULTS[key],
  }));

  const { data, error } = await supabase.storage
    .from("media")
    .list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });

  const files: StoredFile[] = (data ?? [])
    // `list` devuelve también los pseudo-directorios, que no tienen
    // metadata y no son archivos borrables.
    .filter((item) => item.name && item.metadata)
    .map((item) => ({
      name: item.name,
      url: supabase.storage.from("media").getPublicUrl(item.name).data.publicUrl,
      size: (item.metadata?.size as number | undefined) ?? null,
    }));

  const personalizados = slots.filter((s) => !s.isDefault).length;

  return (
    <>
      <PageHeader
        title="Medios"
        subtitle={
          personalizados
            ? `${personalizados} de ${slots.length} medios reemplazados desde el panel.`
            : "Todos los medios están en su versión original del repositorio."
        }
      />

      {error && (
        <div className="mx-6 mt-6 rounded-2xl border border-[#E2725B]/35 bg-[#E2725B]/5 p-5 md:mx-10">
          <p className="font-sans text-[13px] text-[#E2725B]">
            No se pudo listar el bucket <code>media</code>: {error.message}
          </p>
          <p className="mt-2 font-sans text-[13px] font-light text-ink-muted">
            Si el bucket todavía no existe, corré <code>supabase/schema.sql</code> en
            el SQL Editor de tu proyecto. Los slots de abajo igual se pueden editar
            pegando una URL.
          </p>
        </div>
      )}

      <MediaManager slots={slots} files={files} />
    </>
  );
}

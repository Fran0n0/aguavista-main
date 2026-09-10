import { getServiceClient, isServiceConfigured } from "@/lib/supabase-admin";
import { canReadAdminData } from "@/lib/admin-auth";
import type { AmenityRow } from "@/lib/amenities";
import { NotConfigured, PageHeader } from "../AdminUI";
import { AmenitiesEditor } from "../AmenitiesEditor";

export const dynamic = "force-dynamic";

/**
 * Mini-CMS de la sección de amenities.
 *
 * El sitio público lee esta misma tabla (`src/lib/amenities.ts`). Si la
 * tabla está vacía, el sitio cae al catálogo estático de
 * `src/data/amenities.ts` — por eso el botón de "sembrar": copia ese
 * catálogo a la base para poder empezar a editarlo.
 */
export default async function AmenitiesAdminPage() {
  // El guard del layout NO alcanza: los segmentos hermanos renderizan en
  // paralelo, asi que este cuerpo se ejecuta —y sus consultas viajan en
  // el payload RSC— aunque el layout muestre el login. Ver canReadAdminData().
  if (!(await canReadAdminData())) return null;

  if (!isServiceConfigured()) {
    return (
      <>
        <PageHeader
          title="Amenities"
          subtitle="Editá la imagen, el título y la descripción de cada amenity."
        />
        <NotConfigured what="El editor de amenities" />
      </>
    );
  }

  const supabase = getServiceClient()!;
  const { data, error } = await supabase
    .from("amenities")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return (
      <>
        <PageHeader title="Amenities" />
        <div className="mx-6 my-8 rounded-2xl border border-[#E2725B]/35 bg-[#E2725B]/5 p-6 md:mx-10">
          <p className="font-sans text-[13px] text-[#E2725B]">
            No se pudo leer la tabla <code>amenities</code>: {error.message}
          </p>
          <p className="mt-2 font-sans text-[13px] font-light text-ink-muted">
            Si todavía no existe, corré <code>supabase/schema.sql</code> en el SQL
            Editor de Supabase.
          </p>
        </div>
      </>
    );
  }

  return <AmenitiesEditor rows={(data ?? []) as AmenityRow[]} />;
}

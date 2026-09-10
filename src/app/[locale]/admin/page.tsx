import { getServiceClient, isServiceConfigured } from "@/lib/supabase-admin";
import { canReadAdminData } from "@/lib/admin-auth";
import { EmptyState, NotConfigured, PageHeader } from "./AdminUI";
import { LeadsTable, type Lead } from "./LeadsTable";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  if (!(await canReadAdminData())) return null;

  if (!isServiceConfigured()) {
    return (
      <>
        <PageHeader
          title="Consultas"
          subtitle="Formularios de contacto recibidos desde el sitio."
        />
        <NotConfigured what="La bandeja de consultas" />
      </>
    );
  }

  const supabase = getServiceClient()!;
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return (
      <>
        <PageHeader title="Consultas" />
        <div className="mx-6 my-8 rounded-2xl border border-[#E2725B]/35 bg-[#E2725B]/5 p-6 md:mx-10">
          <p className="font-sans text-[13px] text-[#E2725B]">
            No se pudo leer la tabla <code>leads</code>: {error.message}
          </p>
          <p className="mt-2 font-sans text-[13px] font-light text-ink-muted">
            Si la tabla todavía no existe, corré <code>supabase/schema.sql</code> en
            el SQL Editor de tu proyecto de Supabase.
          </p>
        </div>
      </>
    );
  }

  const leads = (data ?? []) as Lead[];
  const nuevos = leads.filter((l) => l.status === "nuevo").length;

  return (
    <>
      <PageHeader
        title="Consultas"
        subtitle={
          leads.length
            ? `${leads.length} consultas recibidas · ${nuevos} sin contactar.`
            : "Formularios de contacto recibidos desde el sitio."
        }
      />

      {leads.length === 0 ? (
        <EmptyState
          title="Todavía no hay consultas"
          body="Cuando alguien complete el formulario de contacto del sitio, va a aparecer acá con su nombre, email, teléfono y el interés que eligió."
        />
      ) : (
        <LeadsTable leads={leads} />
      )}
    </>
  );
}
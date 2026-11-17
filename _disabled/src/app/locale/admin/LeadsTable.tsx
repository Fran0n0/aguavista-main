"use client";

import { useMemo, useState, useTransition } from "react";
import { Mail, MessageSquare, Phone, Trash2 } from "lucide-react";
import { deleteLead, updateLeadStatus } from "@/app/actions/admin-cms";
import { AdminButton, StatusBadge } from "./AdminUI";
import { cn } from "@/lib/utils";

export interface Lead {
  id: number;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  interest: string;
  message: string | null;
  locale: string | null;
  status: "nuevo" | "contactado" | "archivado";
}

const INTEREST_LABELS: Record<string, string> = {
  lote: "Comprar un lote",
  visita: "Agendar una visita",
  inversion: "Inversión",
  otro: "Otra consulta",
};

const FILTERS = ["todos", "nuevo", "contactado", "archivado"] as const;
type Filter = (typeof FILTERS)[number];

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [filter, setFilter] = useState<Filter>("todos");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = useMemo(
    () => (filter === "todos" ? leads : leads.filter((l) => l.status === filter)),
    [leads, filter]
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { todos: leads.length };
    for (const l of leads) map[l.status] = (map[l.status] ?? 0) + 1;
    return map;
  }, [leads]);

  const setStatus = (id: number, status: Lead["status"]) =>
    startTransition(async () => {
      await updateLeadStatus(id, status);
    });

  const remove = (id: number, name: string) => {
    if (!confirm(`¿Borrar la consulta de ${name}? No se puede deshacer.`)) return;
    startTransition(async () => {
      await deleteLead(id);
    });
  };

  /** Exporta lo que está a la vista, respetando el filtro activo. */
  const exportCsv = () => {
    const header = ["Fecha", "Nombre", "Email", "Teléfono", "Interés", "Idioma", "Estado", "Mensaje"];
    // Comillas dobles escapadas y campos siempre entrecomillados: un
    // mensaje con comas o saltos de línea rompería el CSV si no.
    const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = visible.map((l) =>
      [
        new Date(l.created_at).toLocaleString("es-PY"),
        l.name,
        l.email,
        l.phone,
        INTEREST_LABELS[l.interest] ?? l.interest,
        l.locale ?? "",
        l.status,
        l.message ?? "",
      ]
        .map(escape)
        .join(",")
    );

    // BOM al principio: sin él, Excel abre el CSV en ANSI y rompe los
    // acentos de los nombres paraguayos.
    const blob = new Blob(["﻿" + [header.map(escape).join(","), ...rows].join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aguavista-consultas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("px-6 py-6 md:px-10", isPending && "opacity-60")}>
      {/* ── Filtros ── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "rounded-full border px-4 py-2 font-sans text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-200",
                filter === f
                  ? "border-[color:var(--av-vivo)] bg-[color:var(--av-vivo)]/10 text-vivo"
                  : "border-[color:var(--av-border)] text-ink-muted hover:text-ink"
              )}
            >
              {f} {counts[f] ? `(${counts[f]})` : ""}
            </button>
          ))}
        </div>

        <AdminButton variant="ghost" onClick={exportCsv} disabled={!visible.length}>
          Exportar CSV
        </AdminButton>
      </div>

      {/* ── Lista ── */}
      <ul className="flex flex-col gap-2">
        {visible.map((lead) => {
          const isOpen = expanded === lead.id;
          return (
            <li
              key={lead.id}
              className="overflow-hidden rounded-2xl border border-[color:var(--av-border-soft)] bg-[color:var(--av-surface)]"
            >
              <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-sans text-sm font-medium text-ink">{lead.name}</span>
                    <StatusBadge status={lead.status} />
                    <span className="font-sans text-[11px] text-ink-faint">
                      {new Date(lead.created_at).toLocaleString("es-PY", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5">
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex items-center gap-1.5 font-sans text-[12px] font-light text-ink-muted transition-colors hover:text-vivo"
                    >
                      <Mail className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                      {lead.email}
                    </a>
                    <a
                      href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 font-sans text-[12px] font-light text-ink-muted transition-colors hover:text-vivo"
                    >
                      <Phone className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                      {lead.phone}
                    </a>
                    <span className="font-sans text-[12px] font-light text-lux">
                      {INTEREST_LABELS[lead.interest] ?? lead.interest}
                    </span>
                    {lead.message && (
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : lead.id)}
                        aria-expanded={isOpen}
                        className="flex items-center gap-1.5 font-sans text-[12px] font-light text-ink-muted transition-colors hover:text-vivo"
                      >
                        <MessageSquare className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                        {isOpen ? "Ocultar mensaje" : "Ver mensaje"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {lead.status !== "contactado" && (
                    <AdminButton variant="ghost" onClick={() => setStatus(lead.id, "contactado")}>
                      Contactado
                    </AdminButton>
                  )}
                  {lead.status !== "archivado" && (
                    <AdminButton variant="ghost" onClick={() => setStatus(lead.id, "archivado")}>
                      Archivar
                    </AdminButton>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(lead.id, lead.name)}
                    aria-label={`Borrar la consulta de ${lead.name}`}
                    className="grid size-9 place-items-center rounded-full border border-[color:var(--av-border)] text-ink-faint transition-colors duration-200 hover:border-[#E2725B] hover:text-[#E2725B]"
                  >
                    <Trash2 className="size-4" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {isOpen && lead.message && (
                <p className="border-t border-[color:var(--av-border-soft)] bg-[color:var(--av-base)] px-4 py-4 font-sans text-[13px] font-light leading-relaxed text-ink-mid">
                  {lead.message}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

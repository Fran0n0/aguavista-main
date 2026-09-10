"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Image as ImageIcon, Inbox, LogOut, Map, Sparkles } from "lucide-react";
import { adminLogout } from "@/app/actions/admin-auth";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "", label: "Consultas", Icon: Inbox },
  { href: "/amenities", label: "Amenities", Icon: Sparkles },
  { href: "/media", label: "Medios", Icon: ImageIcon },
  { href: "/masterplan", label: "Masterplan", Icon: Map },
] as const;

/**
 * Chrome del panel: barra lateral, navegación y logout.
 *
 * Usa `next/link` crudo y no el Link de i18n: el panel es interno y
 * monolingüe, no tiene sentido que el idioma de la web pública cambie
 * las URLs de gestión.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // pathname llega como /es/admin/... — se recorta el prefijo de idioma
  // para poder comparar contra las rutas relativas de SECTIONS.
  const localeMatch = pathname.match(/^\/([a-z]{2})(?=\/|$)/);
  const localePrefix = localeMatch ? localeMatch[0] : "";
  const base = `${localePrefix}/admin`;
  const relative = pathname.slice(base.length) || "";

  return (
    <div className="flex min-h-screen flex-col bg-base text-ink lg:flex-row">
      {/* ── Barra lateral ── */}
      <aside className="flex shrink-0 flex-col border-b border-[color:var(--av-border)] bg-[color:var(--av-surface)] lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--av-border-soft)] p-5">
          <div className="flex flex-col">
            <span className="font-display text-lg font-light leading-none text-lux">
              Centro de Mando
            </span>
            <span className="mt-1 font-sans text-[9px] uppercase tracking-[0.22em] text-ink-faint">
              AguaVista
            </span>
          </div>
        </div>

        <nav aria-label="Secciones del panel" className="flex gap-1 overflow-x-auto p-3 lg:flex-col lg:overflow-visible">
          {SECTIONS.map(({ href, label, Icon }) => {
            const active = relative === href;
            return (
              <Link
                key={href || "root"}
                href={`${base}${href}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-xl px-4 py-3",
                  "font-sans text-[12px] font-medium tracking-wide transition-colors duration-200",
                  active
                    ? "bg-[color:var(--av-elevated)] text-vivo"
                    : "text-ink-muted hover:bg-[color:var(--av-elevated)] hover:text-ink"
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-[color:var(--av-border-soft)] p-3">
          <Link
            href={localePrefix || "/es"}
            target="_blank"
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-sans text-[12px] text-ink-muted transition-colors duration-200 hover:bg-[color:var(--av-elevated)] hover:text-ink"
          >
            <ExternalLink className="size-4" strokeWidth={1.5} aria-hidden="true" />
            Ver el sitio
          </Link>

          {/* El logout borra la cookie httpOnly en el servidor: no hay
              nada que limpiar del lado del cliente. */}
          <form action={adminLogout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-sans text-[12px] text-ink-muted transition-colors duration-200 hover:bg-[color:var(--av-elevated)] hover:text-[#E2725B]"
            >
              <LogOut className="size-4" strokeWidth={1.5} aria-hidden="true" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* ── Contenido ── */}
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

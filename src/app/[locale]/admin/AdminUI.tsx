import { type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Encabezado estándar de cada sección del panel. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-[color:var(--av-border-soft)] px-6 py-7 md:flex-row md:items-end md:justify-between md:px-10">
      <div>
        <h1 className="font-display text-2xl font-light text-ink md:text-3xl">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl font-sans text-[13px] font-light leading-relaxed text-ink-muted">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/**
 * Aviso de que falta configurar Supabase.
 *
 * Se muestra en vez de una tabla vacía porque "no hay datos" y "no hay
 * base de datos" son problemas muy distintos y confundirlos hace perder
 * media hora buscando el error donde no está.
 */
export function NotConfigured({ what }: { what: string }) {
  return (
    <div className="mx-6 my-8 flex gap-4 rounded-2xl border border-[#E2725B]/35 bg-[#E2725B]/5 p-6 md:mx-10">
      <AlertTriangle
        className="mt-0.5 size-5 shrink-0 text-[#E2725B]"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <h2 className="font-sans text-sm font-medium text-ink">
          Supabase no está configurado
        </h2>
        <p className="mt-2 font-sans text-[13px] font-light leading-relaxed text-ink-muted">
          {what} necesita base de datos. Agregá estas variables a{" "}
          <code className="rounded bg-[color:var(--av-elevated)] px-1.5 py-0.5 text-[12px] text-lux">
            .env.local
          </code>{" "}
          y reiniciá el servidor:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-[color:var(--av-elevated)] p-4 font-mono text-[12px] leading-relaxed text-ink-mid">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...`}
        </pre>
        <p className="mt-3 font-sans text-[13px] font-light leading-relaxed text-ink-muted">
          Después corré{" "}
          <code className="rounded bg-[color:var(--av-elevated)] px-1.5 py-0.5 text-[12px] text-lux">
            supabase/schema.sql
          </code>{" "}
          en el SQL Editor del proyecto para crear las tablas.
        </p>
      </div>
    </div>
  );
}

/** Estado vacío neutro (hay base, pero todavía no hay registros). */
export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-6 my-16 flex flex-col items-center gap-2 text-center md:mx-10">
      <p className="font-display text-xl font-light text-ink">{title}</p>
      <p className="max-w-sm font-sans text-[13px] font-light leading-relaxed text-ink-muted">
        {body}
      </p>
    </div>
  );
}

const BADGES = {
  nuevo: "border-[color:var(--av-vivo)]/40 text-vivo bg-[color:var(--av-vivo)]/10",
  contactado: "border-[color:var(--av-lux)]/40 text-lux bg-[color:var(--av-lux)]/10",
  archivado: "border-[color:var(--av-border)] text-ink-faint",
} as const;

export function StatusBadge({ status }: { status: string }) {
  const cls = BADGES[status as keyof typeof BADGES] ?? BADGES.archivado;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1",
        "font-sans text-[10px] font-medium uppercase tracking-[0.14em]",
        cls
      )}
    >
      {status}
    </span>
  );
}

/** Botón del panel. No usa el Button público: acá no queremos magnetismo. */
export function AdminButton({
  children,
  variant = "primary",
  className,
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary:
      "bg-[color:var(--av-vivo)] text-[#08150F] hover:bg-[color:var(--av-vivo-deep)]",
    ghost:
      "border border-[color:var(--av-border)] text-ink-muted hover:border-[color:var(--av-vivo)] hover:text-vivo",
    danger:
      "border border-[#E2725B]/40 text-[#E2725B] hover:bg-[#E2725B]/10",
  };

  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5",
        "font-sans text-[11px] font-medium uppercase tracking-[0.16em]",
        "transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

/** Campo de texto del panel, con label arriba. */
export function AdminField({
  label,
  name,
  defaultValue,
  placeholder,
  textarea,
  rows,
  required,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
  required?: boolean;
  hint?: string;
}) {
  const cls =
    "w-full rounded-xl border border-[color:var(--av-border)] bg-[color:var(--av-base)] px-3.5 py-2.5 font-sans text-[13px] font-light text-ink outline-none transition-colors duration-200 focus:border-[color:var(--av-vivo)] placeholder:text-ink-faint";

  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-sans text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted">
        {label}
        {hint && <span className="ml-2 normal-case tracking-normal opacity-70">{hint}</span>}
      </span>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          rows={rows ?? 4}
          required={required}
          className={cn(cls, "resize-y")}
        />
      ) : (
        <input
          type="text"
          name={name}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          required={required}
          className={cls}
        />
      )}
    </label>
  );
}

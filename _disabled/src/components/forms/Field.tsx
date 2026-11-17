"use client";

import { forwardRef, useId, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface BaseProps {
  label: string;
  error?: string;
  /** true cuando el campo pasó la validación y ya fue tocado. */
  valid?: boolean;
  hint?: string;
  className?: string;
}

/** Estilos compartidos por input / textarea / select. */
const control = (hasError?: boolean, hasValue?: boolean) =>
  cn(
    "peer w-full rounded-xl border bg-transparent px-4 pb-2.5 pt-6",
    "font-sans text-[15px] font-light text-ink",
    "transition-[border-color,box-shadow,background] duration-300",
    "placeholder:text-transparent focus:outline-none",
    "focus:border-[color:var(--av-vivo)] focus:bg-[color:var(--av-surface)]",
    hasError
      ? "border-[#E2725B]"
      : hasValue
        ? "border-[color:var(--av-border)]"
        : "border-[color:var(--av-border-soft)] hover:border-[color:var(--av-border)]"
  );

/** Label flotante: baja al placeholder cuando el campo está vacío y sin foco. */
const labelCls = cn(
  "pointer-events-none absolute left-4 top-2 origin-left",
  "font-sans text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted",
  "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
  "peer-placeholder-shown:top-[1.15rem] peer-placeholder-shown:text-[13px]",
  "peer-placeholder-shown:tracking-normal peer-placeholder-shown:normal-case",
  "peer-focus:top-2 peer-focus:text-[10px] peer-focus:uppercase",
  "peer-focus:tracking-[0.16em] peer-focus:text-vivo"
);

function Message({ error, id }: { error?: string; id: string }) {
  return (
    <AnimatePresence mode="wait">
      {error && (
        <motion.p
          key={error}
          id={id}
          // role="alert" hace que el lector de pantalla lo anuncie apenas
          // aparece, sin esperar a que el usuario navegue hasta el campo.
          role="alert"
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -4 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-1.5 overflow-hidden pt-1.5 font-sans text-[11px] font-light text-[#E2725B]"
        >
          <AlertCircle className="size-3 shrink-0" strokeWidth={2} aria-hidden="true" />
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/** Tilde de validez — feedback positivo inmediato, no solo errores. */
function ValidMark({ show }: { show?: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-vivo"
        >
          <Check className="size-4" strokeWidth={2.5} />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* ── Input ─────────────────────────────────────────────────────── */

export const TextField = forwardRef<
  HTMLInputElement,
  BaseProps & React.InputHTMLAttributes<HTMLInputElement>
>(function TextField({ label, error, valid, className, ...props }, ref) {
  const autoId = useId();
  const id = props.id ?? autoId;
  const errorId = `${id}-error`;

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <input
          {...props}
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={control(Boolean(error))}
        />
        <label htmlFor={id} className={labelCls}>
          {label}
        </label>
        <ValidMark show={valid && !error} />
      </div>
      <Message error={error} id={errorId} />
    </div>
  );
});

/* ── Textarea ──────────────────────────────────────────────────── */

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextAreaField({ label, error, hint, className, ...props }, ref) {
  const autoId = useId();
  const id = props.id ?? autoId;
  const errorId = `${id}-error`;

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <textarea
          {...props}
          ref={ref}
          id={id}
          rows={props.rows ?? 4}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(control(Boolean(error)), "resize-none")}
        />
        <label htmlFor={id} className={labelCls}>
          {label}
          {hint && <span className="ml-1.5 normal-case tracking-normal opacity-60">({hint})</span>}
        </label>
      </div>
      <Message error={error} id={errorId} />
    </div>
  );
});

/* ── Select ────────────────────────────────────────────────────── */

// El select no muestra tilde de validez (la flecha ya ocupa ese lugar),
// asi que `valid` se excluye del tipo en vez de aceptarlo y descartarlo.
export const SelectField = forwardRef<
  HTMLSelectElement,
  Omit<BaseProps, "valid"> &
    React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }
>(function SelectField({ label, error, className, children, ...props }, ref) {
  const autoId = useId();
  const id = props.id ?? autoId;
  const errorId = `${id}-error`;

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <select
          {...props}
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            control(Boolean(error)),
            "cursor-pointer appearance-none pr-11",
            // El <select> nunca dispara :placeholder-shown, así que el label
            // se fuerza en su posición alta permanentemente.
            "[&:not(:placeholder-shown)]:pt-6"
          )}
        >
          {children}
        </select>
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-4 top-2 font-sans text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted transition-colors duration-300 peer-focus:text-vivo"
        >
          {label}
        </label>
        {/* Flecha propia: la nativa no se puede tematizar en todos los navegadores. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 12 8"
          className="pointer-events-none absolute right-4 top-1/2 size-3 -translate-y-1/2 text-ink-muted"
        >
          <path
            d="M1 1.5L6 6.5L11 1.5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <Message error={error} id={errorId} />
    </div>
  );
});

/* ── Checkbox ──────────────────────────────────────────────────── */

export const CheckboxField = forwardRef<
  HTMLInputElement,
  { error?: string; children: ReactNode; className?: string } & React.InputHTMLAttributes<HTMLInputElement>
>(function CheckboxField({ error, children, className, ...props }, ref) {
  const autoId = useId();
  const id = props.id ?? autoId;
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <span className="relative mt-0.5 grid shrink-0 place-items-center">
          <input
            {...props}
            ref={ref}
            id={id}
            type="checkbox"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              "peer size-[18px] cursor-pointer appearance-none rounded border transition-colors duration-300",
              "checked:border-[color:var(--av-vivo)] checked:bg-[color:var(--av-vivo)]",
              error ? "border-[#E2725B]" : "border-[color:var(--av-border)]"
            )}
          />
          <Check
            aria-hidden="true"
            strokeWidth={3}
            className="pointer-events-none absolute size-3 scale-0 text-[#08150F] transition-transform duration-200 peer-checked:scale-100"
          />
        </span>
        <label
          htmlFor={id}
          className="cursor-pointer font-sans text-[13px] font-light leading-relaxed text-ink-muted"
        >
          {children}
        </label>
      </div>
      <Message error={error} id={errorId} />
    </div>
  );
});

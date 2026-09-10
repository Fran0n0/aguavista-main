"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeMeta, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Selector de idioma.
 *
 * Cambia el locale conservando la ruta actual: si el visitante está en
 * /es/privacidad y elige inglés, aterriza en /en/privacidad, no en /en.
 * `variant="footer"` lo alinea a la izquierda y abre hacia arriba.
 */
export function LanguageSwitcher({
  variant = "header",
  className,
}: {
  variant?: "header" | "footer";
  className?: string;
}) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Cerrar con clic afuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    startTransition(() => {
      // `pathname` viene del router de i18n: ya está sin el prefijo de
      // idioma, así que basta con volver a pedirlo en el locale nuevo.
      router.replace(pathname, { locale: next });
    });
  };

  const isFooter = variant === "footer";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language")}
        disabled={isPending}
        className={cn(
          "group flex items-center gap-2 rounded-full px-3 py-2",
          "font-sans text-[10px] font-medium uppercase tracking-[0.2em]",
          "text-ink-muted transition-colors duration-300",
          "hover:bg-[color:var(--av-elevated)] hover:text-vivo",
          isPending && "opacity-50"
        )}
      >
        <Globe className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
        {localeMeta[locale].short}
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={t("language")}
            initial={{ opacity: 0, y: isFooter ? 8 : -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isFooter ? 8 : -8, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "av-glass absolute z-50 min-w-[11rem] overflow-hidden rounded-xl p-1.5 shadow-av-lg",
              isFooter ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2"
            )}
          >
            {locales.map((code) => {
              const active = code === locale;
              return (
                <li key={code} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => select(code)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
                      "font-sans text-xs transition-colors duration-200",
                      active
                        ? "bg-[color:var(--av-elevated)] text-vivo"
                        : "text-ink-mid hover:bg-[color:var(--av-elevated)] hover:text-ink"
                    )}
                  >
                    <span aria-hidden="true" className="text-sm leading-none">
                      {localeMeta[code].flag}
                    </span>
                    {/* lang= le dice al lector de pantalla que cambie de voz */}
                    <span lang={code} className="flex-1">
                      {localeMeta[code].label}
                    </span>
                    {active && (
                      <Check className="size-3.5 text-vivo" strokeWidth={2} aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

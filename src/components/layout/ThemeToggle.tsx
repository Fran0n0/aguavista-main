"use client";

import { useCallback, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export const THEME_KEY = "av:theme";
/** Evento propio: avisa a todas las instancias montadas en la misma pestaña. */
const THEME_EVENT = "av:theme-change";

/**
 * Script que corre ANTES del primer paint para aplicar el tema guardado.
 * Sin esto la página parpadea en oscuro y salta a claro al hidratar.
 * Se inyecta con dangerouslySetInnerHTML en el <head> del layout.
 */
export const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('${THEME_KEY}');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    }
  } catch (e) {}
})();
`;

type Theme = "light" | "dark";

/* ── Store externo ────────────────────────────────────────────────
   El tema real vive en el DOM (data-theme) y en localStorage, no en
   React. useSyncExternalStore es la forma correcta de leerlo: entrega
   `null` en el servidor (donde el tema del visitante es desconocido) y
   el valor real apenas hidrata, sin setState dentro de un efecto. */

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  // `storage` dispara cuando el usuario cambia el tema en OTRA pestaña.
  window.addEventListener("storage", onChange);
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", onChange);

  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    mq.removeEventListener("change", onChange);
  };
}

function getSnapshot(): Theme {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  // Sin elección guardada: se refleja la preferencia del sistema.
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** En SSR no hay tema conocido: el botón no se dibuja hasta hidratar. */
const getServerSnapshot = (): Theme | null => null;

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("common");
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = getSnapshot() === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage bloqueado: el tema dura lo que dure la sesión */
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const label = theme === "light" ? t("themeDark") : t("themeLight");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        "relative grid size-9 place-items-center rounded-full",
        "text-ink-muted transition-colors duration-300 hover:text-vivo",
        "hover:bg-[color:var(--av-elevated)]",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme && (
          <motion.span
            key={theme}
            initial={{ opacity: 0, rotate: -70, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 70, scale: 0.6 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="absolute grid place-items-center"
          >
            {theme === "light" ? (
              <Moon className="size-4" strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Sun className="size-4" strokeWidth={1.5} aria-hidden="true" />
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

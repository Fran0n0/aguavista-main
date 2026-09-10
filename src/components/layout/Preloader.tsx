"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { EASE_LUX } from "@/components/motion/Reveal";

/** Solo se muestra una vez por pestaña; navegar de vuelta no lo repite. */
const SESSION_KEY = "av:preloaded";
/** Tope duro: si un asset se cuelga, la cortina se va igual. */
const MAX_DURATION = 2600;
const MIN_DURATION = 900;

/**
 * Cortina de carga.
 *
 * Decisión clave: NO bloquea el render de children. El contenido se
 * pinta y se indexa siempre; esto es solo un overlay fixed que se
 * desvanece. La versión anterior hacía `if (!loaded) return <div/>`, lo
 * que dejaba a los crawlers viendo una página vacía y disparaba el LCP.
 */
export function Preloader() {
  const t = useTranslations("preloader");
  const tc = useTranslations("common");
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      // Modo incógnito con storage bloqueado: se muestra igual.
    }

    /* Excepción deliberada a react-hooks/set-state-in-effect: la decisión
       de mostrar la cortina depende de sessionStorage y de la preferencia
       de movimiento, dos cosas que no existen en el servidor. Arrancar en
       `true` haría que quien ya la vio se coma un flash de cortina antes
       del primer efecto, que es justo lo que se quiere evitar. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    // El scroll queda bloqueado mientras la cortina está arriba.
    document.documentElement.style.overflow = "hidden";

    const start = performance.now();
    let raf = 0;

    /* La barra avanza con el tiempo transcurrido, no con assets
       cargados: da un progreso continuo y honesto en vez de saltar
       de 0 a 100 cuando termina la última imagen. */
    const tick = (now: number) => {
      const pct = Math.min(1, (now - start) / MAX_DURATION);
      setProgress(pct);
      if (pct < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const finish = () => {
      const elapsed = performance.now() - start;
      // Espera mínima para que la animación no parpadee en cache caliente.
      const wait = Math.max(0, MIN_DURATION - elapsed);
      window.setTimeout(() => {
        setProgress(1);
        setVisible(false);
        document.documentElement.style.overflow = "";
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* no crítico */
        }
      }, wait);
    };

    // `load` espera imágenes y videos; el timeout es la red de seguridad.
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    const hardStop = window.setTimeout(finish, MAX_DURATION);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(hardStop);
      window.removeEventListener("load", finish);
      document.documentElement.style.overflow = "";
    };
  }, [reduceMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="preloader"
          role="status"
          aria-live="polite"
          aria-label={tc("loading")}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[color:var(--av-base)]"
          initial={{ opacity: 1 }}
          // La cortina sube revelando la página, en vez de un fade plano.
          exit={{ y: "-100%", transition: { duration: 1.05, ease: EASE_LUX } }}
        >
          {/* Luz de fondo: evita que la cortina se lea como un color liso. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(50% 40% at 50% 45%, color-mix(in oklab, var(--av-base) 90%, transparent) 0%, transparent 70%)",
            }}
          />

          <div className="relative flex flex-col items-center gap-8 px-6 text-center">
            
            {/* ── LOGO OFICIAL ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 1.2, ease: EASE_LUX }}
              className="relative h-12 w-64 md:h-16 md:w-[22rem]"
            >
              <Image
                src="/logo-solari.avif"
                alt="AguaVista · Solari Bienes Raíces"
                fill
                className="av-logo object-contain"
                priority
              />
            </motion.div>

            {/* ── TEXTOS Y BARRA DE PROGRESO ── */}
            <motion.p
              className="max-w-xs font-[family-name:var(--font-josefin)] text-[10px] md:text-xs font-light uppercase leading-relaxed tracking-[0.3em] text-[color:var(--av-lux)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.5 }}
            >
              {t("line1")}
              <br />
              {t("line2")}
            </motion.p>

            {/* Barra de progreso */}
            <div className="mt-2 h-px w-40 overflow-hidden bg-white/10 md:w-56">
              <motion.div
                className="h-full origin-left bg-[color:var(--av-lux)]"
                style={{ scaleX: progress }}
                aria-hidden="true"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
"use client";

import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { EASE_LUX } from "@/components/motion/Reveal";

/**
 * Transición entre páginas.
 *
 * `mode="wait"` haría esperar a que la saliente termine antes de montar
 * la entrante, lo que en App Router deja la pantalla en blanco durante
 * el streaming. Con el modo por defecto las dos conviven un instante:
 * la saliente se desvanece encima mientras la nueva ya está pintando.
 *
 * La cortina es un overlay independiente para que el contenido no cargue
 * con un `transform` (que rompería position:fixed de los hijos).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <AnimatePresence>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_LUX, delay: 0.15 } }}
          className="flex min-h-full flex-1 flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {/* Cortina: barre de abajo hacia arriba al montar la ruta nueva. */}
      <AnimatePresence>
        <motion.div
          key={`curtain-${pathname}`}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[190] origin-bottom bg-base"
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0, transition: { duration: 0.7, ease: EASE_LUX } }}
        />
      </AnimatePresence>
    </>
  );
}

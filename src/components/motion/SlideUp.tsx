"use client";

import { type ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_LUX } from "./Reveal";

/**
 * Jitter determinista.
 *
 * Un stagger perfectamente uniforme (0ms, 60ms, 120ms…) se lee mecánico.
 * Esta función desordena cada retraso un poco, siempre igual para el
 * mismo índice, así el servidor y el cliente calculan lo mismo y no hay
 * mismatch de hidratación. `Math.random()` acá sería un bug.
 */
export function organicDelay(index: number, step = 0.07, spread = 0.35): number {
  // Seno de un número irracional: secuencia sin período visible pero
  // completamente reproducible.
  const noise = Math.sin(index * 12.9898) * 43758.5453;
  const jitter = (noise - Math.floor(noise) - 0.5) * spread * step;
  return Math.max(0, index * step + jitter);
}

type SlideUpProps = {
  children: ReactNode;
  className?: string;
  /** Clases del elemento que se desplaza (el de adentro de la máscara). */
  innerClassName?: string;
  delay?: number;
  duration?: number;
  amount?: number;
  /** Dispara al montar en vez de al entrar en viewport. */
  immediate?: boolean;
  as?: "div" | "span" | "li" | "h2" | "h3" | "p";
};

/**
 * Slide Up Reveal: el contenido sube desde detrás de una máscara.
 *
 * El envoltorio tiene `overflow: hidden` y el hijo entra desde y:110%.
 * El efecto es que el texto emerge desde detrás de una línea invisible,
 * en vez del clásico fade-in que se ve en cualquier plantilla.
 *
 * `pb-[0.15em]` en la máscara evita que se corten los descendentes de
 * las letras (g, y, p, j) cuando se usa sobre tipografía.
 */
export function SlideUp({
  children,
  className,
  innerClassName,
  delay = 0,
  duration = 1,
  amount = 0.3,
  immediate = false,
  as = "div",
}: SlideUpProps) {
  const Tag = motion[as];
  const animateProps = immediate
    ? { animate: "visible" as const }
    : { whileInView: "visible" as const, viewport: { once: true, amount } };

  return (
    <Tag
      data-reveal
      className={cn("overflow-hidden pb-[0.15em]", className)}
      initial="hidden"
      {...animateProps}
      variants={{
        hidden: {},
        visible: { transition: { delayChildren: delay } },
      }}
    >
      <motion.div
        className={innerClassName}
        variants={{
          hidden: { y: "110%", opacity: 0 },
          visible: { y: "0%", opacity: 1, transition: { duration, ease: EASE_LUX } },
        }}
      >
        {children}
      </motion.div>
    </Tag>
  );
}

/* ── Grupo escalonado orgánico ────────────────────────────────────── */

export const organicParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0 } },
};

/**
 * Hijo de <OrganicGroup>. Se le pasa el índice para que calcule su
 * propio retraso con jitter, en vez de depender de `staggerChildren`
 * (que es estrictamente uniforme).
 */
export function organicChild(index: number, step = 0.07): Variants {
  return {
    hidden: { y: 28, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.85, ease: EASE_LUX, delay: organicDelay(index, step) },
    },
  };
}

export function OrganicGroup({
  children,
  className,
  amount = 0.2,
}: {
  children: ReactNode;
  className?: string;
  amount?: number;
}) {
  return (
    <motion.div
      data-reveal
      className={className}
      variants={organicParent}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  );
}

"use client";

import { type ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

/** Curva de lujo: entra rápido y desacelera largo. Nunca lineal. */
export const EASE_LUX = [0.16, 1, 0.3, 1] as const;

type Direction = "up" | "down" | "left" | "right" | "none";

const OFFSET: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 32 },
  down: { x: 0, y: -32 },
  left: { x: 32, y: 0 },
  right: { x: -32, y: 0 },
  none: { x: 0, y: 0 },
};

interface RevealProps {
  children: ReactNode;
  className?: string;
  direction?: Direction;
  delay?: number;
  duration?: number;
  /** Fracción del elemento que debe entrar en viewport para disparar. */
  amount?: number;
  /** Repetir la animación cada vez que vuelve a entrar en viewport. */
  repeat?: boolean;
  as?: "div" | "section" | "article" | "li" | "span";
}

/**
 * Revelado on-scroll. `data-reveal` es el gancho que usa el bloque
 * prefers-reduced-motion de globals.css para dejar el contenido visible
 * en vez de congelarlo en opacity:0 para siempre.
 */
export function Reveal({
  children,
  className,
  direction = "up",
  delay = 0,
  duration = 0.9,
  amount = 0.25,
  repeat = false,
  as = "div",
}: RevealProps) {
  const Tag = motion[as];
  const { x, y } = OFFSET[direction];

  return (
    <Tag
      data-reveal
      className={className}
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: !repeat, amount }}
      transition={{ duration, delay, ease: EASE_LUX }}
    >
      {children}
    </Tag>
  );
}

/* ── Revelado escalonado ───────────────────────────────────────── */

export const staggerParent: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE_LUX },
  },
};

/**
 * Contenedor que escalona a sus hijos. Los hijos deben ser
 * `<motion.* variants={staggerChild}>` para heredar la orquestación.
 */
export function StaggerGroup({
  children,
  className,
  amount = 0.2,
  repeat = false,
}: {
  children: ReactNode;
  className?: string;
  amount?: number;
  repeat?: boolean;
}) {
  return (
    <motion.div
      data-reveal
      className={cn(className)}
      variants={staggerParent}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: !repeat, amount }}
    >
      {children}
    </motion.div>
  );
}

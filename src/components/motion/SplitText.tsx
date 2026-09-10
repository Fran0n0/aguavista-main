"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_LUX } from "./Reveal";
import { organicDelay } from "./SlideUp";

interface SplitTextProps {
  text: string;
  className?: string;
  /** Retraso antes de la primera palabra. */
  delay?: number;
  /** Separación media entre palabras consecutivas. */
  stagger?: number;
  /** Cuánto se desordena el escalonado (0 = perfectamente uniforme). */
  organic?: number;
  /** `true` dispara al montar (hero); `false` al entrar en viewport. */
  immediate?: boolean;
  as?: "h1" | "h2" | "h3" | "p" | "span";
}

/**
 * Revelado palabra por palabra desde abajo, con máscara.
 *
 * Cada palabra vive en un <span> con overflow:hidden y se traslada desde
 * y:110%: el efecto es que el texto "sube desde atrás de una línea".
 * Se separa por palabra y no por letra a propósito — partir por letra
 * rompe la ligadura de la serif y el lector de pantalla deletrea.
 * El texto completo va en aria-label y las palabras quedan aria-hidden.
 *
 * El escalonado es ORGÁNICO: cada palabra recibe un jitter determinista
 * sobre su retraso teórico. Un stagger exacto se percibe mecánico; este
 * respira. Al ser determinista (no `Math.random()`) el servidor y el
 * cliente calculan lo mismo y no hay mismatch de hidratación.
 */
export function SplitText({
  text,
  className,
  delay = 0,
  stagger = 0.055,
  organic = 0.4,
  immediate = false,
  as = "span",
}: SplitTextProps) {
  const Tag = motion[as];
  const words = text.split(" ");

  const animateProps = immediate
    ? { animate: "visible" }
    : { whileInView: "visible", viewport: { once: true, amount: 0.4 } };

  return (
    <Tag
      data-reveal
      aria-label={text}
      className={cn("inline-block", className)}
      initial="hidden"
      {...animateProps}
      // Sin staggerChildren: cada palabra se agenda sola con su propio
      // delay orgánico (ver el variant de más abajo).
      variants={{ hidden: {}, visible: {} }}
    >
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          aria-hidden="true"
          // pb-[0.12em] evita que overflow-hidden corte descendentes (g, y, p).
          // El espacio entre palabras va como margen y no como caracter:
          // dentro de overflow-hidden el navegador lo colapsaria.
          className={cn(
            "inline-block overflow-hidden pb-[0.12em] align-bottom",
            i < words.length - 1 && "mr-[0.26em]"
          )}
        >
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: "110%", opacity: 0 },
              visible: {
                y: "0%",
                opacity: 1,
                transition: {
                  duration: 0.9,
                  ease: EASE_LUX,
                  delay: delay + organicDelay(i, stagger, organic),
                },
              },
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

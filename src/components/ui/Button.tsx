"use client";

import { useRef, useState, type ReactNode, type MouseEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "lux";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  // Lima sólido: la acción principal de la página.
  primary:
    "bg-vivo text-[#08150F] hover:bg-vivo-deep hover:text-[#08150F] shadow-av-glow",
  // Contorno sobre vidrio: acompaña sin competir con la primaria.
  secondary:
    "av-glass text-ink hover:border-[color:var(--av-vivo)] hover:text-vivo",
  ghost: "text-ink-muted hover:text-ink",
  // Oro con filete: reservado para CTAs de alto valor (agendar visita).
  lux: "bg-transparent text-lux border border-[color:var(--av-lux)]/40 hover:border-[color:var(--av-lux)] hover:bg-[color:var(--av-lux)]/10",
};

const SIZES: Record<Size, string> = {
  sm: "text-[10px] px-5 py-2.5 gap-2",
  md: "text-[11px] px-8 py-3.5 gap-2.5",
  lg: "text-xs px-11 py-4.5 gap-3",
};

interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  /** Renderiza un <a>. Los enlaces internos deben usar el Link de i18n. */
  href?: string;
  external?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  /** Desactiva el efecto magnético (útil dentro de listas densas). */
  noMagnet?: boolean;
  "aria-label"?: string;
}

/** Cuántos px se desplaza el botón hacia el cursor, como máximo. */
const MAGNET_STRENGTH = 0.28;

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  href,
  external,
  type = "button",
  disabled,
  loading,
  onClick,
  noMagnet,
  ...rest
}: ButtonProps) {
  const hostRef = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const reduceMotion = useReducedMotion();
  const magnetic = !noMagnet && !reduceMotion && !disabled;

  /**
   * Efecto magnético: el botón se corre hacia el cursor una fracción de
   * la distancia al centro. Se lee en `onMouseMove` del propio elemento,
   * así que no hay listener global ni coste cuando el mouse está lejos.
   */
  const handleMove = (e: MouseEvent<HTMLElement>) => {
    if (!magnetic || !hostRef.current) return;
    const rect = hostRef.current.getBoundingClientRect();
    setOffset({
      x: (e.clientX - (rect.left + rect.width / 2)) * MAGNET_STRENGTH,
      y: (e.clientY - (rect.top + rect.height / 2)) * MAGNET_STRENGTH,
    });
  };

  const handleLeave = () => setOffset({ x: 0, y: 0 });

  const classes = cn(
    "group relative inline-flex items-center justify-center overflow-hidden",
    "font-sans font-medium uppercase tracking-[0.18em] rounded-full",
    "transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
    "disabled:opacity-45 disabled:pointer-events-none select-none",
    VARIANTS[variant],
    SIZES[size],
    className
  );

  const content = (
    <>
      {/* Barrido de brillo en hover: recorre el botón de izquierda a
          derecha. Va en un pseudo-elemento propio para no repintar el
          texto ni disparar layout. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 -translate-x-full",
          "bg-gradient-to-r from-transparent via-white/25 to-transparent",
          "transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          "group-hover:translate-x-full"
        )}
      />
      <span className="relative z-10 flex items-center gap-[inherit]">
        {loading && (
          <span
            aria-hidden="true"
            className="size-3.5 shrink-0 rounded-full border-2 border-current border-r-transparent animate-spin"
          />
        )}
        {children}
      </span>
    </>
  );

  const motionProps = {
    ref: hostRef as never,
    className: classes,
    onMouseMove: handleMove,
    onMouseLeave: handleLeave,
    animate: { x: offset.x, y: offset.y },
    // Resorte suave: vuelve al centro sin rebote elástico barato.
    transition: { type: "spring" as const, stiffness: 220, damping: 22, mass: 0.6 },
    whileTap: disabled ? undefined : { scale: 0.97 },
    ...rest,
  };

  if (href) {
    return (
      <motion.a
        {...motionProps}
        href={href}
        onClick={onClick}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      {...motionProps}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading || undefined}
    >
      {content}
    </motion.button>
  );
}

"use client";

import * as React from "react";
import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useTransform,
  type HTMLMotionProps,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Primitivas de animación atadas al scroll de un contenedor.
 *
 * El contenedor mide su propio avance dentro del viewport y lo publica por
 * contexto; cada primitiva lee ese progreso (0 → 1) y lo mapea a una
 * propiedad: escala, desplazamiento, recorte, radio u opacidad.
 *
 * DOS DIFERENCIAS CON EL SNIPPET ORIGINAL, a propósito:
 *
 * 1. Se importa de `framer-motion`, no de `motion/react`. Es el mismo
 *    paquete —`motion` es el nombre nuevo— y acá está instalado con el
 *    viejo. Cambiar el import es lo único que hacía falta.
 *
 * 2. NO se incluye el hook `useSmoothScroll`. El sitio ya levanta una
 *    instancia global de Lenis en SmoothScrollProvider; montar una segunda
 *    haría que `lenis.raf()` corra dos veces por frame, lo que duplica la
 *    velocidad del scroll y mete micro-jitter (está documentado en
 *    src/components/providers/SmoothScrollProvider.tsx). El scroll suave ya
 *    está resuelto para toda la página, no hace falta pedirlo acá.
 *
 * Todas respetan `prefers-reduced-motion`: con esa preferencia activa
 * quedan quietas en su estado final en vez de moverse con el scroll.
 */

/**
 * Interpolación lineal por tramos, recortada en los extremos.
 *
 * POR QUÉ NO SE USA `useTransform(valor, entrada, salida)` con arrays:
 * cuando se le pasan rangos, framer-motion puede reconocer la animación
 * como "de scroll" y delegarla al navegador con una animación nativa sobre
 * un ViewTimeline. Ese timeline mide otra cosa —cuánto del elemento entró
 * y salió del viewport— y no el avance del contenedor, así que la
 * propiedad deja de seguir al scroll que nos interesa y el valor en JS se
 * congela (se ve como `opacity:0` fijo en el style mientras la pantalla
 * muestra otro número).
 *
 * Con una función, framer no puede convertirla en keyframes y la resuelve
 * en JS cuadro a cuadro. Es la misma cuenta, pero siempre atada al
 * progreso real del contenedor.
 */
function piecewise(value: number, input: number[], output: number[]): number {
  const last = input.length - 1;
  if (value <= input[0]) return output[0];
  if (value >= input[last]) return output[last];

  for (let i = 1; i <= last; i++) {
    if (value <= input[i]) {
      const span = input[i] - input[i - 1];
      const t = span === 0 ? 0 : (value - input[i - 1]) / span;
      return output[i - 1] + t * (output[i] - output[i - 1]);
    }
  }
  return output[last];
}

interface ContainerScrollAnimationContextValue {
  scrollYProgress: MotionValue<number>;
}

const ContainerScrollAnimationContext = React.createContext<
  ContainerScrollAnimationContextValue | undefined
>(undefined);

export function useContainerScrollAnimationContext() {
  const context = React.useContext(ContainerScrollAnimationContext);
  if (!context) {
    throw new Error(
      "useContainerScrollAnimationContext debe usarse dentro de <ContainerScrollAnimation>"
    );
  }
  return context;
}

/**
 * Envoltorio que mide el scroll. El espaciador del final es lo que le da
 * recorrido al efecto: cuanto más alto, más largo dura. Su altura tiene
 * que coincidir con el `yRange` de <ContainerScrollTranslate> para que la
 * pieza se vea clavada en pantalla mientras la página baja.
 */
export function ContainerScrollAnimation({
  spacerClass,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { spacerClass?: string }) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: scrollRef });

  return (
    <ContainerScrollAnimationContext.Provider value={{ scrollYProgress }}>
      <div ref={scrollRef} className={cn("relative", className)} {...props}>
        {children}
        <div aria-hidden="true" className={cn("h-96 w-full", spacerClass)} />
      </div>
    </ContainerScrollAnimationContext.Provider>
  );
}

export function ContainerScrollInsetX({
  insetRange = [48, 0],
  inputRange = [0, 1],
  className,
  style,
  ...props
}: HTMLMotionProps<"div"> & { insetRange?: number[]; inputRange?: number[] }) {
  const { scrollYProgress } = useContainerScrollAnimationContext();
  const reduceMotion = useReducedMotion();
  const xInset = useTransform(scrollYProgress, (v) => piecewise(v, inputRange, insetRange));
  const clipPath = useMotionTemplate`inset(0px ${xInset}px)`;

  return (
    <motion.div
      className={className}
      style={reduceMotion ? style : { clipPath, ...style }}
      {...props}
    />
  );
}

export function ContainerScrollInsetY({
  insetRange = [48, 0],
  inputRange = [0, 1],
  className,
  style,
  ...props
}: HTMLMotionProps<"div"> & { insetRange?: number[]; inputRange?: number[] }) {
  const { scrollYProgress } = useContainerScrollAnimationContext();
  const reduceMotion = useReducedMotion();
  const yInset = useTransform(scrollYProgress, (v) => piecewise(v, inputRange, insetRange));
  const clipPath = useMotionTemplate`inset(${yInset}px 0px)`;

  return (
    <motion.div
      className={className}
      style={reduceMotion ? style : { clipPath, ...style }}
      {...props}
    />
  );
}

export function ContainerScrollInset({
  inputRange = [0, 1],
  insetRangeY = [45, 0],
  insetXRange = [45, 0],
  roundednessRange = [16, 16],
  className,
  style,
  ...props
}: HTMLMotionProps<"div"> & {
  inputRange?: number[];
  insetRangeY?: number[];
  insetXRange?: number[];
  roundednessRange?: number[];
}) {
  const { scrollYProgress } = useContainerScrollAnimationContext();
  const reduceMotion = useReducedMotion();
  const insetY = useTransform(scrollYProgress, (v) => piecewise(v, inputRange, insetRangeY));
  const insetX = useTransform(scrollYProgress, (v) => piecewise(v, inputRange, insetXRange));
  const roundedness = useTransform(scrollYProgress, (v) => piecewise(v, inputRange, roundednessRange));
  const clipPath = useMotionTemplate`inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${roundedness}px)`;

  return (
    <motion.div
      className={className}
      style={reduceMotion ? style : { clipPath, ...style }}
      {...props}
    />
  );
}

export function ContainerScrollTranslate({
  yRange = [0, 384],
  inputRange = [0, 1],
  style,
  className,
  ...props
}: HTMLMotionProps<"div"> & { yRange?: number[]; inputRange?: number[] }) {
  const { scrollYProgress } = useContainerScrollAnimationContext();
  const reduceMotion = useReducedMotion();
  const y = useTransform(scrollYProgress, (v) => piecewise(v, inputRange, yRange));

  return (
    <motion.div
      style={reduceMotion ? style : { y, ...style }}
      className={cn("relative", className)}
      {...props}
    />
  );
}

export function ContainerScrollScale({
  scaleRange = [1.2, 1],
  inputRange = [0, 1],
  className,
  style,
  ...props
}: HTMLMotionProps<"div"> & { scaleRange?: number[]; inputRange?: number[] }) {
  const { scrollYProgress } = useContainerScrollAnimationContext();
  const reduceMotion = useReducedMotion();
  const scale = useTransform(scrollYProgress, (v) => piecewise(v, inputRange, scaleRange));

  return (
    <motion.div
      className={className}
      style={reduceMotion ? style : { scale, ...style }}
      {...props}
    />
  );
}

export function ContainerScrollRadius({
  radiusRange = [9999, 16],
  inputRange = [0, 1],
  className,
  style,
  ...props
}: HTMLMotionProps<"div"> & { radiusRange?: number[]; inputRange?: number[] }) {
  const { scrollYProgress } = useContainerScrollAnimationContext();
  const reduceMotion = useReducedMotion();
  const borderRadius = useTransform(scrollYProgress, (v) => piecewise(v, inputRange, radiusRange));

  return (
    <motion.div
      layout
      className={className}
      style={reduceMotion ? style : { borderRadius, ...style }}
      {...props}
    />
  );
}

/**
 * Agregada al set original: desvanece con el mismo progreso. Se usa para
 * que el texto entre recién cuando la imagen terminó de crecer.
 */
export function ContainerScrollOpacity({
  opacityRange = [0, 1],
  inputRange = [0, 1],
  className,
  style,
  ...props
}: HTMLMotionProps<"div"> & { opacityRange?: number[]; inputRange?: number[] }) {
  const { scrollYProgress } = useContainerScrollAnimationContext();
  const reduceMotion = useReducedMotion();
  const opacity = useTransform(scrollYProgress, (v) => piecewise(v, inputRange, opacityRange));

  return (
    <motion.div
      className={className}
      style={reduceMotion ? style : { opacity, ...style }}
      {...props}
    />
  );
}

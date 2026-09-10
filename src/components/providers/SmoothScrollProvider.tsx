"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import { usePathname } from "next/navigation";

/**
 * Smooth scroll con Lenis sobre el scroll nativo del window.
 *
 * Dos cosas importantes:
 *
 * 1. NO se pasa `wrapper` ni `content`. Lenis sobre un wrapper con
 *    overflow crea un contexto de scroll nuevo y rompe todo
 *    `position: sticky` de la página (el zoom-parallax y los reels
 *    dependen de sticky).
 *
 * 2. `autoRaf: false` + un único requestAnimationFrame propio. La versión
 *    anterior dejaba el autoRaf por defecto (true) Y además corría su
 *    propio loop: `lenis.raf()` se ejecutaba dos veces por frame, lo que
 *    duplicaba la velocidad del scroll y producía micro-jitter.
 */
export default function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Quien pidió menos movimiento se queda con el scroll nativo.
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const lenis = new Lenis({
      lerp: 0.1,
      duration: 1.2,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      // En touch el scroll nativo ya es suave y tiene inercia del sistema:
      // interceptarlo se siente pegajoso y rompe el pull-to-refresh.
      syncTouch: false,
      autoRaf: false,
    });
    lenisRef.current = lenis;

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    /* Los anchors (#contacto) deben viajar por Lenis. Si los maneja el
       navegador, el salto nativo pelea con la posición interpolada de
       Lenis y el scroll queda desincronizado. */
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest?.('a[href^="#"]');
      if (!anchor) return;
      const hash = anchor.getAttribute("href");
      if (!hash || hash === "#") return;
      const target = document.querySelector(hash);
      if (!target) return;

      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -88, duration: 1.4 });
      // La URL se actualiza sin disparar el salto nativo del navegador.
      window.history.pushState(null, "", hash);
    };

    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Al cambiar de ruta el scroll vuelve arriba de inmediato: sin esto
  // Lenis conserva la posición y la página nueva aparece por la mitad.
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
  }, [pathname]);

  // Sin wrapper DOM extra — cualquier div acá crearía un contexto de
  // scroll nuevo y volvería a romper sticky.
  return <>{children}</>;
}

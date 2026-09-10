"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoopVideoProps {
  src: string;
  /**
   * Poster .webp generado por scripts/optimize-media.mjs.
   *
   * Opcional porque los videos que se suben desde /admin viven en el
   * Storage de Supabase y no tienen un .webp hermano; ver posterFor()
   * en src/lib/settings.ts. Sin poster el <video> arranca en negro
   * durante el primer buffer, que es mejor que un 404 visible.
   */
  poster?: string;
  className?: string;
  /** Clases del <video>. El poster de fondo se maneja aparte. */
  videoClassName?: string;
  /**
   * `auto`      reproduce mientras esté en viewport (fondos ambiente).
   * `hover`     solo con el cursor encima Y en viewport (tarjetas).
   * `manual`    nunca arranca solo; se controla con `play`.
   */
  mode?: "auto" | "hover" | "manual";
  /** Para `mode="hover"`: si el contenedor padre está en hover. */
  play?: boolean;
  /**
   * Fracción visible a partir de la cual se considera "en pantalla".
   * Un valor bajo arranca antes de que se vea entero.
   */
  threshold?: number;
  /** Descripción para lectores de pantalla. Si se omite, es decorativo. */
  label?: string;
}

/**
 * Video en loop que solo se reproduce cuando está en pantalla.
 *
 * Por qué importa: un <video autoPlay loop> sigue decodificando aunque
 * esté a tres pantallas de distancia. Con cuatro o cinco reels en la
 * página eso son cuatro decodificadores compitiendo por CPU/GPU contra
 * el scroll, y ahí se van los 60fps. El IntersectionObserver los apaga.
 *
 * También difiere la DESCARGA: `preload="none"` y el <source> se inyecta
 * recién la primera vez que el video entra en viewport, así los MB no se
 * piden hasta que hacen falta.
 */
export function LoopVideo({
  src,
  poster,
  className,
  videoClassName,
  mode = "auto",
  play = false,
  threshold = 0.2,
  label,
}: LoopVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const [inView, setInView] = useState(false);
  // Una vez que entró en viewport, el <source> ya está montado y no se
  // vuelve a quitar: sacarlo forzaría a re-descargar al volver a subir.
  const [mounted, setMounted] = useState(false);

  /* ── ¿Está en pantalla? ── */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setMounted(true);
      },
      // rootMargin positivo: empieza a cargar un poco antes de que el
      // borde superior del video toque el viewport, así no se ve el
      // primer frame llegando tarde.
      { threshold, rootMargin: "200px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  /* ── Play / pause ── */
  const shouldPlay =
    !reduceMotion && inView && (mode === "auto" || (mode === "hover" && play));

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mounted) return;

    if (shouldPlay) {
      // El catch traga el AbortError que tira el navegador cuando el
      // elemento se pausa antes de que la promesa de play() resuelva.
      video.play().catch(() => {});
    } else {
      video.pause();
      // En modo hover se rebobina para que el próximo hover arranque
      // desde el principio; en modo auto se conserva la posición para
      // que al volver a scrollear el loop siga donde estaba.
      if (mode === "hover") video.currentTime = 0;
    }
  }, [shouldPlay, mounted, mode]);

  /* ── Ahorro extra: pausa si la pestaña deja de estar visible ── */
  useEffect(() => {
    const onVisibility = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) video.pause();
      else if (shouldPlay) video.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [shouldPlay]);

  const handleLoaded = useCallback(() => {
    if (shouldPlay) videoRef.current?.play().catch(() => {});
  }, [shouldPlay]);

  return (
    <div ref={wrapRef} className={cn("relative overflow-hidden", className)}>
      <video
        ref={videoRef}
        poster={poster}
        muted
        loop
        playsInline
        // El navegador no pide un solo byte hasta que lo pedimos nosotros.
        preload="none"
        onLoadedData={handleLoaded}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        // translateZ(0) empuja el <video> a su propia capa de composición.
        // Importa cuando algo lo mueve por scroll (el parallax del hero):
        // sin capa propia, cada frame del video invalida el pintado del
        // contenedor entero. backface-visibility corta un repintado extra
        // que hacen WebKit y Gecko sobre capas transformadas.
        style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}
        className={cn("size-full object-cover", videoClassName)}
      >
        {mounted && <source src={src} type="video/mp4" />}
      </video>
    </div>
  );
}

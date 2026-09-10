'use client';

import Image from 'next/image';

import InkReveal from '@/components/ui/ink-reveal';
import { LoopVideo } from '@/components/ui/LoopVideo';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

/** Fallback: los cuatro micro-loops que viven en /public. */
const DEFAULT_REELS = ['/reel.mp4', '/reel-1.mp4', '/reel-2.mp4', '/reel-3.mp4'];

/**
 * Los cuatro reels llegan por props desde el server component de la
 * pagina, que los resuelve con getSettings(). Eso permite reemplazarlos
 * desde /admin/media sin tocar codigo. `posters` viaja aparte porque
 * derivarlo aca con un replace() rompia para las URLs de Supabase, que
 * no tienen un .webp hermano.
 */
export default function VerticalReels({
  reels = DEFAULT_REELS,
  posters,
}: {
  reels?: string[];
  posters?: (string | undefined)[];
} = {}) {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // Cada reel viaja junto a su poster para no tener que reconstruir la
  // ruta dentro del JSX (que es lo que rompia con las URLs remotas).
  const clips = reels.map((src, i) => ({ src, poster: posters?.[i] }));


  // ── PARALLAX DEL TEXTO ────────────────────────────────────────────────────
  // useScroll sobre la sección completa para que el texto se mueva
  // visiblemente mientras el usuario scrollea a través de los reels.
  // El texto se desplaza hacia arriba (-150px) a medida que la sección
  // pasa por el viewport — esto crea el efecto de "acompañar el scroll".
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // En desktop: el texto recorre toda la sección de arriba a abajo.
  // Empieza fuera del viewport por arriba (negativo = arriba de la sección)
  // y termina fuera del viewport por abajo.
  // El rango de desplazamiento es grande para que el texto viaje
  // desde el inicio hasta el final de la sección de reels.
  const textY = useTransform(scrollYProgress, [0, 1], [-150, 1350]);
  // ── FIN PARALLAX ──────────────────────────────────────────────────────────
  // ── FIN PARALLAX ──────────────────────────────────────────────────────────

  return (
    /*
     * CONTENEDOR PRINCIPAL
     * relative w-full min-h-screen h-auto bg-black
     * SIN overflow-hidden
     */
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen h-auto bg-black cursor-crosshair"
    >

      {/*
       * CAPA DE FONDO — absolute inset-0 h-full w-full z-0
       * Se estira exactamente hasta donde llegue el contenido del <section>
       * SIN sticky ni h-screen
       */}
      <div className="absolute inset-0 h-full w-full z-0 pointer-events-none">
        <Image
          src="/foto-9.webp"
          alt="Vista del paisaje de AguaVista al atardecer"
          fill
          loading="lazy"
          sizes="100vw"
          quality={55}
          className="object-cover object-center opacity-40"
        />
        <InkReveal
          maskColor={[12, 12, 12]}
          brushSize={350}
          className="absolute inset-0 z-10"
          style={{ pointerEvents: 'none', touchAction: 'none' }}
        />
      </div>

      {/*
       * CONTENEDOR DE CONTENIDO
       *
       * ARQUITECTURA DEFINITIVA:
       * — Mobile (base): flex-col. El texto (order-1) aparece arriba y fluye
       *   naturalmente. Los reels (order-2) aparecen debajo.
       *
       * — Desktop (md+): CSS Grid de 2 columnas [40% | 1fr].
       *   El texto ocupa la columna izquierda con un parallax de Framer Motion
       *   (useScroll + useTransform) que lo hace moverse visiblemente mientras
       *   el usuario scrollea. Los reels ocupan la columna derecha.
       *
       * DIAGNÓSTICO FINAL DEL PROBLEMA:
       * El texto era demasiado corto (~300px) comparado con la sección
       * (~3000px). Aunque se movía con el scroll, el movimiento era tan
       * pequeño que era imperceptible. La solución es usar un parallaxñ
       * explícito con useTransform para que el texto se desplace
       * visiblemente (100px → -200px) durante el recorrido de la sección.
       */}
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:grid md:grid-cols-[40%_1fr] md:items-start px-4 md:px-10">

        {/* TEXTO — Contenedor nativo STICKY, 100% libre de bugs */}
        <div
          ref={textRef}
          className="relative w-full py-16
                      md:col-start-1 md:row-start-1 md:self-start
                      flex flex-col justify-start md:justify-center md:pr-10
                      order-1 pointer-events-none md:sticky md:top-0 md:h-screen"
        >
          {/* Wrapper desktop */}
          <div className="hidden md:flex flex-col">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              className="text-[var(--av-lux)] uppercase tracking-[0.2em] text-sm mb-4 font-semibold drop-shadow-md"
            >
              EL NUEVO LUJO
            </motion.h2>

            <motion.h3
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: 0.1 }}
              className="text-4xl lg:text-6xl text-white font-serif leading-tight drop-shadow-2xl"
            >
              Tener tiempo. Tener espacio.<br/>Tener libertad para elegir<br/>cómo vivir cada día.
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: 0.2 }}
              className="text-white/60 mt-6 text-base lg:text-lg max-w-md font-light leading-relaxed"
            >
              Eso es AguaVista.
            </motion.p>
          </div>

          {/* Wrapper Mobile */}
          <div className="flex flex-col md:hidden">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              className="text-[var(--av-lux)] uppercase tracking-[0.2em] text-xs mb-3 font-semibold drop-shadow-md"
            >
              EL NUEVO LUJO
            </motion.h2>

            <motion.h3
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: 0.1 }}
              className="text-3xl text-white font-serif leading-tight drop-shadow-2xl"
            >
              Tener tiempo. Tener espacio.<br/>Tener libertad para elegir<br/>cómo vivir cada día.
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: 0.2 }}
              className="text-white/60 mt-4 text-sm max-w-md font-light leading-relaxed"
            >
              Eso es AguaVista.
            </motion.p>
          </div>
        </div>

        {/*
         * REELS — Mobile: order-2 (debajo del texto)
         *         Desktop: col-start-2, dicta la altura total de la fila del grid
         */}
        <div className="w-full h-auto md:col-start-2 md:row-start-1 pointer-events-auto order-2">

          {/* Mobile: 2 columnas compactas */}
          <div className="flex md:hidden gap-3 py-10">
            {/* Columna 1 */}
            <div className="flex flex-col gap-3 w-1/2 mt-8">
              {[clips[0], clips[2]].map(({ src, poster }) => (
                <motion.div
                  key={src}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="relative w-full aspect-[9/16] rounded-xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.9)] border border-white/5"
                >
                  {/* Solo reproduce mientras la columna esta en pantalla:
                      cuatro reels decodificando a la vez se comen los 60fps. */}
                  <LoopVideo
                    src={src}
                    poster={poster}
                    className="absolute inset-0 w-full h-full"
                  />
                </motion.div>
              ))}
            </div>
            {/* Columna 2 */}
            <div className="flex flex-col gap-3 w-1/2">
              {[clips[1], clips[3]].map(({ src, poster }) => (
                <motion.div
                  key={src}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="relative w-full aspect-[9/16] rounded-xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.9)] border border-white/5"
                >
                  {/* Solo reproduce mientras la columna esta en pantalla:
                      cuatro reels decodificando a la vez se comen los 60fps. */}
                  <LoopVideo
                    src={src}
                    poster={poster}
                    className="absolute inset-0 w-full h-full"
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Desktop: 2 columnas desfasadas con más espacio */}
          <div className="hidden md:flex gap-8 py-32">
            {/* Columna 1 de Reels (Arranca más abajo) */}
            <div className="flex flex-col gap-10 w-1/2 mt-32">
              {[clips[0], clips[2]].map(({ src, poster }) => (
                <motion.div
                  key={src}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.9)] border border-white/5"
                >
                  {/* Solo reproduce mientras la columna esta en pantalla:
                      cuatro reels decodificando a la vez se comen los 60fps. */}
                  <LoopVideo
                    src={src}
                    poster={poster}
                    className="absolute inset-0 w-full h-full"
                  />
                </motion.div>
              ))}
            </div>

            {/* Columna 2 de Reels (Arranca más arriba) */}
            <div className="flex flex-col gap-10 w-1/2">
              {[clips[1], clips[3]].map(({ src, poster }) => (
                <motion.div
                  key={src}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.9)] border border-white/5"
                >
                  {/* Solo reproduce mientras la columna esta en pantalla:
                      cuatro reels decodificando a la vez se comen los 60fps. */}
                  <LoopVideo
                    src={src}
                    poster={poster}
                    className="absolute inset-0 w-full h-full"
                  />
                </motion.div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

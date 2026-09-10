"use client";

import Image from "next/image";
import { SplitText } from "@/components/motion/SplitText";
import { SlideUp } from "@/components/motion/SlideUp";
import {
  ContainerScrollAnimation,
  ContainerScrollOpacity,
  ContainerScrollScale,
  ContainerScrollTranslate,
} from "@/components/ui/scroll-trigger-animations";

/**
 * La imagen del collage se abre con el scroll.
 *
 * Reemplaza al zoom-parallax de siete piezas: acá hay una sola imagen —la
 * central de antes— que entra chica y crece hasta su tamaño natural
 * mientras la página baja. Mismo comportamiento en escritorio y en
 * teléfono; no hay una variante por dispositivo.
 *
 * CÓMO SE REGULA LA DURACIÓN
 * El efecto dura lo que mide el espaciador del contenedor. Más px = efecto
 * más largo y lento. El desplazamiento del bloque tiene que ser IGUAL a esa
 * altura para que la pieza se vea clavada en pantalla mientras se agranda,
 * así que si cambiás uno cambiá el otro.
 *
 * La clase va escrita entera y no interpolada (`h-[${n}px]`) porque
 * Tailwind lee el código como texto: una clase armada en tiempo de
 * ejecución no llega a generarse nunca.
 */
const SPACER_PX = 544;
const SPACER_CLASS = "h-[544px]";

/** Imagen central del collage anterior, 1280×514. */
const IMAGE = "/collagemed.webp";
const IMAGE_W = 1280;
const IMAGE_H = 514;

export function ExperienceScroll() {
  return (
    <section className="relative w-full bg-base">
      <Intro />

      <ContainerScrollAnimation spacerClass={SPACER_CLASS}>
        <ContainerScrollTranslate
          yRange={[0, SPACER_PX]}
          className="flex h-dvh flex-col items-center justify-center gap-7 px-5 md:gap-10 md:px-10"
        >
          <ContainerScrollScale
            scaleRange={[0.4, 1]}
            className="w-full max-w-[1100px] overflow-hidden rounded-2xl shadow-av-lg md:rounded-3xl"
          >
            <Image
              src={IMAGE}
              alt="Golf, náutica, playa, spa y eventos dentro de AguaVista"
              width={IMAGE_W}
              height={IMAGE_H}
              quality={80}
              sizes="(max-width: 1100px) 92vw, 1100px"
              className="h-auto w-full"
            />
          </ContainerScrollScale>

          {/* El texto entra recién cuando la imagen ya casi terminó de
              abrirse, para que no compita con el movimiento. Rango de dos
              puntos: fuera de él useTransform recorta al extremo, así que
              antes de 0.55 queda en 0 y después de 0.9 en 1. */}
          <ContainerScrollOpacity
            inputRange={[0.55, 0.9]}
            opacityRange={[0, 1]}
          >
            <Headline />
          </ContainerScrollOpacity>
        </ContainerScrollTranslate>
      </ContainerScrollAnimation>
    </section>
  );
}

/* ── Intro: la antesala antes de que se abra la imagen ─────────────────── */
function Intro() {
  return (
    <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-6 text-center md:px-10">
      <SlideUp
        className="relative"
        innerClassName="mb-7 text-[9px] font-medium uppercase tracking-[0.42em] text-[color:var(--av-vivo)] md:mb-9 md:text-[11px] md:tracking-[0.5em]"
      >
        Una categoría propia
      </SlideUp>

      <div className="relative mx-auto flex max-w-[95%] flex-col items-center md:max-w-4xl">
        <SplitText
          as="h2"
          text="No se trata de tenerlo todo."
          delay={0.15}
          className="relative text-balance text-[clamp(1.6rem,4.6vw,3.5rem)] font-light leading-[1.08] tracking-[-0.01em] text-ink"
        />

        <p className="mt-2 text-balance text-[clamp(2.1rem,6.4vw,5rem)] font-light italic leading-[1.08] tracking-[-0.02em] text-vivo md:mt-3">
          Se trata de vivir donde todo es posible.
        </p>
      </div>
    </div>
  );
}

/* ── Headline: cierra la escena debajo de la imagen ──────────────────────
   Antes iba sobre un velo negro y por eso llevaba los colores fijos
   (blanco y lima). Ahora se apoya en el fondo de la página, que en tema
   claro es crema: va con los tokens del tema o quedaría ilegible. */
function Headline() {
  return (
    <div className="flex max-w-3xl flex-col items-center text-center">
      <span className="mb-4 text-[9px] font-medium uppercase tracking-[0.42em] text-lux md:mb-5 md:text-[11px] md:tracking-[0.5em]">
        Una experiencia integral
      </span>

      <h3 className="text-balance font-light leading-[1.08]">
        <span className="block text-[clamp(1.4rem,3.6vw,2.5rem)] font-light tracking-[-0.01em] text-ink">
          Encontrá todo
        </span>
        <span className="mt-1 block text-[clamp(1.8rem,5vw,3.4rem)] font-light italic tracking-[-0.02em] text-vivo">
          en un mismo lugar
        </span>
      </h3>
    </div>
  );
}

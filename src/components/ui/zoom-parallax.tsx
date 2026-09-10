'use client';

import {
    useScroll,
    useTransform,
    motion,
    useReducedMotion,
} from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';

import { SplitText } from '@/components/motion/SplitText';
import { SlideUp } from '@/components/motion/SlideUp';

interface ImgData {
    src: string;
    alt?: string;
    /** Ignorado: la primera imagen del array es siempre la del centro. */
    isCenter?: boolean;
}

interface ZoomParallaxProps {
    /** Máximo 7 imágenes. La primera es la que hace zoom a pantalla completa. */
    images: ImgData[];
}

/*
|------------------------------------------------------------------------------
| COLLAGE
|------------------------------------------------------------------------------
|
| Tamaño y posición de cada tile — valores del diseño original (21st.dev).
| La del índice 0 arranca centrada y termina llenando la pantalla; las demás
| quedan alrededor y se van de cuadro a medida que todo hace zoom.
|
*/
/*
| En MOBILE el collage es una grilla ordenada de 4 filas, todas alineadas
| al mismo ancho útil (13vw..87vw) y con 2vh de aire entre filas:
|
|        [ ——— panorámica ——— ]      fila A
|        [ tile ]  [ tile ]          fila B
|        [ ——— CENTRO ——— ]          fila C  (sin offset: es la que hace zoom)
|        [ tile ]  [ tile ]          fila D
|
| La central NO lleva offset vertical a propósito: escala desde su propio
| centro, y si estuviera corrida no llegaría a cubrir la pantalla entera.
| Con 22vh de alto, al ×5 da 110vh — cubre con margen.
|
| En `md:` vuelven las posiciones sueltas del diseño original, que en una
| pantalla ancha sí funcionan.
*/
const TILE = [
    'h-[22vh] w-[80vw] md:h-[26vh] md:w-[26vw]',
    '-top-[36vh] h-[13vh] w-[80vw] md:-top-[30vh] md:left-[5vw] md:h-[30vh] md:w-[35vw]',
    '-top-[20vh] -left-[21vw] h-[16vh] w-[38vw] md:-top-[10vh] md:-left-[25vw] md:h-[45vh] md:w-[20vw]',
    '-top-[20vh] left-[21vw] h-[16vh] w-[38vw] md:top-0 md:left-[27.5vw] md:h-[25vh] md:w-[25vw]',
    'top-[22.5vh] -left-[21vw] h-[21vh] w-[38vw] md:top-[27.5vh] md:left-[5vw] md:h-[25vh] md:w-[20vw]',
    'top-[22.5vh] left-[21vw] h-[21vh] w-[38vw] md:top-[27.5vh] md:-left-[22.5vw] md:h-[25vh] md:w-[30vw]',
    'top-[40vh] h-[10vh] w-[40vw] md:top-[22.5vh] md:left-[25vw] md:h-[15vh] md:w-[15vw]',
];

/* Escala final de cada tile. La central (índice 0) llega justo a cubrir la
   pantalla con un poco de margen; el resto son las del original. */
const MAX_SCALE = [5, 5, 6, 5, 6, 8, 9];

/* Punto del scroll donde el zoom TERMINA. De ahí en adelante la escena
   queda quieta: imagen central al máximo, oscurecida y desenfocada, con
   el texto encima. El resto del scroll es solo tiempo de lectura. */
const ZOOM_END = 0.62;

export function ZoomParallax({ images }: ZoomParallaxProps) {
    const reduceMotion = useReducedMotion();

    const galleryRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: galleryRef,
        offset: ['start start', 'end end'],
    });

    /* useTransform no puede ir en un loop; se declaran los 7 sí o sí.
       Todas frenan en ZOOM_END y mantienen su escala hasta el final. */
    const ramp = [0, ZOOM_END, 1];
    const s0 = useTransform(scrollYProgress, ramp, [1, MAX_SCALE[0], MAX_SCALE[0]]);
    const s1 = useTransform(scrollYProgress, ramp, [1, MAX_SCALE[1], MAX_SCALE[1]]);
    const s2 = useTransform(scrollYProgress, ramp, [1, MAX_SCALE[2], MAX_SCALE[2]]);
    const s3 = useTransform(scrollYProgress, ramp, [1, MAX_SCALE[3], MAX_SCALE[3]]);
    const s4 = useTransform(scrollYProgress, ramp, [1, MAX_SCALE[4], MAX_SCALE[4]]);
    const s5 = useTransform(scrollYProgress, ramp, [1, MAX_SCALE[5], MAX_SCALE[5]]);
    const s6 = useTransform(scrollYProgress, ramp, [1, MAX_SCALE[6], MAX_SCALE[6]]);
    const scales = [s0, s1, s2, s3, s4, s5, s6];

    /*
    |--------------------------------------------------------------------------
    | OSCURECIMIENTO + TEXTO
    |--------------------------------------------------------------------------
    |
    | Todo atado al scroll (sin trinquete): bajando se oscurece y desenfoca
    | hasta el tope y ahí se queda; subiendo se vuelve a aclarar. El texto
    | entra ANTES de que el zoom termine y queda centrado en la imagen.
    |
    */
    // Las de alrededor se van antes de que el centro tome toda la pantalla,
    // para que no asomen por los bordes.
    const peripheralOpacity = useTransform(
        scrollYProgress,
        [0, 0.2, 0.42, 1],
        [1, 1, 0, 0]
    );

    // Oscurecimiento del fondo: tope 60%, alcanzado junto con el zoom máximo.
    const centerDarkness = useTransform(
        scrollYProgress,
        [0, 0.34, ZOOM_END, 1],
        [0, 0, 0.6, 0.6]
    );

    // Desenfoque "chill" del fondo: la foto se difumina mientras se oscurece,
    // así el texto queda limpio y legible encima.
    const blurPx = useTransform(
        scrollYProgress,
        [0, 0.36, ZOOM_END, 1],
        [0, 0, 9, 9]
    );
    const backdropBlur = useTransform(blurPx, (v) => `blur(${v}px)`);

    // El texto entra un poco antes de que el zoom llegue al tope.
    const textOpacity = useTransform(
        scrollYProgress,
        [0, 0.28, 0.5, 1],
        [0, 0, 1, 1]
    );

    const textY = useTransform(
        scrollYProgress,
        [0, 0.28, 0.5, 1],
        [30, 30, 0, 0]
    );

    const tiles = images.slice(0, 7);

    /*
    |--------------------------------------------------------------------------
    | SIN MOVIMIENTO (prefers-reduced-motion)
    |--------------------------------------------------------------------------
    */
    if (reduceMotion) {
        const hero = tiles[0];
        return (
            <section className="relative w-full bg-[color:var(--av-base)]">
                <Intro />
                <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4">
                    <div className="relative h-[62vh] w-full max-w-[1100px] overflow-hidden rounded-2xl shadow-av-lg">
                        {hero && (
                            <Image
                                src={hero.src}
                                alt={hero.alt || ''}
                                fill
                                priority
                                className="object-cover"
                                sizes="(max-width: 1100px) 92vw, 1100px"
                            />
                        )}
                        <div className="absolute inset-0 bg-black/60" />
                    </div>
                    <div className="absolute inset-x-0 top-[16vh] flex justify-center px-6">
                        <Headline />
                    </div>
                </div>
            </section>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | CON MOVIMIENTO
    |--------------------------------------------------------------------------
    */
    return (
        <section className="relative w-full bg-[color:var(--av-base)]">
            <Intro />

            <div ref={galleryRef} className="relative z-20 h-[260vh]">
                <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden bg-[color:var(--av-base)]">
                    {tiles.map((img, i) => (
                        <motion.div
                            key={i}
                            style={{
                                scale: scales[i],
                                opacity: i === 0 ? 1 : peripheralOpacity,
                            }}
                            className={`absolute inset-0 flex items-center justify-center ${
                                i === 0 ? 'z-30' : 'z-10'
                            }`}
                        >
                            <div
                                className={`relative overflow-hidden rounded-xl shadow-av-lg md:rounded-2xl ${TILE[i]}`}
                            >
                                <Image
                                    src={img.src}
                                    alt={img.alt || ''}
                                    fill
                                    priority={i === 0}
                                    quality={75}
                                    className="object-cover"
                                    sizes={i === 0 ? '100vw' : '45vw'}
                                />
                            </div>
                        </motion.div>
                    ))}

                    {/* Desenfoque del FONDO — capa a pantalla completa que
                        difumina lo que hay detrás mientras baja el scroll. */}
                    <motion.div
                        style={{
                            backdropFilter: backdropBlur,
                            WebkitBackdropFilter: backdropBlur,
                        }}
                        className="pointer-events-none absolute inset-0 z-40"
                    />

                    {/* Oscurecimiento del FONDO — tope 60%. Se oscurece al
                        bajar y se vuelve a aclarar al subir. */}
                    <motion.div
                        style={{ opacity: centerDarkness }}
                        className="pointer-events-none absolute inset-0 z-40 bg-black"
                    />

                    {/* Texto CENTRADO sobre la imagen del medio. Entra un poco
                        antes de que el zoom llegue al tope. */}
                    <motion.div
                        style={{ opacity: textOpacity, y: textY }}
                        className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center px-6"
                    >
                        <Headline />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

/* ── Intro: la antesala antes del zoom ─────────────────────────────────── */
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
                    className="relative text-balance text-[clamp(1.6rem,4.6vw,3.5rem)] font-light leading-[1.08] tracking-[-0.01em] text-[color:var(--av-text)]"
                />

                <p className="mt-2 text-balance text-[clamp(2.1rem,6.4vw,5rem)] font-light italic leading-[1.08] tracking-[-0.02em] text-[color:var(--av-vivo)] md:mt-3">
                    Se trata de vivir donde todo es posible.
                </p>
            </div>
        </div>
    );
}

/* ── Headline: el texto que aparece sobre la imagen central ──────────────
   Mismo juego de color que el hero (blanco + lima en itálica), pero en
   Montserrat y en peso liviano: la escala hace el contraste, no el grosor. */
function Headline({ className = '' }: { className?: string }) {
    return (
        <div
            className={`flex max-w-5xl flex-col items-center text-center ${className}`}
        >
            {/* Colores fijos (no tokens): esta capa siempre va sobre el
                scrim negro al 60%, así que el lima del tema claro —que es
                oscuro— acá desaparecería. Mismo lima que el hero. */}
            <span className="mb-5 text-[9px] font-medium uppercase tracking-[0.42em] text-[#C8E88A] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] md:mb-7 md:text-[11px] md:tracking-[0.5em]">
                Una experiencia integral
            </span>

            <h3 className="text-balance font-light leading-[1.08] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
                <span className="block text-[clamp(1.6rem,4.6vw,3.5rem)] font-light tracking-[-0.01em] text-white">
                    Encontrá todo
                </span>
                <span className="mt-1 block text-[clamp(2.1rem,6.4vw,5rem)] font-light italic tracking-[-0.02em] text-[#C8E88A] md:mt-2">
                    en un mismo lugar
                </span>
            </h3>
        </div>
    );
}

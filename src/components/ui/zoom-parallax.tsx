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
import { EASE_LUX } from '@/components/motion/Reveal';
import { ScrollTiltedGrid } from '@/components/ui/scroll-tilted-grid';

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

    /* En MOBILE se cae la imagen central —la que hace el zoom— y quedan
       solo las de alrededor, que suben en la grilla inclinada. El collage
       con zoom sigue intacto de `md:` para arriba. */
    const mobileTiles = tiles.slice(1);

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
                <MobileScene tiles={mobileTiles} />
                <div className="relative hidden min-h-screen w-full items-center justify-center overflow-hidden px-4 md:flex">
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

            <MobileScene tiles={mobileTiles} />

            <div
                ref={galleryRef}
                className="relative z-20 hidden h-[260vh] md:block"
            >
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
                                    /* Sin `priority`: en mobile este bloque
                                       está oculto y la central se bajaría al
                                       pedo. Queda en diferido, que llega de
                                       sobra: arriba hay dos pantallas. */
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

/* ── Escena MOBILE: grilla inclinada en lugar del collage ────────────────
   Las fotos suben de a pares, se enderezan al pasar por el centro y se
   vuelcan al salir. El titular no va debajo: queda fijo en el medio de la
   pantalla y aparece ENCIMA de las fotos, igual que en escritorio pasa
   sobre la imagen central. Primero se ven imágenes, después entra el
   texto, y se va antes de que termine la sección. */
function MobileScene({ tiles }: { tiles: ImgData[] }) {
    const sceneRef = useRef<HTMLDivElement>(null);
    /* El recorrido se mide desde que la escena asoma por abajo hasta que
       termina de salir por arriba, y no solo mientras está pegada: así el
       texto puede entrar antes de que la grilla llegue al tope y quedarse
       hasta que las últimas fotos se están yendo. */
    const { scrollYProgress } = useScroll({
        target: sceneRef,
        offset: ['start end', 'end start'],
    });

    const textOpacity = useTransform(
        scrollYProgress,
        [0.12, 0.24, 0.7, 0.84],
        [0, 1, 1, 0]
    );
    const textY = useTransform(scrollYProgress, [0.12, 0.24], [28, 0]);

    return (
        <div ref={sceneRef} className="relative md:hidden">
            <ScrollTiltedGrid images={tiles} />

            {/* El bloque se ancla a 36vh en vez de ocupar la pantalla entera:
                así queda pegado más tiempo (la escena mide poco más que un
                viewport) y nunca se sale de la sección, con lo cual no puede
                pisar lo que viene abajo. */}
            <div className="pointer-events-none absolute inset-0 z-20">
                <motion.div
                    style={{ opacity: textOpacity, y: textY }}
                    className="sticky top-[36vh] flex justify-center px-6"
                >
                    {/* Halo propio, no un velo a pantalla completa. Va suave
                        a propósito: apenas despega el texto de la foto, sin
                        tapar lo que hay detrás. El degradado hace de máscara
                        para que el borde no se note. */}
                    <div
                        aria-hidden="true"
                        className="absolute -inset-x-10 -inset-y-28 backdrop-blur-[2px] [mask-image:radial-gradient(62%_52%_at_50%_50%,#000_0%,#000_42%,transparent_100%)]"
                    />
                    <div
                        aria-hidden="true"
                        className="absolute -inset-x-10 -inset-y-28 bg-[radial-gradient(62%_52%_at_50%_50%,rgba(3,10,7,0.55)_0%,rgba(3,10,7,0.3)_42%,rgba(3,10,7,0)_100%)]"
                    />
                    <div className="relative">
                        <Headline />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

/* ── Intro: la antesala antes del zoom ───────────────────────────────────
   La frase en itálica es el remate de la sección y antes entraba sin
   animación, mientras la de arriba sí se revelaba: quedaba muerta. Ahora
   el bloque se arma en capas —volanta, línea que se dibuja, primera
   frase palabra por palabra y remate que sube detrás de una máscara— y
   cuando termina de asentarse le cruza un destello por encima de las
   letras. Abajo, un pulso descendente invita a seguir bajando. */

const INTRO_CLOSER = 'Se trata de vivir donde todo es posible.';

/* Mismas clases en la capa base y en la del destello: son el mismo texto
   superpuesto, y cualquier diferencia los desalinearía. */
const CLOSER_TYPE =
    'text-balance text-[clamp(2.1rem,6.4vw,5rem)] font-light italic leading-[1.08] tracking-[-0.02em]';

function Intro() {
    const reduceMotion = useReducedMotion();
    const introRef = useRef<HTMLDivElement>(null);

    /* Deriva atada al scroll: el bloque se va elevando y apagando a medida
       que la sección sale. Sin esto el texto queda clavado y la pantalla
       se siente congelada. */
    const { scrollYProgress } = useScroll({
        target: introRef,
        offset: ['start start', 'end start'],
    });
    const driftY = useTransform(scrollYProgress, [0, 1], [0, -70]);
    const driftOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
    const cueOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0]);

    return (
        <div
            ref={introRef}
            className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-6 text-center md:px-10"
        >
            <motion.div
                style={
                    reduceMotion ? undefined : { y: driftY, opacity: driftOpacity }
                }
                className="flex flex-col items-center"
            >
                <SlideUp
                    className="relative"
                    innerClassName="text-[9px] font-medium uppercase tracking-[0.42em] text-[color:var(--av-vivo)] md:text-[11px] md:tracking-[0.5em]"
                >
                    Una categoría propia
                </SlideUp>

                {/* Hilo que se dibuja desde el centro: separa la volanta del
                    titular y da el primer movimiento de la secuencia. */}
                <motion.span
                    aria-hidden="true"
                    initial={{ scaleX: 0, opacity: 0 }}
                    whileInView={{ scaleX: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 1.2, ease: EASE_LUX, delay: 0.25 }}
                    className="mt-6 h-px w-16 bg-gradient-to-r from-transparent via-[color:var(--av-vivo)] to-transparent md:mt-8 md:w-24"
                />

                <div className="relative mx-auto mt-7 flex max-w-[95%] flex-col items-center md:mt-9 md:max-w-4xl">
                    <SplitText
                        as="h2"
                        text="No se trata de tenerlo todo."
                        delay={0.45}
                        className="relative text-balance text-[clamp(1.6rem,4.6vw,3.5rem)] font-light leading-[1.08] tracking-[-0.01em] text-[color:var(--av-text)]"
                    />

                    {/* El remate sube entero detrás de la máscara, después de
                        la primera frase: primero la premisa, después la
                        respuesta. */}
                    <SlideUp
                        className="mt-2 md:mt-3"
                        delay={1.05}
                        duration={1.15}
                        amount={0.4}
                        innerClassName="relative"
                    >
                        <p className={`${CLOSER_TYPE} text-[color:var(--av-vivo)]`}>
                            {INTRO_CLOSER}
                        </p>

                        {/* Destello: una copia exacta del texto recortada
                            contra un degradado que lo cruza. Al ir con
                            `bg-clip-text` la luz pasa por las letras y no por
                            una caja, que es lo que lo haría ver barato. */}
                        {!reduceMotion && (
                            <motion.p
                                aria-hidden="true"
                                className={`${CLOSER_TYPE} pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_38%,rgba(255,255,255,0.92)_50%,transparent_62%)] bg-[length:260%_100%] bg-clip-text text-transparent`}
                                initial={{ backgroundPosition: '170% 0%' }}
                                whileInView={{ backgroundPosition: '-70% 0%' }}
                                viewport={{ once: true, amount: 0.4 }}
                                transition={{
                                    duration: 1.9,
                                    ease: 'easeInOut',
                                    delay: 2.1,
                                }}
                            >
                                {INTRO_CLOSER}
                            </motion.p>
                        )}
                    </SlideUp>
                </div>

                {/* Señal de scroll: un pulso que baja por un hilo. Se apaga
                    apenas la persona empieza a bajar, así no compite con el
                    contenido. */}
                <motion.span
                    aria-hidden="true"
                    style={reduceMotion ? undefined : { opacity: cueOpacity }}
                    className="relative mt-14 block h-14 w-px overflow-hidden bg-[color:var(--av-text)]/12 md:mt-16"
                >
                    {!reduceMotion && (
                        <motion.span
                            className="absolute inset-x-0 block h-5 bg-[color:var(--av-vivo)]"
                            initial={{ y: '-100%' }}
                            animate={{ y: '280%' }}
                            transition={{
                                duration: 2.2,
                                ease: 'easeInOut',
                                repeat: Infinity,
                                repeatDelay: 0.5,
                                delay: 2.4,
                            }}
                        />
                    )}
                </motion.span>
            </motion.div>
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
            {/* Colores fijos (no tokens): esta capa siempre va sobre un velo
                oscuro —el scrim del zoom en escritorio, el degradado radial
                en mobile—, así que el lima del tema claro, que es oscuro,
                acá desaparecería. Mismo lima que el hero. */}
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

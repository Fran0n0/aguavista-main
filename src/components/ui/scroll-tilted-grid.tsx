'use client';

import {
    cubicBezier,
    motion,
    useMotionTemplate,
    useReducedMotion,
    useScroll,
    useTransform,
} from 'framer-motion';
import Image from 'next/image';
import { useRef } from 'react';

/*
|------------------------------------------------------------------------------
| GRILLA INCLINADA POR SCROLL
|------------------------------------------------------------------------------
|
| Adaptación del patrón "scroll tilted grid" (21st.dev) al proyecto: las fotos
| suben desde abajo inclinadas hacia adelante, se enderezan al pasar por el
| centro de la pantalla y se van volcando por arriba al salir.
|
| Se usa SOLO en mobile, en lugar del collage con zoom: en una pantalla
| angosta el collage tiene que achicar tanto los tiles que se pierde la foto.
|
| Diferencias con el original: next/image en vez de background-image (así las
| fotos se sirven en el tamaño que corresponde y cargan en diferido) y sin
| modo `loop`, porque acá la lista es fija y una sección infinita dejaría el
| resto de la página inalcanzable.
*/

const easeIntoFocus = cubicBezier(0.22, 1, 0.36, 1);
const easeOutOfFocus = cubicBezier(0, 0, 0.58, 1);
const focusEase: [typeof easeIntoFocus, typeof easeOutOfFocus] = [
    easeIntoFocus,
    easeOutOfFocus,
];

/** Perspectiva de cada tile, en px. */
const PERSPECTIVE = 900;
/** Inclinación máxima (grados) en la entrada y la salida. */
const MAX_TILT = 62;
/** Desenfoque máximo (px) en la entrada y la salida. */
const MAX_BLUR = 7;

export interface TiltedImage {
    src: string;
    alt?: string;
}

interface ScrollTiltedGridProps {
    images: readonly TiltedImage[];
    /** `aspect-ratio` de cada tile. Por defecto 4/5 (vertical suave). */
    aspectRatio?: string;
    className?: string;
}

type Side = 'L' | 'R';

function Tile({
    image,
    side,
    aspectRatio,
}: {
    image: TiltedImage;
    side: Side;
    aspectRatio: string;
}) {
    const ref = useRef<HTMLElement>(null);

    /* El progreso se mide contra el viewport: 0 cuando el tile asoma por
       abajo, 0.5 cuando está centrado, 1 cuando termina de salir. */
    const { scrollYProgress: p } = useScroll({
        target: ref,
        offset: ['start end', 'end start'],
    });

    const sign = side === 'L' ? -1 : 1;

    const blur = useTransform(p, [0, 0.5, 1], [MAX_BLUR, 0, MAX_BLUR], {
        ease: focusEase,
    });
    const bright = useTransform(p, [0, 0.5, 1], [0.35, 1, 0.35], {
        ease: focusEase,
    });

    const ty = useTransform(p, [0, 0.5, 1], ['60%', '0%', '-60%'], {
        ease: focusEase,
    });
    const tz = useTransform(p, [0, 0.5, 1], [260, 0, 260], { ease: focusEase });
    const rx = useTransform(p, [0, 0.5, 1], [MAX_TILT, 0, -MAX_TILT], {
        ease: focusEase,
    });

    const tx = useTransform(
        p,
        [0, 0.5, 1],
        [`${sign * 26}%`, '0%', `${sign * 26}%`],
        { ease: focusEase }
    );
    const rot = useTransform(p, [0, 0.5, 1], [-sign * 5, 0, sign * 5], {
        ease: focusEase,
    });

    /* Estirón vertical de la foto dentro del marco: acompaña la inclinación
       y evita que se vea "plana" cuando el tile está tumbado. */
    const innerScaleY = useTransform(p, [0, 0.5, 1], [1.5, 1, 1.5], {
        ease: focusEase,
    });

    const filter = useMotionTemplate`blur(${blur}px) brightness(${bright})`;

    return (
        <motion.figure
            ref={ref}
            className="relative z-10 m-0"
            style={{ perspective: PERSPECTIVE }}
        >
            <motion.div
                className="relative w-full overflow-hidden rounded-xl shadow-av-lg will-change-[filter,transform]"
                style={{
                    aspectRatio,
                    filter,
                    x: tx,
                    y: ty,
                    z: tz,
                    rotate: rot,
                    rotateX: rx,
                }}
            >
                <motion.div
                    className="absolute inset-0 will-change-transform"
                    style={{ scaleY: innerScaleY, backfaceVisibility: 'hidden' }}
                >
                    <Image
                        src={image.src}
                        alt={image.alt || ''}
                        fill
                        quality={72}
                        sizes="45vw"
                        className="object-cover"
                    />
                </motion.div>
            </motion.div>
        </motion.figure>
    );
}

export function ScrollTiltedGrid({
    images,
    aspectRatio = '4/5',
    className,
}: ScrollTiltedGridProps) {
    const reduceMotion = useReducedMotion();

    /* Sin movimiento: la misma grilla, quieta y sin filtros. */
    if (reduceMotion) {
        return (
            <section
                className={['relative w-full', className]
                    .filter(Boolean)
                    .join(' ')}
            >
                <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-4 px-5 py-[10vh]">
                    {images.map((image) => (
                        <figure
                            key={image.src}
                            className="relative m-0 overflow-hidden rounded-xl shadow-av-lg"
                            style={{ aspectRatio }}
                        >
                            <Image
                                src={image.src}
                                alt={image.alt || ''}
                                fill
                                quality={72}
                                sizes="45vw"
                                className="object-cover"
                            />
                        </figure>
                    ))}
                </div>
            </section>
        );
    }

    return (
        /* `overflow-hidden` acá adentro y no en el contenedor de la escena:
           los tiles se desplazan fuera de su celda y, sin recorte, asoman
           en la sección siguiente. Va en la <section> para no romper el
           position:sticky del titular, que es hermano de este bloque. */
        <section
            className={['relative w-full overflow-hidden', className]
                .filter(Boolean)
                .join(' ')}
        >
            {/* py alto a propósito: cada tile necesita recorrido de scroll
                para completar el ciclo entrar → enfocar → volcarse. */}
            <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-6 px-5 py-[26vh]">
                {images.map((image, i) => (
                    <Tile
                        key={image.src}
                        image={image}
                        side={i % 2 === 0 ? 'L' : 'R'}
                        aspectRatio={aspectRatio}
                    />
                ))}
            </div>
        </section>
    );
}

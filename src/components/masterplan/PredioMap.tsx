'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
    animate,
    motion,
    useMotionValue,
    useScroll,
    useSpring,
    useTransform,
    type MotionValue,
} from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { Flag, Leaf, Maximize2, Plane, Sailboat, TreePine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EASE_LUX } from '@/components/motion/Reveal';
import {
    GOLF,
    LAKES,
    LAND,
    RUNWAY,
    TREES,
    VIEWBOX,
    VIEWBOX_ATTR,
    WATER,
    ZONE_ANCHORS,
    ZONE_DIVIDERS,
    ZONE_SHAPES,
    type ZoneId,
} from './predio';

/*
|------------------------------------------------------------------------------
| MAPA ANIMADO DEL PREDIO
|------------------------------------------------------------------------------
|
| Dibujo en SVG con la forma real del plano (ver predio.ts). Es un tablero
| que flota en 3D:
|
|   - Con el SCROLL (lo que manda en el celular) el tablero aterriza: llega
|     inclinado y girado, se endereza, el perímetro se dibuja solo, los
|     sectores se van encendiendo de a uno y un avión carretea por la pista y
|     despega al ritmo del dedo.
|   - Con el MOUSE (compu) el tablero se inclina siguiendo el cursor y el
|     sector que está debajo se ilumina.
|   - Siempre hay vida: barcos que navegan el río y un avión de paso.
|
| Al elegir un sector el tablero se aplana y hace zoom sobre él; aplanarlo es
| lo que permite que el encuadre quede centrado.
*/

/* ─── Sectores ─────────────────────────────────────────────────────────── */

export type ZoneMeta = { id: ZoneId; Icon: LucideIcon; accent: string };

/** El orden es el de la lista del panel y el de encendido en el mapa. */
export const ZONES: readonly ZoneMeta[] = [
    { id: 'botanico', Icon: Leaf, accent: '#34D399' },
    { id: 'nautica', Icon: Sailboat, accent: '#38BDF8' },
    { id: 'aeropuerto', Icon: Plane, accent: '#FACC15' },
    { id: 'greenbar', Icon: Flag, accent: '#A3E635' },
    { id: 'tekoha', Icon: TreePine, accent: '#FB923C' },
];

/** Cuánto acerca el mapa al elegir un sector. 1 = sin zoom. */
const ZOOM = 1.45;

/** Escala de reposo del tablero: deja aire para que la inclinación 3D no
    choque contra los bordes del recuadro. */
const BOARD_SCALE = 0.93;

/* ─── Geometría derivada ───────────────────────────────────────────────── */

/** "x,y x,y …" → path cerrado. */
const toPath = (points: string) => `M${points.trim().split(/\s+/).join('L')}Z`;
const LAND_PATH = toPath(LAND);
const WATER_PATH = toPath(WATER);

/** Coordenada del plano → % del recuadro, para ubicar las etiquetas HTML. */
const pct = (x: number, y: number) => ({
    left: ((x - VIEWBOX.x) / VIEWBOX.w) * 100,
    top: ((y - VIEWBOX.y) / VIEWBOX.h) * 100,
});

const RW_DX = RUNWAY.x2 - RUNWAY.x1;
const RW_DY = RUNWAY.y2 - RUNWAY.y1;
const RW_LEN = Math.hypot(RW_DX, RW_DY);
/** Redondeo a una décima. Los valores que terminan en una transformación
    tienen que escribirse igual en el servidor y en el cliente: framer
    serializa distinto los decimales largos y React lo marca como error de
    hidratación. */
const r1 = (n: number) => Math.round(n * 10) / 10;

const RW_ANGLE = r1((Math.atan2(RW_DY, RW_DX) * 180) / Math.PI);
/** Un poco más ancha que la del plano: a escala real, en un celular es un
    hilo de 5px y el avión no tendría dónde apoyarse. */
const RW_W = RUNWAY.width + 5;
const alongRunway = (t: number) =>
    [r1(RUNWAY.x1 + RW_DX * t), r1(RUNWAY.y1 + RW_DY * t)] as const;

/* Despegue: carretea desde la cabecera sudoeste, rota al 78% de la pista y
   sale trepando más allá de la cabecera noreste. */
const [TAKEOFF_X0, TAKEOFF_Y0] = alongRunway(0.06);
const [TAKEOFF_X1, TAKEOFF_Y1] = alongRunway(0.78);
const TAKEOFF_X2 = r1(RUNWAY.x2 + (RW_DX / RW_LEN) * 180);
const TAKEOFF_Y2 = r1(RUNWAY.y2 + (RW_DY / RW_LEN) * 180);

/* ─── Recorridos ───────────────────────────────────────────────────────── */

type Pt = readonly [number, number];
type Route = { x: number[]; y: number[]; rotate: number[]; times: number[] };

/**
 * Convierte una lista de puntos en keyframes: tiempos proporcionales a la
 * distancia (velocidad pareja) y rumbo según la dirección de cada tramo.
 * Los ángulos se "desenrollan" para que un giro de 170° a −170° no dé la
 * vuelta entera. En los recorridos cerrados el rumbo final se iguala al
 * inicial, así el loop empalma sin un volantazo.
 */
function route(points: readonly Pt[], closed = false): Route {
    const legs = points
        .slice(1)
        .map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
    const total = legs.reduce((a, b) => a + b, 0);
    let run = 0;
    const times = [0, ...legs.map((d) => r1(((run += d) / total) * 1000) / 1000)];

    const rotate: number[] = [];
    points.forEach((p, i) => {
        const last = i === points.length - 1;
        const [a, b] = last ? [points[i - 1], p] : [p, points[i + 1]];
        let deg = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
        if (last && closed) deg = rotate[0];
        if (rotate.length) {
            const prev = rotate[rotate.length - 1];
            while (deg - prev > 180) deg -= 360;
            while (deg - prev < -180) deg += 360;
        }
        rotate.push(r1(deg));
    });

    return {
        x: points.map((p) => p[0]),
        y: points.map((p) => p[1]),
        rotate,
        times,
    };
}

/* Todos los puntos de los barcos caen sobre el agua, del lado oeste de la
   orilla real; ninguno cruza el muelle ni la marina. */
const SAILBOAT = route(
    [[112, 318], [72, 430], [96, 560], [140, 468], [160, 360], [112, 318]],
    true
);
const MOTORBOAT = route([
    [152, 712], [112, 748], [84, 800], [46, 850], [30, 930], [20, 1010], [16, 1080],
]);
const YACHT = route([
    [12, 1110], [16, 1000], [22, 900], [38, 780], [62, 700], [88, 630],
]);
/* Avión de paso por el cielo vacío del noreste, lejos de la pista para no
   competir con el que despega. */
const CRUISER = route([[1090, 420], [980, 395], [720, 330], [570, 298]]);

/** Ondas del río: puntos de arranque de cada trazo, todos sobre el agua. */
const WAVES: readonly Pt[] = [
    [40, 300], [150, 300], [100, 390], [30, 470], [120, 520], [70, 640],
    [140, 610], [30, 720], [100, 700], [60, 800], [20, 880], [10, 960],
];

/* ─── Piezas ───────────────────────────────────────────────────────────── */

/*
 * Cada vehículo se dibuja apuntando a +x y centrado en (0,0), con un
 * rectángulo invisible simétrico que fija su caja. Framer aplica las
 * transformaciones SVG con transform-box: fill-box y origen en el centro de
 * esa caja: si la caja no estuviera centrada (la estela la estira hacia
 * atrás), el barco giraría alrededor de un punto corrido y bailaría.
 */

const PLANE_D =
    'M17 0C17 -1.2 15.6 -2 14 -2L4.5 -2L-2 -13.5L-5.4 -13.5L-2.2 -2L-9.6 -2L-12.2 -6.2L-14.8 -6.2L-13.4 0L-14.8 6.2L-12.2 6.2L-9.6 2L-2.2 2L-5.4 13.5L-2 13.5L4.5 2L14 2C15.6 2 17 1.2 17 0Z';

function PlaneShape({ fill }: { fill: string }) {
    return (
        <g>
            <rect x={-17} y={-14} width={34} height={28} fill="none" />
            <path d={PLANE_D} fill={fill} />
        </g>
    );
}

function SailboatShape() {
    return (
        <g>
            <rect x={-24} y={-10} width={48} height={20} fill="none" />
            <path
                d="M-11 -2L-24 -6M-11 2L-24 6"
                stroke="#dff3fb"
                strokeWidth={1.1}
                strokeLinecap="round"
                opacity={0.55}
            />
            <path d="M13 0C9 -4.2 -2 -4.6 -11 -3.2L-11 3.2C-2 4.6 9 4.2 13 0Z" fill="#f7faf8" />
            <path d="M5 -0.6L-6 -10L-6 -0.6Z" fill="#fdfdfb" opacity={0.95} />
            <line x1={-6} y1={-0.6} x2={5} y2={-0.6} stroke="#9fb1b8" strokeWidth={0.8} />
        </g>
    );
}

function MotorboatShape() {
    return (
        <g>
            <rect x={-26} y={-8} width={52} height={16} fill="none" />
            <path
                d="M-10 -2.5L-26 -7M-10 2.5L-26 7"
                stroke="#e6f6fc"
                strokeWidth={1.3}
                strokeLinecap="round"
                opacity={0.6}
            />
            <path d="M14 0C11 -4 1 -4.6 -10 -3.6L-10 3.6C1 4.6 11 4 14 0Z" fill="#fbfcfb" />
            <rect x={-5} y={-2.4} width={9} height={4.8} rx={1.4} fill="#16303b" />
        </g>
    );
}

function YachtShape() {
    return (
        <g>
            <rect x={-30} y={-9} width={60} height={18} fill="none" />
            <path
                d="M-14 -3L-30 -8M-14 3L-30 8"
                stroke="#e6f6fc"
                strokeWidth={1.2}
                strokeLinecap="round"
                opacity={0.5}
            />
            <path d="M18 0C14 -5.6 0 -6.2 -14 -5L-14 5C0 6.2 14 5.6 18 0Z" fill="#fbfcfb" />
            <path d="M8 0C6 -3.2 -2 -3.6 -9 -3L-9 3C-2 3.6 6 3.2 8 0Z" fill="#dfe6e9" />
            <rect x={-6} y={-1.8} width={8} height={3.6} rx={1} fill="#1b3440" />
        </g>
    );
}

/**
 * Mueve un vehículo por un recorrido en loop. Los recorridos abiertos
 * aparecen y desaparecen en las puntas para que el reinicio no se vea como
 * un salto. Con movimiento reducido queda quieto a mitad de camino.
 */
function Mover({
    path,
    duration,
    delay = 0,
    repeatDelay = 0,
    closed = false,
    scale = 1,
    still,
    children,
}: {
    path: Route;
    duration: number;
    delay?: number;
    repeatDelay?: number;
    closed?: boolean;
    scale?: number;
    still: boolean;
    children: ReactNode;
}) {
    const n = path.x.length;

    if (still) {
        const i = Math.floor((n - 1) / 2);
        return (
            <g
                transform={`translate(${path.x[i]} ${path.y[i]}) rotate(${path.rotate[i]}) scale(${scale})`}
                pointerEvents="none"
            >
                {children}
            </g>
        );
    }

    const opacity = Array.from({ length: n }, (_, i) =>
        closed || (i > 0 && i < n - 1) ? 1 : 0
    );

    return (
        <motion.g
            initial={{ x: path.x[0], y: path.y[0], rotate: path.rotate[0], scale, opacity: opacity[0] }}
            animate={{ x: path.x, y: path.y, rotate: path.rotate, opacity }}
            transition={{
                duration,
                delay,
                repeatDelay,
                repeat: Infinity,
                ease: 'linear',
                times: path.times,
            }}
            pointerEvents="none"
        >
            {children}
        </motion.g>
    );
}

/** Pista con plataforma y hangares al sur de la cabecera. Estática. */
function Runway() {
    return (
        <g transform={`translate(${RUNWAY.x1} ${RUNWAY.y1}) rotate(${RW_ANGLE})`}>
            <rect x={52} y={RW_W / 2 + 5} width={72} height={16} rx={2.5} fill="#242a2e" />
            {[56, 77, 98].map((x) => (
                <rect key={x} x={x} y={RW_W / 2 + 24} width={16} height={10} rx={1.5} fill="#c7cdd2" />
            ))}
            <rect
                x={-6}
                y={-RW_W / 2}
                width={RW_LEN + 12}
                height={RW_W}
                rx={3}
                fill="#2a2f33"
                stroke="#646c72"
                strokeWidth={0.8}
            />
            <line
                x1={20}
                y1={0}
                x2={RW_LEN - 20}
                y2={0}
                stroke="#f2f6ef"
                strokeWidth={1.3}
                strokeDasharray="10 8"
                opacity={0.85}
            />
            {[-6, -2, 2, 6].map((o) => (
                <g key={o} stroke="#f2f6ef" strokeWidth={1.1}>
                    <line x1={0} x2={10} y1={o} y2={o} />
                    <line x1={RW_LEN - 10} x2={RW_LEN} y1={o} y2={o} />
                </g>
            ))}
        </g>
    );
}

/** Tinte de un sector. Se enciende escalonado con el scroll. */
function ZoneFill({
    zone,
    index,
    reveal,
    alpha,
    onHover,
    onSelect,
}: {
    zone: ZoneMeta;
    index: number;
    reveal: MotionValue<number>;
    alpha: number;
    onHover: (id: ZoneId | null) => void;
    onSelect: (id: ZoneId) => void;
}) {
    const appear = useTransform(reveal, [index * 0.12, index * 0.12 + 0.4], [0, 1]);

    return (
        <motion.polygon
            points={ZONE_SHAPES[zone.id]}
            fill={zone.accent}
            initial={false}
            animate={{ fillOpacity: alpha }}
            transition={{ duration: 0.4, ease: EASE_LUX }}
            style={{ opacity: appear, cursor: 'pointer' }}
            onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(zone.id)}
            onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
            onClick={() => onSelect(zone.id)}
        />
    );
}

/* ─── Componente ───────────────────────────────────────────────────────── */

interface PredioMapProps {
    activeId: ZoneId | null;
    onSelect: (id: ZoneId) => void;
    onReset: () => void;
    /** Nombre de cada sector, ya traducido. */
    labels: Record<ZoneId, string>;
    ariaLabel: string;
    resetLabel: string;
}

export function PredioMap({
    activeId,
    onSelect,
    onReset,
    labels,
    ariaLabel,
    resetLabel,
}: PredioMapProps) {
    const reduceMotion = usePrefersReducedMotion();

    /* useId trae caracteres que rompen url(#…) en algunos navegadores. */
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const ids = {
        land: `predio-land-${uid}`,
        water: `predio-water-${uid}`,
        waterFill: `predio-water-fill-${uid}`,
        blur: `predio-blur-${uid}`,
    };

    const [hovered, setHovered] = useState<ZoneId | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);

    /* ── Scroll ──
       0 = el mapa asoma por abajo, 1 = terminó de salir por arriba. El
       aterrizaje se completa hacia 0.45, cuando el mapa está en el centro
       de la pantalla. */
    const { scrollYProgress } = useScroll({
        target: wrapRef,
        offset: ['start end', 'end start'],
    });
    const tiltIn = useTransform(scrollYProgress, [0.05, 0.45], [56, 20]);
    const spinIn = useTransform(scrollYProgress, [0.05, 0.45], [-12, 0]);
    const liftIn = useTransform(scrollYProgress, [0.05, 0.45], [0.8, BOARD_SCALE]);
    const outline = useTransform(scrollYProgress, [0.1, 0.4], [0, 1]);
    const reveal = useTransform(scrollYProgress, [0.18, 0.46], [0, 1]);
    const labelsIn = useTransform(scrollYProgress, [0.34, 0.46], [0, 1]);
    /* Arranca apenas el tablero termina de aterrizar y despega antes de que
       el mapa se vaya por arriba: la pista está en la parte alta del mapa, y
       con un rango más tardío el despegue pasaba fuera de pantalla. */
    const takeoff = useTransform(scrollYProgress, [0.3, 0.66], [0, 1]);

    /* ── Mouse ── inclinación extra que sigue al cursor, con resorte. */
    const mouseTiltX = useSpring(0, { stiffness: 120, damping: 18, mass: 0.6 });
    const mouseTiltY = useSpring(0, { stiffness: 120, damping: 18, mass: 0.6 });

    /* ── Aplanado ── 1 mientras hay un sector elegido. */
    const flat = useMotionValue(0);
    useEffect(() => {
        const controls = animate(flat, activeId ? 1 : 0, { duration: 0.9, ease: EASE_LUX });
        return () => controls.stop();
    }, [activeId, flat]);

    const rotateX = useTransform(
        [tiltIn, mouseTiltX, flat],
        ([t, m, f]: number[]) => (t + m) * (1 - f)
    );
    const rotateY = useTransform([mouseTiltY, flat], ([m, f]: number[]) => m * (1 - f));
    const rotateZ = useTransform([spinIn, flat], ([s, f]: number[]) => s * (1 - f));
    const boardScale = useTransform(
        [liftIn, flat],
        ([l, f]: number[]) => l + (BOARD_SCALE - l) * f
    );

    /* ── Avión que despega con el scroll ──
       La sombra queda en el piso: mientras rueda va pegada al avión y
       cuando trepa se separa y se achica, que es lo que vende la altura. */
    const planeX = useTransform(takeoff, [0, 0.72, 1], [TAKEOFF_X0, TAKEOFF_X1, TAKEOFF_X2]);
    const planeY = useTransform(takeoff, [0, 0.72, 1], [TAKEOFF_Y0, TAKEOFF_Y1, TAKEOFF_Y2]);
    const planeScale = useTransform(takeoff, [0, 0.72, 1], [1, 1.05, 1.9]);
    const planeAlpha = useTransform(takeoff, [0, 0.9, 1], [1, 1, 0]);
    const shadowX = useTransform(takeoff, [0, 0.72, 1], [TAKEOFF_X0 + 2, TAKEOFF_X1 + 2, TAKEOFF_X2 + 34]);
    const shadowY = useTransform(takeoff, [0, 0.72, 1], [TAKEOFF_Y0 + 3, TAKEOFF_Y1 + 3, TAKEOFF_Y2 + 58]);
    const shadowScale = useTransform(takeoff, [0, 0.72, 1], [1, 1.05, 0.9]);
    const shadowAlpha = useTransform(takeoff, [0, 0.72, 1], [0.45, 0.45, 0]);

    /* Con movimiento reducido todo queda en su estado final, quieto. */
    const full = useMotionValue(1);

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (reduceMotion || e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        mouseTiltX.set(-ny * 12);
        mouseTiltY.set(nx * 14);
    };

    const handlePointerLeave = () => {
        mouseTiltX.set(0);
        mouseTiltY.set(0);
        setHovered(null);
    };

    /* ── Zoom sobre el sector elegido ──
       Con origen en el centro, `translate(t) scale(s)` lleva un punto p a
       centro + s·(p − centro) + t; para dejarlo en el centro, t = −s·(p − 50)
       en % del propio elemento, que es como framer interpreta x/y en %. */
    const anchor = activeId ? ZONE_ANCHORS[activeId] : null;
    const zoom = anchor && !reduceMotion ? ZOOM : 1;
    const at = anchor ? pct(anchor.x, anchor.y) : null;
    const frame = at
        ? { scale: zoom, x: `${-zoom * (at.left - 50)}%`, y: `${-zoom * (at.top - 50)}%` }
        : { scale: 1, x: '0%', y: '0%' };

    const zoneAlpha = (id: ZoneId) => {
        /* 0.5 y no más: con el tinte más fuerte, las calles de golf del
           sector elegido se perdían contra el fondo. */
        if (activeId) return id === activeId ? 0.5 : 0.1;
        return hovered === id ? 0.5 : 0.27;
    };

    return (
        <div
            ref={wrapRef}
            className="relative w-full overflow-hidden rounded-2xl"
            style={{ aspectRatio: `${VIEWBOX.w} / ${VIEWBOX.h}`, perspective: 1400 }}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
        >
            {/* Tablero: inclinación 3D (scroll + mouse). */}
            <motion.div
                className="absolute inset-0 will-change-transform"
                style={
                    reduceMotion
                        ? { scale: BOARD_SCALE, transformStyle: 'preserve-3d' }
                        : {
                              rotateX,
                              rotateY,
                              rotateZ,
                              scale: boardScale,
                              transformStyle: 'preserve-3d',
                          }
                }
            >
                {/* Encuadre: el zoom sobre el sector elegido. */}
                <motion.div
                    className="absolute inset-0"
                    animate={frame}
                    transition={{ duration: 0.9, ease: EASE_LUX }}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Sombra y espesor del tablero. Van en un SVG aparte que
                        nunca cambia: el blur es caro y, si compartiera SVG con
                        los barcos, se recalcularía en cada cuadro. */}
                    <svg
                        viewBox={VIEWBOX_ATTR}
                        className="absolute inset-0 size-full overflow-visible"
                        aria-hidden="true"
                    >
                        <defs>
                            <filter id={ids.blur} x="-15%" y="-15%" width="130%" height="130%">
                                <feGaussianBlur stdDeviation="16" />
                            </filter>
                        </defs>
                        <g transform="translate(16 36)" filter={`url(#${ids.blur})`} opacity={0.55}>
                            <path d={WATER_PATH} fill="#000" />
                            <path d={LAND_PATH} fill="#000" />
                        </g>
                        <g transform="translate(0 12)">
                            <path d={WATER_PATH} fill="#062330" />
                            <path d={LAND_PATH} fill="#08140d" />
                        </g>
                    </svg>

                    <svg
                        viewBox={VIEWBOX_ATTR}
                        className="absolute inset-0 size-full overflow-visible"
                        role="img"
                        aria-label={ariaLabel}
                    >
                        <defs>
                            <linearGradient id={ids.waterFill} x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0" stopColor="#0e3b4f" />
                                <stop offset="1" stopColor="#15566f" />
                            </linearGradient>
                            <clipPath id={ids.land}>
                                <path d={LAND_PATH} />
                            </clipPath>
                            <clipPath id={ids.water}>
                                <path d={WATER_PATH} />
                            </clipPath>
                        </defs>

                        {/* ── Río ── */}
                        <path d={WATER_PATH} fill={`url(#${ids.waterFill})`} />
                        <g clipPath={`url(#${ids.water})`} pointerEvents="none">
                            <motion.g
                                animate={reduceMotion ? undefined : { x: [0, 12, 0] }}
                                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                {WAVES.map(([x, y]) => (
                                    <path
                                        key={`${x}-${y}`}
                                        d={`M${x} ${y}q7 -4 14 0t14 0`}
                                        fill="none"
                                        stroke="#bfe6f5"
                                        strokeWidth={1.2}
                                        strokeLinecap="round"
                                        opacity={0.28}
                                    />
                                ))}
                            </motion.g>
                        </g>
                        <text
                            transform="translate(46 612) rotate(-80)"
                            fill="#cdeaf6"
                            fillOpacity={0.4}
                            fontSize={15}
                            letterSpacing={9}
                            fontWeight={300}
                            pointerEvents="none"
                        >
                            PARANÁ
                        </text>

                        {/* ── Terreno y sectores ── */}
                        <path d={LAND_PATH} fill="#1d3527" />
                        <g clipPath={`url(#${ids.land})`}>
                            {ZONES.map((zone, i) => (
                                <ZoneFill
                                    key={zone.id}
                                    zone={zone}
                                    index={i}
                                    reveal={reduceMotion ? full : reveal}
                                    alpha={zoneAlpha(zone.id)}
                                    onHover={setHovered}
                                    onSelect={onSelect}
                                />
                            ))}
                        </g>

                        {/* ── Detalles del plano ── */}
                        <motion.g
                            style={{ opacity: reduceMotion ? full : reveal }}
                            pointerEvents="none"
                        >
                            {GOLF.map((points) => (
                                <polygon
                                    key={points.slice(0, 16)}
                                    points={points}
                                    fill="#7cc757"
                                    stroke="#b1e68a"
                                    strokeWidth={0.8}
                                    strokeOpacity={0.55}
                                />
                            ))}
                            {LAKES.map((points) => (
                                <polygon
                                    key={points.slice(0, 16)}
                                    points={points}
                                    fill="#2f8fcf"
                                    stroke="#8fd3f5"
                                    strokeWidth={0.8}
                                    strokeOpacity={0.7}
                                />
                            ))}
                            {TREES.map(([x, y, r], i) => (
                                <g key={`${x}-${y}`}>
                                    <circle cx={x + 1.6} cy={y + 2.2} r={r} fill="#07120b" opacity={0.5} />
                                    <circle cx={x} cy={y} r={r} fill={i % 3 ? '#2f6e45' : '#3a8052'} />
                                    <circle
                                        cx={x - r * 0.3}
                                        cy={y - r * 0.3}
                                        r={r * 0.45}
                                        fill="#6fbf85"
                                        opacity={0.45}
                                    />
                                </g>
                            ))}
                            <Runway />
                            {ZONE_DIVIDERS.map((points) => (
                                <polyline
                                    key={points}
                                    points={points}
                                    fill="none"
                                    stroke="#e9f5d8"
                                    strokeOpacity={0.35}
                                    strokeWidth={1.2}
                                    strokeDasharray="5 5"
                                />
                            ))}
                        </motion.g>

                        {/* ── Perímetro que se dibuja solo ── */}
                        <motion.path
                            d={LAND_PATH}
                            fill="none"
                            stroke="#eaf7d6"
                            strokeWidth={2.2}
                            strokeLinejoin="round"
                            style={{ pathLength: reduceMotion ? full : outline }}
                            pointerEvents="none"
                        />

                        {/* ── Rosa de los vientos ── */}
                        <g transform="translate(925 300)" opacity={0.7} pointerEvents="none">
                            <path
                                d="M0 -24L5 -5L24 0L5 5L0 24L-5 5L-24 0L-5 -5Z"
                                fill="none"
                                stroke="#dfe9d2"
                                strokeWidth={1.2}
                            />
                            <path d="M0 -24L5 -5L0 0L-5 -5Z" fill="#dfe9d2" />
                            <text y={-31} textAnchor="middle" fontSize={11} fill="#dfe9d2">
                                N
                            </text>
                        </g>

                        {/* ── Barcos ── */}
                        <Mover path={SAILBOAT} duration={30} closed still={reduceMotion}>
                            <SailboatShape />
                        </Mover>
                        <Mover path={MOTORBOAT} duration={17} delay={2} repeatDelay={1} still={reduceMotion}>
                            <MotorboatShape />
                        </Mover>
                        <Mover path={YACHT} duration={34} delay={5} repeatDelay={2} still={reduceMotion}>
                            <YachtShape />
                        </Mover>

                        {/* ── Aviones ── */}
                        <Mover
                            path={CRUISER}
                            duration={18}
                            delay={3}
                            repeatDelay={5}
                            scale={1.5}
                            still={reduceMotion}
                        >
                            <PlaneShape fill="#f2f6ef" />
                        </Mover>

                        <motion.g
                            style={
                                reduceMotion
                                    ? { x: TAKEOFF_X0 + 2, y: TAKEOFF_Y0 + 3, rotate: RW_ANGLE, opacity: 0.45 }
                                    : {
                                          x: shadowX,
                                          y: shadowY,
                                          rotate: RW_ANGLE,
                                          scale: shadowScale,
                                          opacity: shadowAlpha,
                                      }
                            }
                            pointerEvents="none"
                        >
                            <PlaneShape fill="#000" />
                        </motion.g>
                        <motion.g
                            style={
                                reduceMotion
                                    ? { x: TAKEOFF_X0, y: TAKEOFF_Y0, rotate: RW_ANGLE }
                                    : {
                                          x: planeX,
                                          y: planeY,
                                          rotate: RW_ANGLE,
                                          scale: planeScale,
                                          opacity: planeAlpha,
                                      }
                            }
                            pointerEvents="none"
                        >
                            <PlaneShape fill="#ffffff" />
                        </motion.g>
                    </svg>

                    {/* ── Etiquetas de sector ──
                        HTML y no SVG: son botones de verdad (teclado, lector de
                        pantalla, 44px de área táctil). El translateZ las hace
                        flotar por encima del tablero cuando se inclina. */}
                    {ZONES.map((zone) => {
                        const a = ZONE_ANCHORS[zone.id];
                        const p = pct(a.x, a.y);
                        const isActive = zone.id === activeId;
                        const lit = isActive || zone.id === hovered;
                        const dimmed = activeId !== null && !isActive;

                        return (
                            <button
                                key={zone.id}
                                type="button"
                                onClick={() => onSelect(zone.id)}
                                onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(zone.id)}
                                onPointerLeave={(e) => e.pointerType === 'mouse' && setHovered(null)}
                                aria-pressed={isActive}
                                aria-controls="masterplan-zone-panel"
                                className="group absolute grid place-items-center p-2 outline-none"
                                style={{
                                    left: `${p.left}%`,
                                    top: `${p.top}%`,
                                    transform: 'translate(-50%, -50%) translateZ(36px)',
                                }}
                            >
                                <motion.span
                                    className="block"
                                    style={{ opacity: reduceMotion ? 1 : labelsIn }}
                                >
                                    {/* El zoom agranda todo lo que hay dentro del
                                        encuadre; este contra-escalado deja la
                                        etiqueta del mismo tamaño en pantalla. */}
                                    <motion.span
                                        className="block"
                                        animate={{ scale: (1 / zoom) * (lit ? 1.08 : 1) }}
                                        transition={{ duration: 0.5, ease: EASE_LUX }}
                                    >
                                        <span
                                            className="flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 shadow-[0_6px_18px_rgba(5,13,9,0.5)] backdrop-blur-md transition-[opacity,background-color] duration-300 group-focus-visible:ring-2 group-focus-visible:ring-[color:var(--av-vivo)] md:gap-1.5 md:px-3 md:py-1.5"
                                            style={{
                                                backgroundColor: isActive ? zone.accent : 'rgba(5,13,9,0.78)',
                                                borderColor: `${zone.accent}99`,
                                                opacity: dimmed ? 0.45 : 1,
                                            }}
                                        >
                                            <zone.Icon
                                                className="size-3 shrink-0 md:size-3.5"
                                                strokeWidth={2}
                                                style={{ color: isActive ? '#08150F' : zone.accent }}
                                                aria-hidden="true"
                                            />
                                            <span
                                                className="font-sans text-[9px] font-medium uppercase tracking-[0.14em] md:text-[10px]"
                                                style={{ color: isActive ? '#08150F' : '#F2F7EC' }}
                                            >
                                                {labels[zone.id]}
                                            </span>
                                        </span>
                                    </motion.span>
                                </motion.span>
                            </button>
                        );
                    })}
                </motion.div>
            </motion.div>

            {/* Volver al plano completo. Solo con un sector elegido. */}
            {activeId && (
                <motion.button
                    type="button"
                    onClick={onReset}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE_LUX }}
                    className="av-glass absolute bottom-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 font-sans text-[10px] font-medium uppercase tracking-[0.18em] text-ink transition-colors duration-300 hover:text-vivo"
                >
                    <Maximize2 className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                    {resetLabel}
                </motion.button>
            )}
        </div>
    );
}

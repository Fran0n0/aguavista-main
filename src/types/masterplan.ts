/**
 * Modelo de datos del masterplan, compartido por el visor público
 * (InteractiveMap) y el panel de administración.
 *
 * Los nombres de campo son los de las tablas `zonas` y `lotes` de
 * Supabase, en snake_case, para poder pasar los registros sin mapear.
 *
 * Ojo con dos particularidades del esquema actual:
 *   - Los polígonos se guardan como STRING ("x,y x,y x,y"), no como
 *     array. Es el formato que consume el atributo `points` de <polygon>.
 *   - `pitch` y `yaw` vuelven de Supabase como string en algunos
 *     registros y como number en otros, de ahí la unión.
 */

/** Punto en porcentaje sobre la imagen (0–100), no en píxeles: así los
 *  polígonos siguen siendo válidos si cambia la resolución del plano. */
export interface Point {
  x: number;
  y: number;
}

/** Valor numérico que puede llegar serializado desde la base. */
export type Numeric = number | string;

/** Punto de interés dentro de un tour 360 de una casa. */
export interface Hotspot {
  pitch: number;
  yaw: number;
  text: string;
  /** id de la habitación a la que salta este hotspot. */
  targetId: string;
}

/** Habitación de un tour 360. */
export interface Room {
  id: string;
  name: string;
  image: string;
  hotspots?: Hotspot[];
}

export type LoteStatus = "disponible" | "reservado" | "vendido";

/** Fila de la tabla `lotes`. */
export interface Lote {
  id: string;
  zona_id: string;
  number: string;
  /** Polígono serializado: "x,y x,y x,y". */
  points: string;
  center_x: Numeric;
  center_y: Numeric;
  size?: string | null;
  price?: string | null;
  status: LoteStatus | string;
  features?: string[] | null;
  housetour?: Room[] | null;
}

/** Lote en edición: agrega el textarea de features como texto plano. */
export interface EditingLote extends Lote {
  featuresRaw: string;
}

/** Fila de la tabla `zonas`. */
export interface Zona {
  id: string;
  title: string;
  /** Polígono serializado: "x,y x,y x,y". */
  polygon: string;
  /** Posición del hotspot de esta zona dentro del panorama global. */
  pitch: Numeric | null;
  yaw: Numeric | null;
  microimage?: string | null;
  imagen_360?: string | null;
  imagen_2d?: string | null;
}

/* ── Estructuras derivadas que arma el visor público ─────────────── */

export interface MapLot {
  id: string;
  number: string;
  points: string;
  center: { x: Numeric; y: Numeric };
  size?: string | null;
  price?: string | null;
  status: string;
  features: string[];
  houseTour: Room[];
}

export interface SubZone {
  id: string;
  title: string;
  polygon: string;
  pitch: Numeric | null;
  yaw: Numeric | null;
  lots: MapLot[];
}

export interface MapZone {
  id: string;
  title: string;
  subZones: SubZone[];
}

export interface MapConfig {
  global360: string;
  macroImage: string;
  zones: MapZone[];
}

/* ── Pannellum ───────────────────────────────────────────────────
   El visor 360 se carga por <script> desde un CDN y no trae tipos.
   Se declara solo la superficie que usamos, en vez de castear a `any`
   en cada punto de contacto. */

export interface PannellumHotSpot {
  pitch: number;
  yaw: number;
  type: "custom";
  cssClass: string;
  createTooltipFunc: (div: HTMLElement) => void;
  clickHandlerFunc?: () => void;
}

/** Hotspot que se agrega en caliente desde el panel (marca temporal). */
export interface PannellumRuntimeHotSpot {
  id: string;
  pitch: number;
  yaw: number;
  type: "info" | "custom";
  text?: string;
  cssClass?: string;
}

export interface PannellumViewer {
  destroy: () => void;
  getPitch: () => number;
  getYaw: () => number;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  /** Convierte un clic del DOM en coordenadas [pitch, yaw] del panorama.
   *  Devuelve null si el clic cayo fuera de la esfera proyectada. */
  mouseEventToCoords: (event: MouseEvent) => [number, number] | null;
  addHotSpot: (hotspot: PannellumRuntimeHotSpot) => void;
  /** Lanza si el id no existe: siempre envolver en try/catch. */
  removeHotSpot: (id: string) => void;
}

export interface PannellumConfig {
  type: "equirectangular";
  panorama: string;
  autoLoad?: boolean;
  showControls?: boolean;
  showZoomCtrl?: boolean;
  showFullscreenCtrl?: boolean;
  autoRotate?: number;
  hfov?: number;
  compass?: boolean;
  hotSpots?: PannellumHotSpot[];
}

export interface PannellumApi {
  viewer: (container: HTMLElement, config: PannellumConfig) => PannellumViewer;
}

declare global {
  interface Window {
    pannellum?: PannellumApi;
  }
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  Lote,
  MapConfig,
  MapLot,
  PannellumHotSpot,
  PannellumViewer,
  Point,
  Room,
  SubZone,
  Zona,
} from '@/types/masterplan';

// Proxy perezoso: el cliente real se crea en la primera consulta, no al
// evaluar el modulo. Ver src/lib/supabase.ts.
const supabase = new Proxy({} as ReturnType<typeof getSupabase> & object, {
  get(_target, prop) {
    const client = getSupabase();
    if (!client) {
      throw new Error(
        'Supabase no esta configurado: falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    }
    return Reflect.get(client, prop, client);
  },
});

type ViewState = '360_GLOBAL' | '2D_MACRO' | '2D_MICRO' | '360_HOUSE';

export default function InteractiveMap() {
  const [mapConfig, setMapConfig] = useState<MapConfig>({
    global360: '/exterior.jpg',
    macroImage: '/areo.jpg',
    zones: []
  });

  const [viewState, setViewState] = useState<ViewState>('360_GLOBAL');
  const [activeSubZone, setActiveSubZone] = useState<SubZone | null>(null);
  const [activeLot, setActiveLot] = useState<MapLot | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PannellumViewer | null>(null);

  useEffect(() => {
    const fetchMapData = async () => {
      // Sin credenciales de Supabase el mapa se queda con la config por
      // defecto (imagen 360 + aerea) en vez de romper la pagina entera.
      if (!isSupabaseConfigured()) {
        console.warn('[masterplan] Supabase no configurado: se muestra el mapa base sin lotes.');
        return;
      }

      const { data: dbZonas, error: errorZonas } = await supabase.from('zonas').select('*');
      const { data: dbLotes, error: errorLotes } = await supabase.from('lotes').select('*');

      if (errorZonas || errorLotes) return console.error("Error BD:", errorZonas, errorLotes);

      if (dbZonas && dbZonas.length > 0) {
        const zonas = dbZonas as Zona[];
        const lotes = (dbLotes ?? []) as Lote[];

        const buildSubZones: SubZone[] = zonas.map((z) => ({
          id: z.id, title: z.title, polygon: z.polygon, pitch: z.pitch, yaw: z.yaw,
          lots: lotes.filter((l) => l.zona_id === z.id).map((l) => ({
            id: l.id, number: l.number, points: l.points,
            center: { x: l.center_x, y: l.center_y },
            size: l.size, price: l.price, status: l.status,
            features: l.features ?? [],
            houseTour: l.housetour ?? [],
          }))
        }));

        setMapConfig({
          global360: dbZonas[0].imagen_360 || '/exterior.jpg',
          macroImage: dbZonas[0].imagen_2d || '/areo.jpg',
          zones: [{ id: 'zona-1', title: 'Áreas en Venta', subZones: buildSubZones }]
        });
      }
    };
    fetchMapData();
  }, []);

  const getZoomStyle = () => {
    if (viewState === '2D_MICRO' && activeSubZone?.polygon) {
      const points: Point[] = activeSubZone.polygon
        .split(' ')
        .map((p) => { const [x, y] = p.split(',').map(Number); return { x, y }; });
      const minX = Math.min(...points.map((p) => p.x)); const maxX = Math.max(...points.map((p) => p.x));
      const minY = Math.min(...points.map((p) => p.y)); const maxY = Math.max(...points.map((p) => p.y));

      const centerX = minX + (maxX - minX) / 2; const centerY = minY + (maxY - minY) / 2;
      const width = maxX - minX; const height = maxY - minY;
      const scale = Math.max(Math.min(65 / width, 65 / height), 1.5);
      return { transformOrigin: `${centerX}% ${centerY}%`, scale: scale };
    }
    return { transformOrigin: '50% 50%', scale: 1 };
  };

  useEffect(() => {
    if (viewState === '2D_MACRO' || viewState === '2D_MICRO') return;

    const initPannellum = () => {
      const pnl = window.pannellum;
      if (!pnl || !containerRef.current || !mapConfig.zones[0]) return;

      // En 360_HOUSE puede no haber habitacion activa todavia: sin
      // panorama no tiene sentido instanciar el visor.
      const imageToLoad = viewState === '360_GLOBAL' ? mapConfig.global360 : activeRoom?.image;
      if (!imageToLoad) return;

      // textContent y no innerHTML: los titulos los escribe un operador
      // del panel y no deben poder inyectar markup en el visor.
      const tooltip = (text: string) => (div: HTMLElement) => {
        const label = document.createElement('span');
        label.className = 'cartel-flotante text-[10px]';
        label.textContent = text;
        div.replaceChildren(label);
      };

      let hotSpots: PannellumHotSpot[] = [];
      if (viewState === '360_GLOBAL') {
        hotSpots = mapConfig.zones[0].subZones
          .filter((sz) => sz.pitch != null && sz.yaw != null)
          .map((sz) => ({
            pitch: Number(sz.pitch), yaw: Number(sz.yaw),
            type: 'custom' as const, cssClass: 'punto-dorado',
            createTooltipFunc: tooltip(sz.title),
            clickHandlerFunc: () => { setActiveSubZone(sz); setViewState('2D_MICRO'); }
          }));
      } else if (viewState === '360_HOUSE' && activeRoom) {
        hotSpots = (activeRoom.hotspots ?? []).map((hs) => ({
          pitch: hs.pitch, yaw: hs.yaw,
          type: 'custom' as const, cssClass: 'punto-dorado-calle',
          createTooltipFunc: tooltip(hs.text),
          clickHandlerFunc: () => {
            const nextRoom = activeLot?.houseTour?.find((r) => r.id === hs.targetId);
            if (nextRoom) setActiveRoom(nextRoom);
          }
        }));
      }

      if (viewerRef.current) viewerRef.current.destroy();

      viewerRef.current = pnl.viewer(containerRef.current, {
        type: 'equirectangular', panorama: imageToLoad, autoLoad: true, showZoomCtrl: false, showFullscreenCtrl: false, hotSpots: hotSpots
      });
    };

    if (!window.pannellum) {
      const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js'; script.async = true;
      document.body.appendChild(script); script.onload = initPannellum;
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css'; document.head.appendChild(link);
    } else { setTimeout(initPannellum, 100); }

    return () => { if (viewerRef.current) { viewerRef.current.destroy(); viewerRef.current = null; } };
  }, [viewState, mapConfig, activeRoom, activeLot]);

  const WHATSAPP_NUMBER = "5493755000000";

  return (
    <section className="relative w-full block clear-both bg-[color:var(--av-base)] py-24 md:py-32" id="propiedades">
      <style>{`
        .pnlm-error-msg { display: none !important; }
        .punto-dorado { width: 22px; height: 22px; background-color: var(--av-lux); border-radius: 50%; border: 3px solid var(--av-base); box-shadow: 0 0 12px color-mix(in oklab, var(--av-lux) 80%, transparent); cursor: pointer; transition: transform 0.2s ease; pointer-events: auto; }
        .punto-dorado:hover { transform: scale(1.3); }
        .punto-dorado-calle { width: 30px; height: 30px; background-color: rgba(255,255,255,0.2); border-radius: 50%; border: 2px solid var(--av-text); backdrop-filter: blur(4px); cursor: pointer; transition: transform 0.2s ease; pointer-events: auto; }
        .punto-dorado-calle:hover { transform: scale(1.3); }
        .cartel-flotante { position: absolute; bottom: 35px; left: 50%; transform: translateX(-50%); background-color: color-mix(in oklab, var(--av-base) 95%, transparent); color: var(--av-text); padding: 8px 14px; border: 1px solid color-mix(in oklab, var(--av-lux) 50%, transparent); font-family: var(--font-josefin), sans-serif; text-transform: uppercase; letter-spacing: 2px; white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity 0.3s ease; }
        .punto-dorado:hover .cartel-flotante, .punto-dorado-calle:hover .cartel-flotante { opacity: 1; }
      `}</style>

      <div className="w-full flex flex-col items-center justify-center text-center px-4 mb-16 pt-8 relative z-10 block">
        <h2 className="font-[family-name:var(--font-cormorant)] text-4xl md:text-5xl lg:text-6xl text-[color:var(--av-text)] font-semibold italic mb-4">Nuestras áreas en venta</h2>
        <p className="font-[family-name:var(--font-josefin)] text-lg md:text-xl text-[color:var(--av-text-muted)] font-light tracking-wide">Elegí el que más se adapte a vos</p>
      </div>

      <div className="relative w-full max-w-[1400px] mx-auto h-[70vh] md:h-[80vh] border-y md:border border-[color:var(--av-border)] overflow-hidden bg-[color:var(--av-base)]">

        <div className="absolute top-6 left-6 z-30 flex flex-col gap-1 pointer-events-none">
          <span className="font-[family-name:var(--font-josefin)] text-[10px] uppercase tracking-widest text-[color:var(--av-lux)] bg-black/80 px-3 py-1.5 rounded-sm backdrop-blur-md w-max border border-[color:var(--av-lux)]/30">
            {viewState === '360_GLOBAL' ? 'Cielo 360' : mapConfig.zones[0]?.title || 'Áreas'}
          </span>
          {viewState === '2D_MACRO' && <span className="font-[family-name:var(--font-josefin)] text-[10px] uppercase tracking-widest text-white bg-black/80 px-3 py-1.5 rounded-sm backdrop-blur-md w-max mt-1 border border-white/20">Plano General</span>}
          {viewState === '2D_MICRO' && <span className="font-[family-name:var(--font-josefin)] text-[10px] uppercase tracking-widest text-white bg-black/80 px-3 py-1.5 rounded-sm backdrop-blur-md w-max mt-1 border border-white/20">Zoom {activeSubZone?.title}</span>}
        </div>

        <AnimatePresence>
          {viewState !== '360_GLOBAL' && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-6 right-6 z-30 flex flex-col sm:flex-row gap-3 shadow-xl">
              {viewState === '2D_MACRO' && <button onClick={() => { setViewState('360_GLOBAL'); }} className="font-[family-name:var(--font-josefin)] text-[10px] md:text-xs uppercase tracking-widest bg-black/90 text-[color:var(--av-text-muted)] hover:text-white border border-[color:var(--av-border)] px-6 py-3 transition-all">Volver al Cielo</button>}
              {viewState === '2D_MICRO' && <button onClick={() => { setViewState('2D_MACRO'); setActiveSubZone(null); setActiveLot(null); }} className="font-[family-name:var(--font-josefin)] text-[10px] md:text-xs uppercase tracking-widest bg-black/90 text-[color:var(--av-lux)] border border-[color:var(--av-lux)] hover:bg-[color:var(--av-lux)] hover:text-black px-6 py-3 transition-all">Volver a Plano General</button>}
              {viewState === '360_HOUSE' && <button onClick={() => setViewState('2D_MICRO')} className="font-[family-name:var(--font-josefin)] text-[10px] md:text-xs uppercase tracking-widest bg-black/90 text-[color:var(--av-lux)] border border-[color:var(--av-lux)] hover:bg-[color:var(--av-lux)] hover:text-[color:var(--av-base)] px-6 py-3 transition-all">Salir de la Casa</button>}
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`absolute inset-0 w-full h-full transition-opacity duration-300 z-20 overflow-hidden bg-[color:var(--av-surface)] ${(viewState === '2D_MACRO' || viewState === '2D_MICRO') ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <motion.div className="relative w-full h-full flex items-center justify-center" animate={getZoomStyle()} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mapConfig.macroImage} alt="Plano" className="max-w-full max-h-[80vh] object-contain pointer-events-none select-none" />
            <div className="absolute inset-0 z-30">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                {viewState === '2D_MACRO' && mapConfig.zones[0]?.subZones?.map((sub) => (
                  <polygon key={sub.id} points={sub.polygon} onClick={(e) => { e.stopPropagation(); setActiveSubZone(sub); setViewState('2D_MICRO'); }} className={`pointer-events-auto cursor-pointer stroke-[color:var(--av-text)] stroke-[0.2] transition-all ${activeSubZone?.id === sub.id ? 'fill-white opacity-40' : 'fill-white opacity-10 hover:opacity-30'}`} />
                ))}
                {viewState === '2D_MICRO' && activeSubZone?.lots?.map((lot) => (
                  <polygon key={lot.id} points={lot.points} onClick={(e) => { e.stopPropagation(); setActiveLot(lot); }} className={`pointer-events-auto cursor-pointer stroke-[color:var(--av-text)] stroke-[0.1] transition-all ${activeLot?.id === lot.id ? 'stroke-[0.3] opacity-80' : 'opacity-40 hover:opacity-70'} ${lot.status === 'disponible' ? 'fill-green-500' : 'fill-red-500'}`} />
                ))}
              </svg>
            </div>
          </motion.div>

          <AnimatePresence>
            {viewState === '2D_MICRO' && activeLot && (
              <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0, x: 50 }} className="absolute right-0 md:right-6 top-[auto] bottom-0 md:top-1/2 md:bottom-[auto] md:-translate-y-1/2 w-full md:w-80 bg-black/95 backdrop-blur-md border-t md:border border-[color:var(--av-border)] p-6 shadow-2xl z-40">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-[family-name:var(--font-cormorant)] text-3xl text-white">{activeLot.number}</h4>
                  <div className="text-right">
                    <span className="block text-[10px] text-gray-500 uppercase tracking-widest">Precio</span>
                    <span className="font-bold text-[color:var(--av-lux)]">{activeLot.price || 'Consultar'}</span>
                  </div>
                </div>

                <div className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 inline-block mb-4 border ${activeLot.status === 'disponible' ? 'text-green-400 border-green-400/30 bg-green-400/10' : 'text-red-400 border-red-400/30 bg-red-400/10'}`}>{activeLot.status}</div>

                <ul className="space-y-3 border-t border-[color:var(--av-border)] pt-4 mb-6 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                  <li className="flex justify-between font-[family-name:var(--font-josefin)] text-sm text-[color:var(--av-text-muted)] mb-2 border-b border-[color:var(--av-border)] pb-2"><span>Superficie:</span> <span className="text-[color:var(--av-text)]">{activeLot.size}</span></li>
                  {activeLot.features?.map((f:string, i:number) => <li key={i} className="flex items-start gap-2 font-[family-name:var(--font-josefin)] text-xs text-[color:var(--av-text)] leading-tight"><span className="text-[color:var(--av-lux)] mt-0.5">✓</span>{f}</li>)}
                </ul>

                <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hola, quiero consultar por el ${activeLot.number} de AguaVista.`} target="_blank" rel="noreferrer" className="w-full text-center bg-[#25D366] text-white py-3 text-[10px] uppercase font-bold hover:bg-green-600 transition-colors mb-3 flex items-center justify-center gap-2 shadow-lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                  Consultar por WhatsApp
                </a>

                {activeLot.houseTour && activeLot.houseTour.length > 0 && (
                  <button onClick={() => { setActiveRoom(activeLot.houseTour[0]); setViewState('360_HOUSE'); }} className="w-full text-center bg-[color:var(--av-lux)] text-[color:var(--av-base)] py-3 text-[10px] uppercase font-bold hover:bg-white transition-colors mb-3 shadow-lg">Ver Interior Casa Modelo</button>
                )}
                <button onClick={() => setActiveLot(null)} className="w-full text-center border border-[color:var(--av-lux)] text-[color:var(--av-lux)] py-3 text-[10px] uppercase font-bold hover:bg-[color:var(--av-lux)] hover:text-[color:var(--av-base)] transition-colors">Volver a Info</button>
              </motion.div>
            )}
          </AnimatePresence>

          {viewState === '2D_MICRO' && (
            <div className="absolute top-6 left-6 md:top-[auto] md:bottom-6 bg-black/90 px-4 py-3 border border-[color:var(--av-border)] flex flex-col gap-2 backdrop-blur-md z-30 shadow-xl">
              <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="font-[family-name:var(--font-josefin)] text-[10px] text-white uppercase tracking-wider">Lote Disponible</span></div>
              <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="font-[family-name:var(--font-josefin)] text-[10px] text-white uppercase tracking-wider">Lote Vendido</span></div>
            </div>
          )}
        </div>

        <div className={`absolute inset-0 w-full h-full transition-opacity duration-300 z-10 ${(viewState === '360_GLOBAL' || viewState === '360_HOUSE') ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div ref={containerRef} className="w-full h-full" />
        </div>
      </div>
    </section>
  );
}
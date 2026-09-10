'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import type {
  EditingLote,
  Hotspot,
  Lote,
  PannellumHotSpot,
  PannellumViewer,
  Point,
  Room,
  Zona,
} from '@/types/masterplan';

import { getSupabase } from '@/lib/supabase';

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

export function AdminPanel() {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [globalConfig, setGlobalConfig] = useState({
    imagen_360: '/exterior.jpg',
    imagen_2d: '/areo.jpg'
  });

  const [activeZona, setActiveZona] = useState<Zona | null>(null);
  const [editingLote, setEditingLote] = useState<EditingLote | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState<Point[]>([]);
  const [mode, setMode] = useState<'VIEW' | 'DRAW_ZONA' | 'DRAW_LOTE'>('VIEW');

  const [adminTab, setAdminTab] = useState<'2D' | '360' | 'CONFIG'>('2D');
  const [mode360, setMode360] = useState<'GLOBAL' | 'HOUSE'>('GLOBAL');
  const [activeLote360, setActiveLote360] = useState<Lote | null>(null);
  const [activeRoom360, setActiveRoom360] = useState<Room | null>(null);
  const [newRoomImg, setNewRoomImg] = useState('');
  const [newRoomName, setNewRoomName] = useState('');

  const [isAddingHotspot, setIsAddingHotspot] = useState(false);
  const [hotspotModal, setHotspotModal] = useState<{pitch: number, yaw: number} | null>(null);
  const [hotspotTarget, setHotspotTarget] = useState('');
  const [hotspotText, setHotspotText] = useState('Ir a...');

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PannellumViewer | null>(null);

  const fetchData = useCallback(async () => {
    const { data: zData } = await supabase.from('zonas').select('*');
    const { data: lData } = await supabase.from('lotes').select('*');

    const zonasData = (zData ?? []) as Zona[];
    if (zonasData.length > 0) {
      setZonas(zonasData);
      setGlobalConfig({
        imagen_360: zonasData[0].imagen_360 || '/exterior.jpg',
        imagen_2d: zonasData[0].imagen_2d || '/areo.jpg',
      });
    } else {
      setZonas([]);
    }

    if (!lData) return;
    const lotesData = lData as Lote[];
    setLotes(lotesData);

    setActiveLote360((prev) => {
      if (!prev) return null;
      const refreshed = lotesData.find((l) => l.id === prev.id) ?? null;
      setActiveRoom360((prevRoom) =>
        prevRoom && refreshed
          ? refreshed.housetour?.find((r) => r.id === prevRoom.id) ?? null
          : null
      );
      return refreshed;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await fetchData();
      if (cancelled) return;
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  // ── MOTOR 360 DEL ADMIN ──
  useEffect(() => {
    if (adminTab !== '360') {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
      return;
    }
    if (mode360 === 'HOUSE' && !activeRoom360) return;

    const initPannellum = () => {
      const pnl = window.pannellum;
      if (!pnl || !containerRef.current) return;

      const imageToLoad =
        mode360 === 'GLOBAL' ? globalConfig.imagen_360 : activeRoom360?.image;
      if (!imageToLoad) return;

      let hotSpots: PannellumHotSpot[] = [];
      if (mode360 === 'GLOBAL') {
        hotSpots = zonas
          .filter((z) => z.pitch != null && z.yaw != null)
          .map((z) => ({
            pitch: Number(z.pitch),
            yaw: Number(z.yaw),
            type: 'custom' as const,
            cssClass: 'punto-dorado',
            createTooltipFunc: (div: HTMLElement) => {
              const label = document.createElement('span');
              label.className = 'cartel-flotante text-[10px]';
              label.textContent = z.title;
              div.replaceChildren(label);
            },
          }));
      } else if (mode360 === 'HOUSE') {
        hotSpots = (activeRoom360?.hotspots ?? []).map((hs) => ({
          pitch: hs.pitch,
          yaw: hs.yaw,
          type: 'custom' as const,
          cssClass: 'punto-dorado-calle',
          createTooltipFunc: (div: HTMLElement) => {
            const label = document.createElement('span');
            label.className = 'cartel-flotante text-[10px]';
            label.textContent = hs.text;
            div.replaceChildren(label);
          },
        }));
      }

      if (viewerRef.current) viewerRef.current.destroy();

      viewerRef.current = pnl.viewer(containerRef.current, {
        type: 'equirectangular',
        panorama: imageToLoad,
        autoLoad: true,
        showZoomCtrl: true,
        showFullscreenCtrl: false,
        hotSpots: hotSpots
      });
    };

    if (!window.pannellum) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
      script.async = true;
      document.body.appendChild(script);
      script.onload = initPannellum;
    } else {
      setTimeout(initPannellum, 100);
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [adminTab, mode360, activeRoom360, zonas, globalConfig.imagen_360]);

  const updateGlobalImages = async () => {
    if (zonas.length === 0) return alert("Debes crear al menos una manzana primero.");
    const { error } = await supabase.from('zonas').update({
      imagen_360: globalConfig.imagen_360,
      imagen_2d: globalConfig.imagen_2d
    }).eq('id', zonas[0].id);

    if (error) alert("Error: " + error.message);
    else alert("Imágenes actualizadas.");
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode === 'VIEW') return;
    const rect = e.currentTarget.getBoundingClientRect();
    setCurrentDrawing([
      ...currentDrawing,
      {
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100
      }
    ]);
  };

  const saveDrawing = async () => {
    if (currentDrawing.length < 3) return alert("Mínimo 3 puntos.");
    const pointsStr = currentDrawing.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

    if (mode === 'DRAW_ZONA') {
      const newZona: Zona = {
        id: `zona-${Date.now()}`,
        title: `Manzana ${zonas.length + 1}`,
        polygon: pointsStr,
        microimage: '/areozona1.jpg',
        imagen_360: globalConfig.imagen_360,
        imagen_2d: globalConfig.imagen_2d,
        pitch: null,
        yaw: null,
      };
      setZonas([...zonas, newZona]);
      await supabase.from('zonas').insert(newZona);
    } else if (mode === 'DRAW_LOTE' && activeZona) {
      const cX = (currentDrawing.reduce((a, p) => a + p.x, 0) / currentDrawing.length).toFixed(2);
      const cY = (currentDrawing.reduce((a, p) => a + p.y, 0) / currentDrawing.length).toFixed(2);
      await supabase.from('lotes').insert({
        id: `lote-${Date.now()}`,
        zona_id: activeZona.id,
        number: `Lote Nuevo`,
        points: pointsStr,
        center_x: cX,
        center_y: cY,
        size: '800m²',
        price: 'Consultar',
        status: 'disponible',
        features: [],
        housetour: []
      });
    }
    setCurrentDrawing([]);
    setMode('VIEW');
    fetchData();
  };

  const deleteZona = async (id: string) => {
    if(!confirm("¿Borrar Manzana y sus lotes?")) return;
    setZonas(prev => prev.filter(z => z.id !== id));
    if (activeZona?.id === id) setActiveZona(null);
    await supabase.from('zonas').delete().eq('id', id);
    fetchData();
  };

  const deleteLote = async (id: string) => {
    if(!confirm("¿Borrar este lote?")) return;
    setLotes(prev => prev.filter(l => l.id !== id));
    setEditingLote(null);
    await supabase.from('lotes').delete().eq('id', id);
    fetchData();
  };

  const openEditor = (lot: Lote) => {
    setEditingLote({ ...lot, featuresRaw: (lot.features ?? []).join('\n') });
  };

  const updateLote = async () => {
    if (!editingLote) return;
    const featuresArray = editingLote.featuresRaw
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    await supabase.from('lotes').update({
      number: editingLote.number,
      status: editingLote.status,
      size: editingLote.size,
      price: editingLote.price,
      features: featuresArray
    }).eq('id', editingLote.id);

    alert("Lote actualizado.");
    setEditingLote(null);
    fetchData();
  };

  const saveVisualHotspot = async () => {
    if (!hotspotModal) return;
    if (mode360 === 'GLOBAL') {
      if (!hotspotTarget) return alert('Seleccioná una manzana destino.');
      await supabase.from('zonas').update({
        pitch: hotspotModal.pitch,
        yaw: hotspotModal.yaw
      }).eq('id', hotspotTarget);
    } else {
      if (!hotspotTarget || !activeLote360 || !activeRoom360) return;
      const newHotspot: Hotspot = {
        pitch: hotspotModal.pitch,
        yaw: hotspotModal.yaw,
        targetId: hotspotTarget,
        text: hotspotText,
      };
      const updatedTour = (activeLote360.housetour ?? []).map((r) =>
        r.id === activeRoom360.id
          ? { ...r, hotspots: [...(r.hotspots ?? []), newHotspot] }
          : r
      );
      await supabase.from('lotes').update({ housetour: updatedTour }).eq('id', activeLote360.id);
    }
    setHotspotModal(null);
    setHotspotTarget('');
    setHotspotText('Ir a...');
    fetchData();
  };

  const removeGlobalHotspot = async (zonaId: string) => {
    await supabase.from('zonas').update({ pitch: null, yaw: null }).eq('id', zonaId);
    fetchData();
  };

  const removeHouseHotspot = async (roomId: string, targetId: string) => {
    if (!activeLote360) return;
    const updatedTour = (activeLote360.housetour ?? []).map((r) =>
      r.id === roomId
        ? { ...r, hotspots: (r.hotspots ?? []).filter((h) => h.targetId !== targetId) }
        : r
    );
    await supabase.from('lotes').update({ housetour: updatedTour }).eq('id', activeLote360.id);
    fetchData();
  };

  const addRoom = async () => {
    if (!newRoomName || !newRoomImg || !activeLote360) return;
    const newRoom: Room = {
      id: newRoomName.toLowerCase().replace(/\s+/g, '-'),
      name: newRoomName,
      image: newRoomImg,
      hotspots: [],
    };
    await supabase.from('lotes').update({
      housetour: [...(activeLote360.housetour ?? []), newRoom]
    }).eq('id', activeLote360.id);

    setNewRoomName('');
    setNewRoomImg('');
    fetchData();
  };

  const deleteRoom = async (roomId: string) => {
    if (!activeLote360) return;
    if(!confirm("¿Borrar habitación?")) return;
    await supabase.from('lotes').update({
      housetour: (activeLote360.housetour ?? []).filter((r) => r.id !== roomId)
    }).eq('id', activeLote360.id);

    if(activeRoom360?.id === roomId) setActiveRoom360(null);
    fetchData();
  };

  return (
    <div className="flex flex-col md:flex-row bg-[color:var(--av-base)] text-ink overflow-hidden h-screen">

      {/* ── BARRA LATERAL (Con colores de marca) ── */}
      <aside className="w-full md:w-[400px] bg-[color:var(--av-surface)] border-r border-[color:var(--av-border-soft)] flex flex-col h-screen shrink-0 relative z-50">
        <div className="p-4 border-b border-[color:var(--av-border-soft)] flex gap-2">
          <button onClick={() => { setAdminTab('2D'); setMode('VIEW'); setHotspotModal(null); setIsAddingHotspot(false); }} className={`flex-1 py-3 text-[10px] uppercase font-bold tracking-widest transition-colors ${adminTab === '2D' ? 'bg-[color:var(--av-vivo)] text-black' : 'bg-[color:var(--av-base)] text-ink-muted border border-[color:var(--av-border-soft)]'}`}>Mapeo 2D</button>
          <button onClick={() => { setAdminTab('360'); setMode('VIEW'); setHotspotModal(null); setIsAddingHotspot(false); }} className={`flex-1 py-3 text-[10px] uppercase font-bold tracking-widest transition-colors ${adminTab === '360' ? 'bg-[color:var(--av-lux)] text-black' : 'bg-[color:var(--av-base)] text-ink-muted border border-[color:var(--av-border-soft)]'}`}>Tours 360</button>
          <button onClick={() => { setAdminTab('CONFIG'); setMode('VIEW'); setHotspotModal(null); setIsAddingHotspot(false); }} className={`flex-1 py-3 text-[10px] uppercase font-bold tracking-widest transition-colors ${adminTab === 'CONFIG' ? 'bg-[#4F7F16] text-white' : 'bg-[color:var(--av-base)] text-ink-muted border border-[color:var(--av-border-soft)]'}`}>Config</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">

          {adminTab === 'CONFIG' && (
            <div className="animate-in fade-in">
              <h3 className="text-[10px] uppercase tracking-widest text-[color:var(--av-lux)] mb-3 font-bold">Imágenes Principales</h3>

              <label className="block text-[10px] text-ink-muted uppercase mb-1">URL Imagen Aérea 2D</label>
              <input type="text" value={globalConfig.imagen_2d} onChange={e => setGlobalConfig({...globalConfig, imagen_2d: e.target.value})} className="w-full bg-[color:var(--av-base)] p-3 mb-4 text-xs text-ink border border-[color:var(--av-border-soft)] outline-none focus:border-[color:var(--av-vivo)]" />

              <label className="block text-[10px] text-ink-muted uppercase mb-1">URL Cielo 360</label>
              <input type="text" value={globalConfig.imagen_360} onChange={e => setGlobalConfig({...globalConfig, imagen_360: e.target.value})} className="w-full bg-[color:var(--av-base)] p-3 mb-6 text-xs text-ink border border-[color:var(--av-border-soft)] outline-none focus:border-[color:var(--av-vivo)]" />

              <button onClick={updateGlobalImages} className="w-full bg-[color:var(--av-vivo)] text-[#08150F] font-bold uppercase text-[10px] py-3 tracking-widest hover:bg-[color:var(--av-vivo-deep)] transition-colors">
                Actualizar Imágenes
              </button>
            </div>
          )}

          {adminTab === '2D' && (
            <>
              {!editingLote ? (
                <>
                  <div className="mb-8">
                    <button onClick={() => { setMode('DRAW_ZONA'); setActiveZona(null); }} className={`w-full py-3 text-[10px] font-bold uppercase transition-colors shadow-lg ${mode === 'DRAW_ZONA' ? 'bg-[color:var(--av-vivo)] text-[#08150F]' : 'bg-[color:var(--av-base)] border border-[color:var(--av-border-soft)] text-ink-muted hover:text-ink'}`}>
                      + Dibujar Manzana
                    </button>
                    <div className="mt-3 flex flex-col gap-2">
                      {zonas.map(z => (
                        <div key={z.id} className="flex gap-2">
                          <button onClick={() => { setActiveZona(z); setMode('VIEW'); }} className={`flex-1 p-3 text-xs border text-left transition-colors ${activeZona?.id === z.id ? 'bg-[color:var(--av-glow-lux)] border-[color:var(--av-lux)] text-[color:var(--av-lux)] font-bold' : 'bg-[color:var(--av-base)] border-[color:var(--av-border-soft)] text-ink-muted hover:text-ink'}`}>
                            {z.title}
                          </button>
                          <button onClick={() => deleteZona(z.id)} className="px-3 bg-[#E2725B]/10 text-[#E2725B] border border-[#E2725B]/30 hover:bg-[#E2725B] hover:text-white transition-colors">X</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {activeZona && (
                    <div className="mb-8 animate-in fade-in">
                      <button onClick={() => setMode('DRAW_LOTE')} className={`w-full py-3 text-[10px] font-bold uppercase mb-3 transition-colors shadow-lg ${mode === 'DRAW_LOTE' ? 'bg-[color:var(--av-vivo)] text-[#08150F]' : 'bg-[color:var(--av-base)] border border-[color:var(--av-border-soft)] text-ink-muted hover:text-ink'}`}>
                        + Dibujar Lote Nuevo
                      </button>
                      <div className="flex flex-col gap-2 mt-2">
                        {lotes.filter(l => l.zona_id === activeZona.id).map(lot => (
                          <div key={lot.id} className="flex gap-2 items-center bg-[color:var(--av-base)] border border-[color:var(--av-border-soft)] p-2 rounded">
                            <button onClick={() => openEditor(lot)} className="flex-1 text-left text-xs text-ink-muted hover:text-ink px-2 py-1 transition-colors">
                              {lot.number} <span className={lot.status === 'disponible' ? 'text-[color:var(--av-vivo)]' : 'text-[#E2725B]'}>({lot.status})</span>
                            </button>
                            <button onClick={() => deleteLote(lot.id)} className="text-[#E2725B] px-2 py-1 hover:bg-[#E2725B]/10 rounded border border-transparent hover:border-[#E2725B]/30 transition-colors">X</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-[color:var(--av-base)] p-5 border border-[color:var(--av-border)] animate-in slide-in-from-right-4 rounded">
                  <div className="flex justify-between items-center mb-5 border-b border-[color:var(--av-border-soft)] pb-3">
                    <h3 className="text-ink text-sm font-bold uppercase">Editar Lote</h3>
                    <button onClick={() => setEditingLote(null)} className="text-ink-muted hover:text-ink transition-colors">Volver</button>
                  </div>
                  <input type="text" value={editingLote.number} onChange={e => setEditingLote({...editingLote, number: e.target.value})} className="w-full bg-[color:var(--av-surface)] p-2.5 mb-3 text-sm outline-none border border-[color:var(--av-border-soft)] text-ink focus:border-[color:var(--av-vivo)] rounded" placeholder="Nombre (Lote 1)" />
                  <input type="text" value={editingLote.price || ''} onChange={e => setEditingLote({...editingLote, price: e.target.value})} className="w-full bg-[color:var(--av-surface)] p-2.5 mb-3 text-sm outline-none border border-[color:var(--av-border-soft)] text-[color:var(--av-vivo)] font-bold focus:border-[color:var(--av-vivo)] rounded" placeholder="Precio (USD)" />
                  <div className="flex gap-3 mb-3">
                    <select value={editingLote.status} onChange={e => setEditingLote({...editingLote, status: e.target.value})} className="w-full p-2.5 text-sm outline-none font-bold bg-[color:var(--av-surface)] text-ink border border-[color:var(--av-border-soft)] rounded focus:border-[color:var(--av-vivo)]">
                      <option value="disponible">DISPONIBLE</option>
                      <option value="vendido">VENDIDO</option>
                    </select>
                    <input type="text" value={editingLote.size ?? ''} onChange={e => setEditingLote({...editingLote, size: e.target.value})} className="w-full bg-[color:var(--av-surface)] p-2.5 text-sm outline-none border border-[color:var(--av-border-soft)] text-ink focus:border-[color:var(--av-vivo)] rounded" placeholder="Mts2" />
                  </div>
                  <textarea value={editingLote.featuresRaw} onChange={e => setEditingLote({...editingLote, featuresRaw: e.target.value})} className="w-full bg-[color:var(--av-surface)] p-2.5 mb-6 text-xs h-24 outline-none border border-[color:var(--av-border-soft)] text-ink focus:border-[color:var(--av-vivo)] rounded" placeholder="Detalles (Piscina, Quincho)"></textarea>
                  <button onClick={updateLote} className="w-full bg-[color:var(--av-vivo)] text-[#08150F] py-3 uppercase font-bold text-[10px] tracking-widest shadow-lg hover:bg-[color:var(--av-vivo-deep)] transition-colors rounded">
                    Guardar Lote
                  </button>
                </div>
              )}
            </>
          )}

          {adminTab === '360' && (
            <>
              <div className="flex bg-[color:var(--av-base)] border border-[color:var(--av-border-soft)] mb-6 p-1 rounded">
                <button onClick={() => {setMode360('GLOBAL'); setHotspotModal(null); setIsAddingHotspot(false);}} className={`flex-1 py-2 text-[10px] uppercase font-bold tracking-widest transition-colors ${mode360 === 'GLOBAL' ? 'bg-[color:var(--av-lux)] text-black rounded-sm' : 'text-ink-muted hover:text-ink'}`}>Cielo General</button>
                <button onClick={() => {setMode360('HOUSE'); setHotspotModal(null); setIsAddingHotspot(false);}} className={`flex-1 py-2 text-[10px] uppercase font-bold tracking-widest transition-colors ${mode360 === 'HOUSE' ? 'bg-[color:var(--av-lux)] text-black rounded-sm' : 'text-ink-muted hover:text-ink'}`}>Interior Casas</button>
              </div>

              {mode360 === 'GLOBAL' ? (
                <div className="animate-in fade-in">
                  <h3 className="text-[10px] uppercase tracking-widest text-[color:var(--av-lux)] mb-3 font-bold">Puntos Hacia Manzanas</h3>
                  <div className="flex flex-col gap-2">
                    {zonas.filter(z => z.pitch && z.yaw).map(z => (
                      <div key={z.id} className="flex justify-between items-center bg-[color:var(--av-base)] border border-[color:var(--av-border-soft)] p-3 text-xs rounded">
                        <span className="font-bold text-ink">{z.title}</span>
                        <button onClick={() => removeGlobalHotspot(z.id)} className="text-[#E2725B] hover:opacity-80 transition-opacity">Borrar Punto</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in">
                  <select value={activeLote360?.id || ''} onChange={(e) => { setActiveLote360(lotes.find(l => l.id === e.target.value) ?? null); setActiveRoom360(null); setIsAddingHotspot(false); }} className="w-full bg-[color:var(--av-base)] p-3 text-sm border border-[color:var(--av-border-soft)] text-ink outline-none mb-4 focus:border-[color:var(--av-vivo)] rounded">
                    <option value="">-- Elegí Lote --</option>
                    {lotes.map(l => <option key={l.id} value={l.id}>{l.number}</option>)}
                  </select>

                  {activeLote360 && (
                    <>
                      <div className="flex flex-col gap-2 mb-4">
                        {(activeLote360.housetour ?? []).map((room) => (
                          <div key={room.id} className={`p-2 border rounded transition-colors ${activeRoom360?.id === room.id ? 'bg-[color:var(--av-glow-lux)] border-[color:var(--av-lux)]' : 'bg-[color:var(--av-base)] border-[color:var(--av-border-soft)]'}`}>
                            <div className="flex justify-between items-center mb-2">
                              <button onClick={() => { setActiveRoom360(room); setIsAddingHotspot(false); }} className="text-xs font-bold text-left flex-1 text-ink">{room.name}</button>
                              <button onClick={() => deleteRoom(room.id)} className="text-[#E2725B] text-[10px] px-2 border border-[#E2725B]/30 hover:bg-[#E2725B] hover:text-white transition-colors rounded">X Hab.</button>
                            </div>
                            {(room.hotspots ?? []).map((hs, i) => (
                              <div key={i} className="flex justify-between text-[9px] text-ink-muted pl-2 border-l border-[color:var(--av-border-soft)]">
                                <span>Flecha: &ldquo;{hs.text}&rdquo;</span>
                                <button onClick={() => removeHouseHotspot(room.id, hs.targetId)} className="text-[#E2725B] hover:opacity-80">Borrar</button>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>

                      <div className="bg-[color:var(--av-base)] p-3 border border-[color:var(--av-border-soft)] rounded">
                        <input type="text" placeholder="Nombre (Ej: Living)" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} className="w-full bg-[color:var(--av-surface)] border border-[color:var(--av-border-soft)] p-2 text-xs mb-2 text-ink outline-none focus:border-[color:var(--av-vivo)] rounded" />
                        <input type="text" placeholder="URL Foto (.jpg, .webp)" value={newRoomImg} onChange={e => setNewRoomImg(e.target.value)} className="w-full bg-[color:var(--av-surface)] border border-[color:var(--av-border-soft)] p-2 text-xs mb-3 text-ink outline-none focus:border-[color:var(--av-vivo)] rounded" />
                        <button onClick={addRoom} className="w-full bg-[color:var(--av-lux)] text-black text-[10px] font-bold uppercase py-2 hover:brightness-110 transition-all rounded">Guardar Habitación</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* ── ÁREA PRINCIPAL ── */}
      <main className="flex-1 relative bg-[color:var(--av-base)] flex flex-col h-screen">

        {/* TOOLBAR */}
        <div className="h-12 border-b border-[color:var(--av-border-soft)] bg-[color:var(--av-surface)] flex items-center justify-between px-6 z-40 shrink-0">
          <span className="text-[10px] uppercase tracking-widest text-[color:var(--av-lux)] font-bold flex items-center gap-2">
            <div className="w-2 h-2 bg-[color:var(--av-vivo)] rounded-full animate-pulse" />
            {adminTab === '2D' ? (mode === 'VIEW' ? 'MAPA 2D' : `DIBUJANDO`) : adminTab === '360' ? 'VISOR 360' : 'CONFIGURACIÓN'}
          </span>
          {currentDrawing.length > 0 && adminTab === '2D' && (
            <div className="flex gap-3">
              <button onClick={() => setCurrentDrawing([])} className="text-[#E2725B] text-[10px] uppercase font-bold hover:opacity-80">Limpiar</button>
              <button onClick={saveDrawing} className="bg-[color:var(--av-vivo)] text-[#08150F] px-4 py-1.5 text-[10px] uppercase font-bold hover:bg-[color:var(--av-vivo-deep)] transition-colors rounded">Guardar Polígono</button>
            </div>
          )}
        </div>

        <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-[color:var(--av-base)]">

          {/* VISTA 2D */}
          <div className={`absolute inset-0 w-full h-full z-20 ${adminTab === '2D' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className={`w-full h-full flex items-center justify-center relative ${mode !== 'VIEW' ? 'cursor-crosshair' : ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={globalConfig.imagen_2d} alt="Plano" className="max-w-full max-h-[85vh] object-contain pointer-events-none select-none border border-[color:var(--av-border-soft)] shadow-av-md rounded" />
              <div className="absolute inset-0 z-30" onClick={handleImageClick}>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                  {zonas.map(z => (
                    <polygon key={z.id} points={z.polygon} className={`transition-all ${mode === 'DRAW_LOTE' ? 'pointer-events-none stroke-[color:var(--av-vivo)]/30 fill-transparent' : 'pointer-events-auto cursor-pointer'} ${activeZona?.id === z.id ? 'stroke-[color:var(--av-vivo)] stroke-[0.3] fill-[color:var(--av-vivo)]/10' : 'stroke-white/30 stroke-[0.1] fill-white/5 hover:fill-white/10'}`} onClick={(e) => { e.stopPropagation(); if(mode === 'VIEW') setActiveZona(z); }} />
                  ))}
                  {activeZona && lotes.filter(l => l.zona_id === activeZona.id).map(lot => (
                    <polygon key={lot.id} points={lot.points} onClick={(e) => { e.stopPropagation(); if(mode==='VIEW'){ openEditor(lot); } }} className={`pointer-events-auto cursor-pointer transition-all stroke-[0.2] hover:opacity-80 ${editingLote?.id === lot.id ? 'stroke-white stroke-[0.4] z-50' : 'stroke-white/50'} ${lot.status === 'disponible' ? 'fill-[color:var(--av-vivo)]/80' : 'fill-[#E2725B]/80'}`} />
                  ))}
                  {currentDrawing.length > 0 && <polyline points={currentDrawing.map(p => `${p.x},${p.y}`).join(' ')} className="fill-none stroke-[color:var(--av-lux)] stroke-[0.3] stroke-dasharray-1" />}
                </svg>
                {currentDrawing.map((p, i) => (<div key={i} className="absolute w-1.5 h-1.5 bg-[color:var(--av-lux)] rounded-full z-40 -translate-x-1/2 -translate-y-1/2 shadow-lg" style={{ top: `${p.y}%`, left: `${p.x}%` }} />))}
              </div>
            </div>
          </div>

          {/* VISTA 360 */}
          <div className={`absolute inset-0 w-full h-full z-30 ${adminTab === '360' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
             {adminTab === '360' && !hotspotModal && ((mode360 === 'GLOBAL') || (mode360 === 'HOUSE' && activeRoom360)) && (
               <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
                 {isAddingHotspot ? (
                   <div className="bg-[color:var(--av-vivo)] text-[#08150F] px-6 py-3 font-bold uppercase text-xs tracking-widest shadow-av-glow animate-pulse rounded flex flex-col items-center gap-2">
                     <span>🎯 Hacé clic en la imagen donde querés la flecha</span>
                     <button onClick={() => setIsAddingHotspot(false)} className="text-[9px] bg-black/30 text-white px-3 py-1 hover:bg-black/50 rounded">Cancelar</button>
                   </div>
                 ) : (
                   <button onClick={() => setIsAddingHotspot(true)} className="bg-[color:var(--av-lux)] text-black px-6 py-3 font-bold uppercase text-xs tracking-widest shadow-[0_0_20px_rgba(201,169,98,0.5)] hover:brightness-110 transition-all hover:scale-105 rounded">
                     + Agregar Flecha Aquí
                   </button>
                 )}
               </div>
             )}

             <div ref={containerRef} className="w-full h-full bg-[color:var(--av-base)]" />

             {isAddingHotspot && (
               <div
                 className="absolute top-0 left-0 w-full h-full z-[999] cursor-crosshair"
                 onContextMenu={(e) => e.preventDefault()}
                 onClick={(e) => {
                   e.preventDefault();
                   if (!viewerRef.current) return;
                   const coords = viewerRef.current.mouseEventToCoords(e.nativeEvent);
                   if (coords) {
                     setHotspotModal({ pitch: coords[0], yaw: coords[1] });
                     setIsAddingHotspot(false);
                     try { viewerRef.current.removeHotSpot('temp-mark'); } catch {}
                     viewerRef.current.addHotSpot({
                       id: 'temp-mark',
                       pitch: coords[0],
                       yaw: coords[1],
                       type: 'info',
                       text: 'Nuevo Punto'
                     });
                   }
                 }}
               />
             )}

             <AnimatePresence>
                {hotspotModal && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[color:var(--av-surface)] p-6 border border-[color:var(--av-lux)] shadow-av-lg z-[1000] w-80 rounded-xl">
                    <h4 className="text-[color:var(--av-lux)] font-bold uppercase text-xs mb-4 text-center tracking-widest">
                      {mode360 === 'GLOBAL' ? 'Asignar Punto en el Cielo' : 'Crear Flecha 360'}
                    </h4>

                    {mode360 === 'HOUSE' && (
                      <input type="text" value={hotspotText} onChange={e => setHotspotText(e.target.value)} placeholder="Texto flecha (Ej: Ir al patio)" className="w-full bg-[color:var(--av-base)] p-2.5 text-xs text-ink outline-none border border-[color:var(--av-border-soft)] mb-4 focus:border-[color:var(--av-vivo)] rounded" />
                    )}

                    <select value={hotspotTarget} onChange={e => setHotspotTarget(e.target.value)} className="w-full bg-[color:var(--av-base)] p-2.5 text-xs text-ink outline-none border border-[color:var(--av-border-soft)] mb-6 focus:border-[color:var(--av-vivo)] rounded">
                      <option value="">-- Destino --</option>
                      {mode360 === 'GLOBAL'
                        ? zonas.filter(z => !z.pitch).map(z => <option key={z.id} value={z.id}>{z.title}</option>)
                        : (activeLote360?.housetour ?? []).filter((r) => r.id !== activeRoom360?.id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)
                      }
                    </select>

                    <div className="flex gap-2">
                      <button onClick={() => { setHotspotModal(null); try{ viewerRef.current?.removeHotSpot('temp-mark'); }catch{} }} className="flex-1 bg-transparent text-ink-muted border border-[color:var(--av-border-soft)] text-[10px] uppercase font-bold py-2 hover:text-ink rounded">
                        Cancelar
                      </button>
                      <button onClick={saveVisualHotspot} className="flex-1 bg-[color:var(--av-lux)] text-black text-[10px] uppercase font-bold py-2 shadow-av-sm hover:brightness-110 transition-all rounded">
                        Guardar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
          </div>

          {/* VISTA CONFIG */}
          <div className={`absolute inset-0 w-full h-full z-40 bg-[color:var(--av-base)] flex items-center justify-center ${adminTab === 'CONFIG' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
             <div className="text-center">
               <h2 className="text-[color:var(--av-lux)] font-display text-2xl">Modo Configuración Activo</h2>
               <p className="text-ink-muted text-xs uppercase tracking-widest mt-2">Visores en pausa para ahorrar memoria</p>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}
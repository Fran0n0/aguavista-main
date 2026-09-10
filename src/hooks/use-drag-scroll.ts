"use client";

import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from "react";

/** Píxeles a partir de los cuales el gesto cuenta como arrastre y no como clic. */
const DRAG_THRESHOLD = 5;

/**
 * Grab & drag sobre un contenedor de scroll horizontal.
 *
 * Mueve `scrollLeft` con el puntero en vez de transformar una pista.
 *
 * Por qué así y no con `drag="x"` de framer-motion: framer reemplaza el
 * scroll por un `transform` sobre la pista, y con eso se pierde todo lo
 * que el navegador ya hace bien y gratis —swipe táctil con inercia,
 * trackpad de dos dedos, shift+rueda, `scroll-snap`, y el autoscroll que
 * hace el navegador al tabular a una tarjeta que quedó fuera de vista—.
 * Habría que reimplementar cada una de esas cosas y además medir
 * `dragConstraints` a mano en cada resize. Manejando `scrollLeft` todo eso
 * sigue funcionando igual y el arrastre con mouse se suma encima.
 *
 * En touch no se engancha nada a propósito: ahí el gesto nativo ya es
 * mejor que cualquier cosa que hagamos en JS.
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [dragging, setDragging] = useState(false);

  /** Puntero apretado y todavía sin decidir si es clic o arrastre. */
  const pending = useRef(false);
  /** Ya se pasó el umbral: hay captura tomada y el clic final se descarta. */
  const captured = useRef(false);
  const pointerId = useRef(-1);
  const startX = useRef(0);
  const startScroll = useRef(0);
  /** Para la inercia: última posición, su marca de tiempo y la velocidad. */
  const last = useRef({ x: 0, t: 0, v: 0 });

  const onPointerDown = useCallback((e: ReactPointerEvent<T>) => {
    // Solo mouse: en touch y lápiz manda el gesto nativo.
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = ref.current;
    if (!el) return;

    pending.current = true;
    captured.current = false;
    pointerId.current = e.pointerId;
    startX.current = e.clientX;
    startScroll.current = el.scrollLeft;
    last.current = { x: e.clientX, t: performance.now(), v: 0 };

    /* Ojo: acá NO se llama a setPointerCapture.
       Capturar el puntero hace que el navegador redirija el `click`
       posterior al elemento que capturó —el riel— en vez de al botón que
       está debajo del cursor. Capturando desde el pointerdown, un clic
       limpio sobre una tarjeta dejaba de abrir la ficha. La captura se
       toma recién al cruzar el umbral, cuando ya sabemos que el gesto es
       un arrastre y no un clic. */
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<T>) => {
    const el = ref.current;
    if (!el || !pending.current || e.pointerId !== pointerId.current) return;

    const dx = e.clientX - startX.current;

    if (!captured.current) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      // Recién ahora es un arrastre: se toma la captura para no perder el
      // puntero si sale del riel, y se apaga el snap —con
      // `scroll-snap-type: mandatory` el navegador reengancha el scroll a
      // cada paso y el movimiento se siente a los tirones.
      captured.current = true;
      el.setPointerCapture(e.pointerId);
      el.style.scrollSnapType = "none";
      setDragging(true);
    }

    const now = performance.now();
    const dt = now - last.current.t;
    const v = dt > 0 ? (e.clientX - last.current.x) / dt : last.current.v;
    last.current = { x: e.clientX, t: now, v };

    el.scrollLeft = startScroll.current - dx;
  }, []);

  const end = useCallback((e: ReactPointerEvent<T>) => {
    const el = ref.current;
    if (!el || e.pointerId !== pointerId.current) return;

    pending.current = false;
    if (!captured.current) return; // fue un clic: no hay nada que deshacer

    el.releasePointerCapture(e.pointerId);
    setDragging(false);

    // Envión final proporcional a la velocidad de salida: sin esto el riel
    // frena en seco al soltar y se siente rígido. El tope de 600px evita
    // que un golpe rápido mande el riel al otro extremo.
    const fling = Math.max(-600, Math.min(600, -last.current.v * 180));
    if (Math.abs(fling) > 12) {
      el.scrollBy({ left: fling, behavior: "smooth" });
    }

    // Restaurar el snap después del envión: si se restaura antes, el snap
    // pelea con el scroll suave y el riel queda a mitad de camino.
    window.setTimeout(() => {
      if (ref.current) ref.current.style.scrollSnapType = "";
    }, 320);
  }, []);

  /**
   * Se traga el clic que el navegador dispara al terminar un arrastre.
   * Sin esto, soltar el mouse encima de una tarjeta la abre. Solo aplica
   * cuando hubo captura, o sea cuando el gesto fue realmente un arrastre.
   */
  const onClickCapture = useCallback((e: ReactMouseEvent<T>) => {
    if (!captured.current) return;
    e.preventDefault();
    e.stopPropagation();
    captured.current = false;
  }, []);

  /** El navegador arrastra imágenes y enlaces por su cuenta; estorba. */
  const onDragStart = useCallback((e: ReactMouseEvent<T>) => e.preventDefault(), []);

  return {
    ref,
    dragging,
    dragProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
      onClickCapture,
      onDragStart,
    },
  };
}

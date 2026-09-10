"use client";

import { useEffect, useRef } from "react";

interface MousePosition {
  x: number;
  y: number;
}

/**
 * Returns a ref that always holds the latest normalized mouse position.
 * Values range from -0.5 to 0.5 (relative to viewport center).
 * Using a ref instead of state avoids re-renders on every mouse move.
 */
export function useMousePositionRef(): React.RefObject<MousePosition> {
  const positionRef = useRef<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      positionRef.current = {
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5,
      };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return positionRef;
}

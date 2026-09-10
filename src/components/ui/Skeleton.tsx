import { cn } from "@/lib/utils";

/**
 * Bloque de carga con shimmer. La animación vive en globals.css
 * (.av-skeleton) para que no dependa de JS ni de framer-motion.
 *
 * `aria-hidden` a propósito: el estado de carga lo anuncia el contenedor
 * con role="status", no cada rectángulo por separado.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("av-skeleton", className)} />;
}

/** Placeholder de una tarjeta de amenity mientras carga su imagen. */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

/** Placeholder de una fila de tabla en el panel de administración. */
export function RowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div role="status" aria-busy="true" className="flex items-center gap-4 py-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1" />
      ))}
    </div>
  );
}

/** Placeholder del mapa interactivo (carga diferida + datos de Supabase). */
export function MapSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      <Skeleton className="aspect-[16/9] w-full rounded-3xl" />
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-full" />
        ))}
      </div>
    </div>
  );
}

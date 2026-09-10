"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Sprout } from "lucide-react";
import type { AmenityRow } from "@/lib/amenities";
import { seedAmenities, updateAmenity } from "@/app/actions/admin-cms";
import { AdminButton, AdminField, EmptyState, PageHeader } from "./AdminUI";
import { MediaInput, type Feedback } from "./MediaInput";
import { GalleryInput } from "./GalleryInput";
import { cn } from "@/lib/utils";

/* ── Ficha de una amenity ────────────────────────────────────────── */

function AmenityCard({ row }: { row: AmenityRow }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  const save = (formData: FormData) =>
    startTransition(async () => {
      const result = await updateAmenity(formData);
      setFeedback(result);
    });

  return (
    <li className="overflow-hidden rounded-2xl border border-[color:var(--av-border-soft)] bg-[color:var(--av-surface)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- la URL puede
            ser de cualquier host; acá no vale la pena pasar por el optimizador. */}
        <img
          src={row.image}
          alt=""
          className="size-14 shrink-0 rounded-xl object-cover"
          loading="lazy"
        />

        <span className="min-w-0 flex-1">
          <span className="block font-sans text-sm font-medium text-ink">
            {row.title_es || row.id}
          </span>
          <span className="mt-0.5 block truncate font-sans text-[12px] font-light text-ink-muted">
            {row.description_es || "Sin descripción"}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {!row.enabled && (
            <span className="rounded-full border border-[color:var(--av-border)] px-2.5 py-1 font-sans text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              oculta
            </span>
          )}
          {row.gallery && row.gallery.length > 0 && (
            <span className="rounded-full border border-[color:var(--av-border)] px-2.5 py-1 font-sans text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              {row.gallery.length + 1} fotos
            </span>
          )}
          {row.video && (
            <span className="rounded-full border border-[color:var(--av-lux)]/40 px-2.5 py-1 font-sans text-[10px] uppercase tracking-[0.14em] text-lux">
              reel
            </span>
          )}
          <ChevronDown
            className={cn(
              "size-4 text-ink-muted transition-transform duration-300",
              open && "rotate-180"
            )}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </span>
      </button>

      {open && (
        <form
          action={save}
          className={cn(
            "flex flex-col gap-5 border-t border-[color:var(--av-border-soft)] p-5",
            isPending && "opacity-60"
          )}
        >
          <input type="hidden" name="id" value={row.id} />

          <div className="grid gap-5 md:grid-cols-2">
            <MediaInput
              label="Portada"
              name="image"
              defaultValue={row.image}
              accept="image/webp,image/jpeg,image/png,image/avif"
              hint="obligatoria · se ve en la tarjeta"
              onFeedback={setFeedback}
            />
            <MediaInput
              label="Micro-video (reel)"
              name="video"
              defaultValue={row.video}
              accept="video/mp4,video/webm"
              hint="opcional · 6–15 s"
              onFeedback={setFeedback}
            />
          </div>

          <GalleryInput defaultValue={row.gallery} onFeedback={setFeedback} />

          {/* Textos por idioma */}
          {(["es", "en", "pt"] as const).map((locale) => (
            <fieldset
              key={locale}
              className="flex flex-col gap-4 rounded-xl border border-[color:var(--av-border-soft)] p-4"
            >
              <legend className="px-2 font-sans text-[10px] font-medium uppercase tracking-[0.2em] text-lux">
                {locale === "es" ? "Español" : locale === "en" ? "English" : "Português"}
              </legend>

              <AdminField
                label="Título"
                name={`title_${locale}`}
                defaultValue={(row as unknown as Record<string, string | null>)[`title_${locale}`]}
              />
              <AdminField
                label="Descripción corta"
                name={`description_${locale}`}
                defaultValue={
                  (row as unknown as Record<string, string | null>)[`description_${locale}`]
                }
                hint="se ve al abrir la tarjeta"
                textarea
                rows={2}
              />
              <AdminField
                label="Descripción extendida"
                name={`description_long_${locale}`}
                defaultValue={
                  (row as unknown as Record<string, string | null>)[`description_long_${locale}`]
                }
                hint="el texto largo del detalle"
                textarea
                rows={5}
              />
            </fieldset>
          ))}

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2.5 font-sans text-[12px] font-light text-ink-muted">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={row.enabled}
                className="size-4 accent-[color:var(--av-vivo)]"
              />
              Visible en el sitio
            </label>

            <label className="flex items-center gap-2.5 font-sans text-[12px] font-light text-ink-muted">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={row.featured}
                className="size-4 accent-[color:var(--av-vivo)]"
              />
              Destacada
            </label>

            <label className="flex items-center gap-2.5 font-sans text-[12px] font-light text-ink-muted">
              Orden
              <input
                type="number"
                name="sort_order"
                defaultValue={row.sort_order}
                className="w-20 rounded-lg border border-[color:var(--av-border)] bg-[color:var(--av-base)] px-2.5 py-1.5 font-sans text-[13px] text-ink outline-none focus:border-[color:var(--av-vivo)]"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <AdminButton type="submit" disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar cambios"}
            </AdminButton>

            {feedback && (
              <p
                role="status"
                className={cn(
                  "font-sans text-[12px] font-light",
                  feedback.ok ? "text-vivo" : "text-[#E2725B]"
                )}
              >
                {feedback.message}
              </p>
            )}
          </div>
        </form>
      )}
    </li>
  );
}

/* ── Editor ──────────────────────────────────────────────────────── */

export function AmenitiesEditor({ rows }: { rows: AmenityRow[] }) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  const seed = () =>
    startTransition(async () => {
      setFeedback(await seedAmenities());
    });

  return (
    <>
      <PageHeader
        title="Amenities"
        subtitle="Editá la portada, la galería de fotos, el reel, el título y la descripción extendida de cada amenity. Los cambios se publican al guardar."
        actions={
          <AdminButton variant="ghost" onClick={seed} disabled={isPending}>
            <Sprout className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            {rows.length ? "Restaurar textos base" : "Cargar catálogo base"}
          </AdminButton>
        }
      />

      {feedback && (
        <p
          role="status"
          className={cn(
            "mx-6 mt-5 rounded-xl border px-4 py-3 font-sans text-[12px] font-light md:mx-10",
            feedback.ok
              ? "border-[color:var(--av-vivo)]/35 bg-[color:var(--av-vivo)]/10 text-vivo"
              : "border-[#E2725B]/35 bg-[#E2725B]/5 text-[#E2725B]"
          )}
        >
          {feedback.message}
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="La tabla está vacía"
          body="El sitio está mostrando el catálogo estático del código. Tocá «Cargar catálogo base» para copiarlo a la base y poder editarlo desde acá."
        />
      ) : (
        <ul className="flex flex-col gap-2 px-6 py-6 md:px-10">
          {rows.map((row) => (
            <AmenityCard key={row.id} row={row} />
          ))}
        </ul>
      )}
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Save, Trash2 } from "lucide-react";
import { deleteMedia, setSetting } from "@/app/actions/admin-cms";
import { SETTING_LABELS, type SettingKey } from "@/config/media";
import { AdminButton } from "./AdminUI";
import { MediaInput, type Feedback } from "./MediaInput";
import { cn } from "@/lib/utils";

/** Archivo del bucket `media`, tal como lo lista el server component. */
export interface StoredFile {
  name: string;
  url: string;
  size: number | null;
}

export interface MediaSlot {
  key: SettingKey;
  /** Valor efectivo que está sirviendo el sitio ahora. */
  value: string;
  /** Valor de fábrica (el archivo de /public). */
  fallback: string;
  /** true si el valor actual es el de fábrica. */
  isDefault: boolean;
}

function isVideo(src: string) {
  return /\.(mp4|webm)(\?|$)/i.test(src);
}

function formatSize(bytes: number | null) {
  if (bytes == null) return "";
  return bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/* ── Preview ──────────────────────────────────────────────────────── */

/**
 * Vista previa del medio.
 *
 * Usa <img> y <video> crudos, no next/image: la URL la acaba de tipear
 * o subir el usuario y puede apuntar a un dominio que no está en
 * `remotePatterns`. next/image respondería 400 y se vería un cuadro
 * roto en lugar del archivo, cuando lo que se quiere justamente es
 * poder comprobar si la ruta apunta a algo antes de guardarla.
 *
 * El <video> va sin `loop`: es una revisión, no una decoración, y seis
 * loops infinitos a la vez comen CPU mientras se edita.
 */
function Preview({ src }: { src: string }) {
  if (!src) {
    return (
      <div className="grid aspect-[9/16] w-full place-items-center rounded-xl border border-dashed border-[color:var(--av-border)] text-center">
        <span className="px-3 font-sans text-[11px] font-light text-ink-faint">
          Sin medio asignado
        </span>
      </div>
    );
  }

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl border border-[color:var(--av-border-soft)] bg-[color:var(--av-base)]">
      {isVideo(src) ? (
        <video
          src={src}
          muted
          playsInline
          controls
          preload="metadata"
          className="size-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      )}
    </div>
  );
}

/* ── Slot editable ────────────────────────────────────────────────── */

function SlotCard({ slot }: { slot: MediaSlot }) {
  const router = useRouter();
  const [preview, setPreview] = useState(slot.value);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();

  const persist = (value: string, okMessage: string) => {
    startTransition(async () => {
      const result = await setSetting(slot.key, value);
      setFeedback({ ok: result.ok, message: result.ok ? okMessage : result.message });
      // El sitio público ya se revalidó dentro de la action; esto refresca
      // el panel para que la etiqueta "original" quede al día.
      if (result.ok) router.refresh();
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const value = String(new FormData(e.currentTarget).get("value") ?? "").trim();
        persist(value, "Guardado. Ya está en vivo en el sitio.");
      }}
      className="flex flex-col gap-4 rounded-2xl border border-[color:var(--av-border-soft)] bg-[color:var(--av-surface)] p-5 sm:flex-row"
    >
      <div className="w-full shrink-0 sm:w-36">
        <Preview src={preview} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-sans text-[13px] font-medium text-ink">
            {SETTING_LABELS[slot.key]}
          </h3>
          {slot.isDefault && (
            <span className="rounded-full border border-[color:var(--av-border)] px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.14em] text-ink-faint">
              original
            </span>
          )}
        </div>

        <MediaInput
          label="Archivo"
          name="value"
          defaultValue={slot.value}
          accept="video/mp4,video/webm,image/webp,image/jpeg,image/png,image/avif"
          hint="máx. 20 MB"
          onFeedback={setFeedback}
          onChange={setPreview}
        />

        <div className="flex flex-wrap items-center gap-2">
          <AdminButton type="submit" disabled={isPending}>
            <Save className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            {isPending ? "Guardando…" : "Guardar"}
          </AdminButton>

          {/* Guardar vacío borra el valor y getSettings() vuelve a caer al
              archivo de /public: es el botón de deshacer. */}
          {!slot.isDefault && (
            <AdminButton
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                setPreview(slot.fallback);
                persist("", "Restaurado al archivo original.");
              }}
            >
              <RotateCcw className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
              Volver al original
            </AdminButton>
          )}
        </div>

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
  );
}

/* ── Archivos subidos ─────────────────────────────────────────────── */

function StoredFileRow({ file, inUse }: { file: StoredFile; inUse: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-[color:var(--av-border-soft)] px-5 py-3 last:border-b-0">
      <a
        href={file.url}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink-mid transition-colors hover:text-vivo"
        title={file.name}
      >
        {file.name}
      </a>

      <span className="shrink-0 font-sans text-[11px] font-light text-ink-faint">
        {formatSize(file.size)}
      </span>

      {inUse ? (
        <span className="shrink-0 rounded-full border border-[color:var(--av-vivo)]/40 bg-[color:var(--av-vivo)]/10 px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.14em] text-vivo">
          en uso
        </span>
      ) : (
        <AdminButton
          type="button"
          variant="danger"
          disabled={isPending}
          className="shrink-0 px-3 py-1.5"
          onClick={() => {
            startTransition(async () => {
              const result = await deleteMedia(file.name);
              if (result.ok) router.refresh();
              else setError(result.message);
            });
          }}
        >
          <Trash2 className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
          Borrar
        </AdminButton>
      )}

      {error && (
        <p role="status" className="w-full font-sans text-[12px] font-light text-[#E2725B]">
          {error}
        </p>
      )}
    </li>
  );
}

/* ── Vista ────────────────────────────────────────────────────────── */

export function MediaManager({
  slots,
  files,
}: {
  slots: MediaSlot[];
  files: StoredFile[];
}) {
  // Un archivo "en uso" no ofrece botón de borrar: borrarlo dejaría al
  // sitio sirviendo una URL muerta. Primero hay que reemplazar el slot.
  const usedUrls = new Set(slots.map((s) => s.value));

  return (
    <div className="flex flex-col gap-10 px-6 py-8 md:px-10">
      <section>
        <h2 className="mb-1 font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">
          Medios del sitio
        </h2>
        <p className="mb-5 max-w-2xl font-sans text-[13px] font-light leading-relaxed text-ink-muted">
          El video del hero y los cuatro micro-videos de la sección de estilo de
          vida. Subí un archivo o pegá una URL y guardá: el cambio sale en vivo
          sin tocar código ni volver a publicar.
        </p>

        <div className="grid gap-4 xl:grid-cols-2">
          {slots.map((slot) => (
            <SlotCard key={slot.key} slot={slot} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">
          Archivos subidos
        </h2>
        <p className="mb-5 max-w-2xl font-sans text-[13px] font-light leading-relaxed text-ink-muted">
          Todo lo que se subió al bucket <code>media</code>. Los archivos de{" "}
          <code>/public</code> no aparecen acá: viven en el repositorio.
        </p>

        {files.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[color:var(--av-border)] px-5 py-8 text-center font-sans text-[13px] font-light text-ink-faint">
            Todavía no subiste ningún archivo.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-[color:var(--av-border-soft)] bg-[color:var(--av-surface)]">
            {files.map((file) => (
              <StoredFileRow key={file.name} file={file} inUse={usedUrls.has(file.url)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { uploadMedia } from "@/app/actions/admin-cms";
import { AdminButton } from "./AdminUI";
import { optimizeAndCropImage } from "@/lib/image-optimizer";

export type Feedback = { ok: boolean; message: string } | null;

export function MediaInput({
  label,
  name,
  defaultValue,
  accept,
  hint,
  onFeedback,
  onChange,
}: {
  label: string;
  name: string;
  defaultValue: string | null;
  accept: string;
  hint?: string;
  onFeedback: (f: Feedback) => void;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (next: string) => {
    setValue(next);
    onChange?.(next);
  };

  const handleFile = async (rawFile: File) => {
    setUploading(true);
    onFeedback(null);
    
    try {
      // Magia: Si es imagen, la procesamos antes de subirla
      let fileToUpload = rawFile;
      if (rawFile.type.startsWith('image/')) {
        // Configuramos: Max 1920px de ancho y calidad WebP 80%
        fileToUpload = await optimizeAndCropImage(rawFile, { maxWidth: 1920, quality: 0.8 });
      }

      const fd = new FormData();
      fd.append("file", fileToUpload);
      
      const result = await uploadMedia(fd);
      
      if (result.ok && result.url) {
        update(result.url);
        onFeedback({ ok: true, message: `Archivo procesado y subido. Acordate de guardar.` });
      } else {
        onFeedback({ ok: false, message: result.message });
      }
    } catch (error) {
      onFeedback({ ok: false, message: "Error al procesar la imagen." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-sans text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted">
        {label}
        {hint && <span className="ml-2 normal-case tracking-normal opacity-70">{hint}</span>}
      </span>

      <div className="flex gap-2">
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => update(e.target.value)}
          placeholder="/foto.webp o https://…"
          className="min-w-0 flex-1 rounded-xl border border-[color:var(--av-border)] bg-[color:var(--av-base)] px-3.5 py-2.5 font-sans text-[13px] font-light text-ink outline-none focus:border-[color:var(--av-vivo)] placeholder:text-ink-faint"
        />

        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />

        <AdminButton
          type="button"
          variant="ghost"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="shrink-0"
        >
          <Upload className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
          {uploading ? "Procesando…" : "Subir Automático"}
        </AdminButton>
      </div>
    </div>
  );
}
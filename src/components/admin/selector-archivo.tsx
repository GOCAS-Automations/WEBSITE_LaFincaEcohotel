"use client";

import { useId, useRef } from "react";

/**
 * Botón para elegir fotos del dispositivo.
 *
 * El `<input type="file">` nativo pinta su propio botón con el texto del
 * NAVEGADOR, que en un Chrome en inglés dice "Choose Files". En un panel que
 * está entero en español eso desentona, así que el input se esconde (sigue
 * siendo accesible: no se usa `display:none`, que lo sacaría del foco) y se
 * dibuja una etiqueta propia encima.
 */
export function SelectorArchivo({
  onArchivos,
  multiple = false,
  deshabilitado = false,
  etiqueta = "Elegir fotos",
  compacto = false,
}: {
  onArchivos: (archivos: FileList | null) => void;
  multiple?: boolean;
  deshabilitado?: boolean;
  etiqueta?: string;
  compacto?: boolean;
}) {
  const id = useId();
  const campo = useRef<HTMLInputElement>(null);

  return (
    <label
      htmlFor={id}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full bg-petroleo-600 font-semibold text-white transition-colors hover:bg-petroleo-700 ${
        compacto
          ? "px-3 py-1 text-[0.6875rem]"
          : "px-4 py-2 text-[0.8125rem]"
      } ${deshabilitado ? "pointer-events-none opacity-60" : ""}`}
    >
      <input
        ref={campo}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple={multiple}
        disabled={deshabilitado}
        onChange={(evento) => {
          onArchivos(evento.target.files);
          // Se limpia para que volver a elegir el MISMO archivo dispare el
          // evento otra vez.
          if (campo.current) campo.current.value = "";
        }}
        className="sr-only"
      />
      <svg
        viewBox="0 0 24 24"
        className={compacto ? "h-3 w-3" : "h-4 w-4"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 16V4m0 0L8 8m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
      </svg>
      {etiqueta}
    </label>
  );
}

/** Deja solo el nombre del archivo de una dirección larga, para las listas. */
export function nombreDeArchivo(url: string): string {
  try {
    const ruta = url.startsWith("http") ? new URL(url).pathname : url;
    const ultimo = ruta.split("/").filter(Boolean).pop();
    return ultimo ? decodeURIComponent(ultimo) : url;
  } catch {
    return url;
  }
}

"use client";

import { useRef, useState } from "react";

import { CLASE_INPUT } from "./ui";
import {
  AYUDA_DIRECCION,
  esDireccionValida,
  subirImagen,
  type CarpetaSubida,
} from "./subir-imagen";

/**
 * Campo de UNA sola imagen (portadas del CMS, foto de una experiencia).
 *
 * A diferencia de `EditorGaleria`, guarda una única dirección en un input
 * oculto. Ofrece las dos vías de siempre: subir un archivo del dispositivo o
 * pegar una dirección.
 */

type Props = {
  name: string;
  urlInicial: string;
  carpeta?: CarpetaSubida;
  /** Alto de la miniatura; el hero es apaisado y el 404 casi cuadrado. */
  proporcion?: "cuadrada" | "apaisada";
};

export function CampoImagen({
  name,
  urlInicial,
  carpeta = "sitio",
  proporcion = "cuadrada",
}: Props) {
  const [url, setUrl] = useState(urlInicial);
  const [pegado, setPegado] = useState(urlInicial);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rota, setRota] = useState(false);
  const campoArchivo = useRef<HTMLInputElement>(null);

  function aplicar(nueva: string) {
    setUrl(nueva);
    setPegado(nueva);
    setRota(false);
  }

  function aplicarPegado() {
    const valor = pegado.trim();
    if (!valor) {
      // Vaciar el campo es una forma legítima de quitar la imagen.
      setError(null);
      aplicar("");
      return;
    }
    if (!esDireccionValida(valor)) {
      setError(AYUDA_DIRECCION);
      return;
    }
    setError(null);
    aplicar(valor);
  }

  async function subir(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    setError(null);
    setSubiendo(true);
    try {
      aplicar(await subirImagen(archivos[0], carpeta));
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
      if (campoArchivo.current) campoArchivo.current.value = "";
    }
  }

  const claseMiniatura =
    proporcion === "apaisada"
      ? "h-[84px] w-[150px]"
      : "h-[120px] w-[120px]";

  return (
    <div>
      <input type="hidden" name={name} value={url} />

      <div className="flex flex-wrap items-start gap-3.5 rounded-tarjeta bg-crema-900/[0.03] p-3 sm:flex-nowrap">
        <div
          className={`relative shrink-0 overflow-hidden rounded-suave bg-crema-900/10 ${claseMiniatura}`}
        >
          {url && !rota ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setRota(true)}
              onLoad={() => setRota(false)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-2 text-center text-[0.6875rem] leading-snug text-crema-600">
              {url ? "No se pudo cargar" : "Sin imagen"}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          {error && (
            <p className="rounded-suave bg-red-600/[0.08] px-3 py-2 text-[0.75rem] font-medium text-red-800 ring-1 ring-red-600/20">
              {error}
            </p>
          )}

          <div>
            <input
              ref={campoArchivo}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={subiendo}
              onChange={(evento) => void subir(evento.target.files)}
              aria-label="Subir una imagen desde este dispositivo"
              className="block w-full text-[0.8125rem] text-crema-600 file:mr-3 file:rounded-full file:border-0 file:bg-petroleo-600 file:px-4 file:py-2 file:text-[0.8125rem] file:font-semibold file:text-white hover:file:bg-petroleo-700"
            />
            {subiendo && (
              <p className="mt-1.5 text-[0.75rem] font-medium text-petroleo-700">
                Subiendo…
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={pegado}
              onChange={(evento) => setPegado(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter") {
                  evento.preventDefault();
                  aplicarPegado();
                }
              }}
              placeholder="O pega una dirección https://…"
              aria-label="Dirección de la imagen"
              className={`${CLASE_INPUT} py-2 text-[0.8125rem]`}
            />
            <button
              type="button"
              onClick={aplicarPegado}
              className="shrink-0 rounded-suave bg-crema-900/[0.06] px-4 text-[0.8125rem] font-semibold text-crema-900 transition-colors hover:bg-crema-900/[0.1]"
            >
              Usar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

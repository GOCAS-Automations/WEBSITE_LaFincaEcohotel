"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { nombreDeArchivo, SelectorArchivo } from "./selector-archivo";
import { CLASE_INPUT } from "./ui";
import {
  AYUDA_DIRECCION,
  esDireccionValida,
  subirImagen,
  type CarpetaSubida,
} from "./subir-imagen";
import type { ImagenGaleriaAdmin } from "@/lib/admin/tipos";

/**
 * Editor de la galería de una cabaña o de una sección del sitio.
 *
 * Dos formas de añadir fotos, como pidió el cliente:
 *   1. **Subiendo archivos del computador o del celular.** Van al bucket
 *      `imagenes` a través de `/admin/api/galeria/subir`.
 *   2. **Pegando una dirección** de una foto alojada en otro sitio.
 *
 * La PRIMERA imagen de la lista es la portada: es la que sale en las tarjetas
 * del sitio público.
 *
 * Lo que viaja al servidor es el JSON de la lista, en un input oculto.
 */

type Props = {
  name: string;
  inicial: ImagenGaleriaAdmin[];
  carpeta: CarpetaSubida;
  /** Texto del recuadro vacío, para explicar qué se espera en cada sitio. */
  vacio?: string;
  /** Oculta la insignia de "Portada" donde el orden no significa portada. */
  conPortada?: boolean;
};

export function EditorGaleria({
  name,
  inicial,
  carpeta,
  vacio = "Todavía no hay fotos. Sube una desde tu computador o pega una dirección.",
  conPortada = true,
}: Props) {
  const [items, setItems] = useState<ImagenGaleriaAdmin[]>(inicial);
  const [direccion, setDireccion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  function mover(indice: number, delta: number) {
    const destino = indice + delta;
    if (destino < 0 || destino >= items.length) return;
    const siguiente = [...items];
    [siguiente[indice], siguiente[destino]] = [
      siguiente[destino],
      siguiente[indice],
    ];
    setItems(siguiente);
  }

  function hacerPortada(indice: number) {
    if (indice === 0) return;
    const siguiente = [...items];
    const [elegida] = siguiente.splice(indice, 1);
    setItems([elegida, ...siguiente]);
  }

  function quitar(indice: number) {
    setItems(items.filter((_, i) => i !== indice));
  }

  function cambiarAlt(indice: number, alt: string) {
    const siguiente = [...items];
    siguiente[indice] = { ...siguiente[indice], alt };
    setItems(siguiente);
  }

  function anadirDireccion() {
    const valor = direccion.trim();
    if (!valor) return;
    if (!esDireccionValida(valor)) {
      setError(AYUDA_DIRECCION);
      return;
    }
    setError(null);
    setItems([...items, { url: valor, alt: "" }]);
    setDireccion("");
  }

  async function subir(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    setError(null);
    setSubiendo(true);

    const anadidas: ImagenGaleriaAdmin[] = [];
    try {
      // Secuencial y no en paralelo: así una tanda de diez fotos no abre diez
      // conexiones a la vez desde un celular con mala señal.
      for (const archivo of Array.from(archivos)) {
        const url = await subirImagen(archivo, carpeta);
        anadidas.push({ url, alt: "" });
      }
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo subir la imagen.");
    } finally {
      // Las que sí alcanzaron a subir se conservan aunque la tanda falle a
      // medias: repetirlas dejaría copias sueltas en el bucket.
      if (anadidas.length) setItems((actuales) => [...actuales, ...anadidas]);
      setSubiendo(false);
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />

      {error && (
        <p className="mb-3 rounded-suave bg-red-600/[0.08] px-4 py-2.5 text-[0.8125rem] font-medium text-red-800 ring-1 ring-red-600/20">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="mb-4 rounded-suave bg-crema-900/[0.03] px-4 py-6 text-center text-[0.875rem] text-crema-600">
          {vacio}
        </p>
      ) : (
        <ul className="mb-4 space-y-2.5">
          {items.map((item, indice) => (
            <li
              key={`${item.url}-${indice}`}
              className="flex flex-wrap items-start gap-3 rounded-tarjeta bg-crema-900/[0.03] p-2.5 sm:flex-nowrap"
            >
              <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-suave bg-crema-900/10">
                {/* <img> y no next/image: una dirección externa pegada por el
                    cliente no está en `remotePatterns` y el optimizador de Next
                    la rechazaría. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {conPortada && indice === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-petroleo-600 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-white">
                    Portada
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[0.75rem] text-crema-600"
                  title={item.url}
                >
                  {nombreDeArchivo(item.url)}
                </p>
                <input
                  type="text"
                  value={item.alt}
                  onChange={(evento) => cambiarAlt(indice, evento.target.value)}
                  placeholder="Describe la foto en pocas palabras"
                  aria-label={`Descripción de la foto ${indice + 1}`}
                  className={`${CLASE_INPUT} mt-1.5 py-2 text-[0.8125rem]`}
                />
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1">
                <BotonIcono
                  etiqueta="Subir en el orden"
                  alPulsar={() => mover(indice, -1)}
                  deshabilitado={indice === 0}
                >
                  <path d="m6 14 6-6 6 6" />
                </BotonIcono>
                <BotonIcono
                  etiqueta="Bajar en el orden"
                  alPulsar={() => mover(indice, 1)}
                  deshabilitado={indice === items.length - 1}
                >
                  <path d="m6 10 6 6 6-6" />
                </BotonIcono>
                {conPortada && (
                  <button
                    type="button"
                    onClick={() => hacerPortada(indice)}
                    disabled={indice === 0}
                    className="rounded-full px-2.5 py-1.5 text-[0.75rem] font-semibold text-petroleo-700 transition-colors hover:bg-petroleo-600/10 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    Portada
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => quitar(indice)}
                  className="rounded-full px-2.5 py-1.5 text-[0.75rem] font-semibold text-red-700 transition-colors hover:bg-red-600/10"
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-tarjeta bg-crema-900/[0.03] p-3.5">
          <p className="text-[0.8125rem] font-semibold text-crema-900">
            Subir desde este dispositivo
          </p>
          <p className="mt-1 text-[0.75rem] leading-relaxed text-crema-600">
            JPG, PNG o WebP. Máximo 10 MB por foto. Puedes elegir varias a la vez.
          </p>
          <div className="mt-2.5">
            <SelectorArchivo
              multiple
              deshabilitado={subiendo}
              onArchivos={(archivos) => void subir(archivos)}
            />
          </div>
          {subiendo && (
            <p className="mt-2 text-[0.75rem] font-medium text-petroleo-700">
              Subiendo…
            </p>
          )}
        </div>

        <div className="rounded-tarjeta bg-crema-900/[0.03] p-3.5">
          <p className="text-[0.8125rem] font-semibold text-crema-900">
            Pegar una dirección
          </p>
          <p className="mt-1 text-[0.75rem] leading-relaxed text-crema-600">
            Si la foto ya está publicada en internet, copia aquí su dirección.
          </p>
          <div className="mt-2.5 flex gap-2">
            <input
              type="url"
              value={direccion}
              onChange={(evento) => setDireccion(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter") {
                  evento.preventDefault();
                  anadirDireccion();
                }
              }}
              placeholder="https://…"
              aria-label="Dirección de la imagen"
              className={`${CLASE_INPUT} py-2 text-[0.8125rem]`}
            />
            <button
              type="button"
              onClick={anadirDireccion}
              className="shrink-0 rounded-suave bg-crema-900/[0.06] px-4 text-[0.8125rem] font-semibold text-crema-900 transition-colors hover:bg-crema-900/[0.1]"
            >
              Añadir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BotonIcono({
  etiqueta,
  alPulsar,
  deshabilitado,
  children,
}: {
  etiqueta: string;
  alPulsar: () => void;
  deshabilitado?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={deshabilitado}
      aria-label={etiqueta}
      title={etiqueta}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-crema-700 transition-colors hover:bg-crema-900/[0.07] disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}

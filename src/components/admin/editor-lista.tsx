"use client";

import { useState } from "react";

import { SelectorArchivo } from "./selector-archivo";
import { CLASE_INPUT } from "./ui";
import {
  AYUDA_DIRECCION,
  esDireccionValida,
  subirImagen,
  type CarpetaSubida,
} from "./subir-imagen";

/**
 * Editor de listas de fichas repetidas: preguntas frecuentes, testimonios,
 * instalaciones, cifras destacadas, pasos…
 *
 * Cada elemento es un objeto de campos de texto (y, si hace falta, una foto).
 * Se pueden añadir, quitar y reordenar. Lo que viaja al servidor es el JSON de
 * la lista completa, en un input oculto: una sola clave del CMS, un solo
 * guardado, sin campos numerados a mano en el formulario.
 */

export type CampoLista = {
  clave: string;
  etiqueta: string;
  tipo: "texto" | "parrafo" | "imagen";
  marcador?: string;
  /** Carpeta del bucket cuando `tipo` es "imagen". */
  carpeta?: CarpetaSubida;
};

type Elemento = Record<string, string>;

export function EditorLista({
  name,
  inicial,
  campos,
  etiquetaElemento,
  maximo = 40,
  vacio = "Todavía no hay nada en esta lista.",
}: {
  name: string;
  inicial: Elemento[];
  campos: CampoLista[];
  /** Singular, para los botones: "pregunta", "testimonio", "instalación". */
  etiquetaElemento: string;
  maximo?: number;
  vacio?: string;
}) {
  const [items, setItems] = useState<Elemento[]>(() =>
    inicial.map((item) => normalizar(item, campos)),
  );

  function actualizar(indice: number, clave: string, valor: string) {
    setItems((actuales) =>
      actuales.map((item, i) =>
        i === indice ? { ...item, [clave]: valor } : item,
      ),
    );
  }

  function anadir() {
    if (items.length >= maximo) return;
    setItems([...items, normalizar({}, campos)]);
  }

  function quitar(indice: number) {
    setItems(items.filter((_, i) => i !== indice));
  }

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

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />

      {items.length === 0 ? (
        <p className="mb-3 rounded-suave bg-crema-900/[0.03] px-4 py-6 text-center text-[0.875rem] text-crema-600">
          {vacio}
        </p>
      ) : (
        <ul className="mb-3 space-y-3">
          {items.map((item, indice) => (
            <li
              key={indice}
              className="rounded-tarjeta bg-crema-900/[0.03] p-3.5 ring-1 ring-crema-900/[0.05]"
            >
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <span className="text-[0.75rem] font-semibold uppercase tracking-wide text-crema-600">
                  {etiquetaElemento} {indice + 1}
                </span>
                <div className="flex items-center gap-1">
                  <BotonMini
                    etiqueta="Subir"
                    alPulsar={() => mover(indice, -1)}
                    deshabilitado={indice === 0}
                  >
                    ↑
                  </BotonMini>
                  <BotonMini
                    etiqueta="Bajar"
                    alPulsar={() => mover(indice, 1)}
                    deshabilitado={indice === items.length - 1}
                  >
                    ↓
                  </BotonMini>
                  <button
                    type="button"
                    onClick={() => quitar(indice)}
                    className="rounded-full px-2.5 py-1 text-[0.75rem] font-semibold text-red-700 transition-colors hover:bg-red-600/10"
                  >
                    Quitar
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {campos.map((campo) => (
                  <div key={campo.clave}>
                    <label className="mb-1 block text-[0.75rem] font-semibold text-crema-800">
                      {campo.etiqueta}
                    </label>
                    {campo.tipo === "parrafo" ? (
                      <textarea
                        value={item[campo.clave] ?? ""}
                        onChange={(evento) =>
                          actualizar(indice, campo.clave, evento.target.value)
                        }
                        placeholder={campo.marcador}
                        rows={3}
                        className={`${CLASE_INPUT} py-2 text-[0.8125rem] leading-relaxed`}
                      />
                    ) : campo.tipo === "imagen" ? (
                      <MiniCampoImagen
                        valor={item[campo.clave] ?? ""}
                        carpeta={campo.carpeta ?? "sitio"}
                        alCambiar={(valor) =>
                          actualizar(indice, campo.clave, valor)
                        }
                      />
                    ) : (
                      <input
                        type="text"
                        value={item[campo.clave] ?? ""}
                        onChange={(evento) =>
                          actualizar(indice, campo.clave, evento.target.value)
                        }
                        placeholder={campo.marcador}
                        className={`${CLASE_INPUT} py-2 text-[0.8125rem]`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={anadir}
        disabled={items.length >= maximo}
        className="rounded-full bg-crema-900/[0.06] px-4 py-2 text-[0.8125rem] font-semibold text-crema-900 transition-colors hover:bg-crema-900/[0.1] disabled:opacity-50"
      >
        + Añadir {etiquetaElemento}
      </button>
    </div>
  );
}

function normalizar(item: Elemento, campos: CampoLista[]): Elemento {
  const salida: Elemento = {};
  for (const campo of campos) {
    const valor = item[campo.clave];
    salida[campo.clave] = typeof valor === "string" ? valor : "";
  }
  return salida;
}

function BotonMini({
  etiqueta,
  alPulsar,
  deshabilitado,
  children,
}: {
  etiqueta: string;
  alPulsar: () => void;
  deshabilitado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={deshabilitado}
      aria-label={etiqueta}
      title={etiqueta}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[0.875rem] text-crema-700 transition-colors hover:bg-crema-900/[0.07] disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

/** Versión compacta del campo de imagen, para usar dentro de una ficha. */
function MiniCampoImagen({
  valor,
  carpeta,
  alCambiar,
}: {
  valor: string;
  carpeta: CarpetaSubida;
  alCambiar: (valor: string) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    setError(null);
    setSubiendo(true);
    try {
      alCambiar(await subirImagen(archivos[0], carpeta));
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo subir.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-2.5 sm:flex-nowrap">
      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-suave bg-crema-900/10">
        {valor ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={valor}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[0.625rem] text-crema-600">
            Sin foto
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <input
          type="text"
          value={valor}
          onChange={(evento) => alCambiar(evento.target.value)}
          onBlur={(evento) => {
            const limpio = evento.target.value.trim();
            if (limpio && !esDireccionValida(limpio)) setError(AYUDA_DIRECCION);
            else setError(null);
          }}
          placeholder="https://…"
          className={`${CLASE_INPUT} py-1.5 text-[0.75rem]`}
        />
        <SelectorArchivo
          compacto
          etiqueta="Elegir foto"
          deshabilitado={subiendo}
          onArchivos={(archivos) => void subir(archivos)}
        />
        {subiendo && (
          <p className="text-[0.6875rem] font-medium text-petroleo-700">
            Subiendo…
          </p>
        )}
        {error && <p className="text-[0.6875rem] text-red-700">{error}</p>}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";

import { guardarExtraAction } from "./acciones";
import { TEXTOS_EXTRA, rutaDeTipo } from "./rutas";
import { CampoImagen } from "@/components/admin/campo-imagen";
import { FormularioAccion } from "@/components/admin/formulario-accion";
import {
  AreaTexto,
  Campo,
  CLASE_INPUT,
  Entrada,
} from "@/components/admin/ui";
import type { Extra, TipoExtra } from "@/lib/tipos/basedatos";

export function FormularioExtra({
  tipo,
  extra,
}: {
  tipo: TipoExtra;
  extra: Extra | null;
}) {
  const textos = TEXTOS_EXTRA[tipo];

  return (
    <FormularioAccion
      accion={guardarExtraAction}
      etiquetaEnviar={
        extra ? "Guardar cambios" : `Crear ${textos.singular}`
      }
      secundario={
        <Link
          href={rutaDeTipo(tipo)}
          className="text-[0.875rem] font-semibold text-crema-700 underline-offset-4 hover:underline"
        >
          Cancelar
        </Link>
      }
    >
      <input type="hidden" name="tipo" value={tipo} />
      {extra && <input type="hidden" name="id" value={extra.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo etiqueta="Nombre" htmlFor="nombre" obligatorio>
          <Entrada
            id="nombre"
            name="nombre"
            defaultValue={extra?.nombre ?? ""}
            required
            maxLength={160}
            placeholder={
              tipo === "experiencia" ? "Aniversario con Amor" : "Transporte desde Cali"
            }
          />
        </Campo>

        <Campo
          etiqueta="Precio"
          htmlFor="precio"
          obligatorio
          ayuda="En pesos, sin centavos. Escribe 150000 o 150.000."
        >
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[0.9375rem] text-crema-500"
              aria-hidden="true"
            >
              $
            </span>
            <input
              id="precio"
              name="precio"
              type="text"
              inputMode="numeric"
              required
              defaultValue={extra?.precio ?? ""}
              placeholder="150000"
              className={`${CLASE_INPUT} pl-8`}
            />
          </div>
        </Campo>

        <Campo
          etiqueta="Qué incluye"
          htmlFor="descripcion"
          className="sm:col-span-2"
          ayuda="Es el texto que lee el huésped. Cuenta con detalle qué recibe."
        >
          <AreaTexto
            id="descripcion"
            name="descripcion"
            defaultValue={extra?.descripcion ?? ""}
            maxLength={4000}
            rows={5}
            placeholder="Incluye torta para dos, botella de vino, arreglo floral…"
          />
        </Campo>

        <Campo
          etiqueta="Orden en el listado"
          htmlFor="orden"
          ayuda="El número más bajo aparece primero."
        >
          <Entrada
            id="orden"
            name="orden"
            type="number"
            min={0}
            max={9999}
            defaultValue={extra?.orden ?? 0}
          />
        </Campo>

        <div className="sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-tarjeta bg-crema-900/[0.03] p-3.5">
            <input
              type="checkbox"
              name="activo"
              defaultChecked={extra?.activo ?? true}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-petroleo-600)]"
            />
            <span>
              <span className="block text-[0.875rem] font-semibold text-crema-900">
                Mostrar en el sitio web
              </span>
              <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-crema-600">
                Si lo desmarcas, deja de ofrecerse en el sitio pero no se borra
                nada.
              </span>
            </span>
          </label>
        </div>

        <Campo etiqueta="Foto" className="sm:col-span-2">
          <CampoImagen
            name="imagen_url"
            urlInicial={extra?.imagen_url ?? ""}
            carpeta={textos.carpeta}
            proporcion="apaisada"
          />
        </Campo>
      </div>
    </FormularioAccion>
  );
}

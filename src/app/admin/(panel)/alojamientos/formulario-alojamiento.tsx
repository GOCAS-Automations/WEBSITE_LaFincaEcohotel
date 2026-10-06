"use client";

import Link from "next/link";
import { useState } from "react";

import { guardarAlojamientoAction } from "./acciones";
import { Chips } from "@/components/admin/chips";
import { EditorGaleria } from "@/components/admin/editor-galeria";
import { FormularioAccion } from "@/components/admin/formulario-accion";
import {
  AreaTexto,
  Campo,
  CLASE_INPUT,
  Divisor,
  Entrada,
} from "@/components/admin/ui";
import type { TarifaAdmin } from "@/lib/admin/datos";
import { slugificar } from "@/lib/admin/slug";
import { resumirDias, type ImagenGaleriaAdmin } from "@/lib/admin/tipos";
import type { Alojamiento } from "@/lib/tipos/basedatos";

const AMENIDADES_SUGERIDAS = [
  "Cama doble",
  "Baño privado",
  "Agua caliente",
  "Vista a la montaña",
  "Jacuzzi privado",
  "Terraza",
  "Hamaca",
  "Chimenea",
  "Wifi",
  "Admite mascotas",
];

/**
 * Un plan de hospedaje dentro de la ficha de la cabaña.
 *
 * El interruptor NO es una columna de la base: encendido significa «existe la
 * tarifa de esta cabaña para este plan», y apagarlo la borra. Se explica en
 * pantalla porque es la diferencia entre pausar y dejar de vender.
 */
function FilaTarifa({ tarifa }: { tarifa: TarifaAdmin }) {
  const [ofrecido, setOfrecido] = useState(tarifa.ofrecido);

  return (
    <div className="rounded-tarjeta bg-crema-900/[0.03] p-3.5">
      <input type="hidden" name="plan_id" value={tarifa.plan_id} />

      <label
        htmlFor={`ofrece_${tarifa.plan_id}`}
        className="flex cursor-pointer items-start gap-3"
      >
        <input
          id={`ofrece_${tarifa.plan_id}`}
          type="checkbox"
          name={`ofrece_${tarifa.plan_id}`}
          checked={ofrecido}
          onChange={(evento) => setOfrecido(evento.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-petroleo-600)]"
        />
        <span className="min-w-0">
          <span className="block text-[0.875rem] font-semibold text-crema-900">
            Se ofrece con el plan {tarifa.plan_nombre}
          </span>
          <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-crema-600">
            {ofrecido
              ? `Días en que aplica este plan: ${resumirDias(tarifa.dias_aplica).toLowerCase()}.`
              : "Apagado: esta cabaña no aparece cuando el huésped elige este plan."}
          </span>
        </span>
      </label>

      {ofrecido && (
        <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`precio_${tarifa.plan_id}`}
              className="mb-1.5 block text-[0.8125rem] font-semibold text-crema-900"
            >
              Precio por noche
            </label>
            <div className="relative">
              <span
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[0.9375rem] text-crema-500"
                aria-hidden="true"
              >
                $
              </span>
              <input
                id={`precio_${tarifa.plan_id}`}
                name={`precio_${tarifa.plan_id}`}
                type="text"
                inputMode="numeric"
                defaultValue={
                  tarifa.precio_noche === null ? "" : tarifa.precio_noche
                }
                placeholder="480000"
                className={`${CLASE_INPUT} pl-8`}
              />
            </div>
            <p className="mt-1.5 text-[0.75rem] text-crema-600">
              Lo que se cobra por noche cuando viajan dos personas.
            </p>
          </div>

          <div>
            <label
              htmlFor={`precio_1_${tarifa.plan_id}`}
              className="mb-1.5 block text-[0.8125rem] font-semibold text-crema-900"
            >
              Precio si viaja una sola persona
            </label>
            <div className="relative">
              <span
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[0.9375rem] text-crema-500"
                aria-hidden="true"
              >
                $
              </span>
              <input
                id={`precio_1_${tarifa.plan_id}`}
                name={`precio_1_${tarifa.plan_id}`}
                type="text"
                inputMode="numeric"
                defaultValue={
                  tarifa.precio_noche_1_persona === null
                    ? ""
                    : tarifa.precio_noche_1_persona
                }
                placeholder="Opcional"
                className={`${CLASE_INPUT} pl-8`}
              />
            </div>
            <p className="mt-1.5 text-[0.75rem] text-crema-600">
              Déjalo vacío si se cobra igual venga una persona o dos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Una temporada activa o próxima que cambia los precios de esta cabaña. */
export type TemporadaDeLaCabana = {
  id: string;
  nombre: string;
  /** «01/12/2026 al 08/01/2027». */
  fechas: string;
  /** Cierto si es solo de esta cabaña; falso si es de todas. */
  soloEsta: boolean;
};

export function FormularioAlojamiento({
  alojamiento,
  galeria,
  tarifas,
  temporadas = [],
}: {
  alojamiento: Alojamiento | null;
  galeria: ImagenGaleriaAdmin[];
  tarifas: TarifaAdmin[];
  temporadas?: TemporadaDeLaCabana[];
}) {
  const [nombre, setNombre] = useState(alojamiento?.nombre ?? "");
  const [slug, setSlug] = useState(alojamiento?.slug ?? "");
  const [slugTocado, setSlugTocado] = useState(Boolean(alojamiento?.slug));

  const slugMostrado = slugTocado ? slug : slugificar(nombre);

  return (
    <FormularioAccion
      accion={guardarAlojamientoAction}
      etiquetaEnviar={alojamiento ? "Guardar cambios" : "Crear cabaña"}
      secundario={
        <Link
          href="/admin/alojamientos"
          className="text-[0.875rem] font-semibold text-crema-700 underline-offset-4 hover:underline"
        >
          Cancelar
        </Link>
      }
    >
      {alojamiento && <input type="hidden" name="id" value={alojamiento.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo etiqueta="Nombre de la cabaña" htmlFor="nombre" obligatorio>
          <Entrada
            id="nombre"
            name="nombre"
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            required
            maxLength={120}
            placeholder="Cabaña 06"
          />
        </Campo>

        <Campo
          etiqueta="Dirección en el sitio web"
          htmlFor="slug"
          ayuda={`Se verá como lafincaecohotel.com/alojamientos/${slugMostrado || "…"}`}
        >
          <Entrada
            id="slug"
            name="slug"
            value={slugMostrado}
            onChange={(evento) => {
              setSlugTocado(true);
              setSlug(evento.target.value);
            }}
            maxLength={80}
            placeholder="cabana-06"
          />
        </Campo>

        <Campo
          etiqueta="Descripción"
          htmlFor="descripcion"
          className="sm:col-span-2"
          ayuda="Es el texto que lee el huésped en la ficha de la cabaña."
        >
          <AreaTexto
            id="descripcion"
            name="descripcion"
            defaultValue={alojamiento?.descripcion ?? ""}
            maxLength={6000}
            rows={5}
            placeholder="Cabaña independiente para dos, con cama doble, baño privado y vista al bosque…"
          />
        </Campo>

        <Campo
          etiqueta="Cuántas personas caben"
          htmlFor="capacidad"
          obligatorio
        >
          <Entrada
            id="capacidad"
            name="capacidad"
            type="number"
            min={1}
            max={30}
            required
            defaultValue={alojamiento?.capacidad ?? 2}
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
            defaultValue={alojamiento?.orden ?? 0}
          />
        </Campo>

        <Campo
          etiqueta="Comodidades"
          className="sm:col-span-2"
          ayuda="Escribe una y presiona Enter. Salen como lista en la ficha de la cabaña."
        >
          <Chips
            name="amenidades"
            inicial={alojamiento?.amenidades ?? []}
            sugerencias={AMENIDADES_SUGERIDAS}
            marcador="Jacuzzi privado"
          />
        </Campo>

        <div className="sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-tarjeta bg-crema-900/[0.03] p-3.5">
            <input
              type="checkbox"
              name="activo"
              defaultChecked={alojamiento?.activo ?? true}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-petroleo-600)]"
            />
            <span>
              <span className="block text-[0.875rem] font-semibold text-crema-900">
                Mostrar esta cabaña en el sitio web
              </span>
              <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-crema-600">
                Si la desmarcas, la cabaña desaparece del sitio público pero no
                se borra nada: sus reservas y sus fotos siguen aquí.
              </span>
            </span>
          </label>
        </div>

        <Divisor titulo="Planes y precios por noche" />

        <div className="sm:col-span-2">
          <p className="mb-4 text-[0.8125rem] leading-relaxed text-crema-700">
            Enciende los planes con los que se puede reservar esta cabaña y
            ponle a cada uno su precio por noche.{" "}
            <strong>Si apagas un plan, esta cabaña deja de ofrecerse con
            ese plan</strong>: no aparecerá al reservar. Los precios se
            escriben en pesos, sin centavos:{" "}
            <span className="font-semibold">480000</span> o{" "}
            <span className="font-semibold">480.000</span>, como prefieras.
          </p>
          <div className="grid gap-3">
            {tarifas.length === 0 ? (
              <p className="rounded-tarjeta bg-crema-900/[0.03] p-3.5 text-[0.8125rem] leading-relaxed text-crema-700">
                Todavía no hay planes de hospedaje. Créalos en «Planes» y
                vuelve aquí para ponerles precio.
              </p>
            ) : (
              tarifas.map((tarifa) => (
                <FilaTarifa key={tarifa.plan_id} tarifa={tarifa} />
              ))
            )}
          </div>
          <p className="mt-3 text-[0.75rem] leading-relaxed text-crema-600">
            Los planes de día (los que no incluyen noche) no se listan aquí:
            llevan un solo precio para todo el hotel, que se edita en «Planes».
          </p>
          {alojamiento ? (
            <p className="mt-3 rounded-tarjeta bg-dorado-500/[0.08] p-3.5 text-[0.8125rem] leading-relaxed text-crema-800 ring-1 ring-dorado-500/20">
              {temporadas.length === 0 ? (
                <>
                  Estos son los precios de todo el año: ninguna tarifa
                  diferencial los cambia ahora.{" "}
                </>
              ) : (
                <>
                  <span className="font-semibold">
                    Tarifas diferenciales que cambian estos precios:
                  </span>{" "}
                  {temporadas.map((temporada, indice) => (
                    <span key={temporada.id}>
                      {indice > 0 ? "; " : ""}«{temporada.nombre}» ({temporada.fechas},{" "}
                      {temporada.soloEsta ? "solo esta cabaña" : "todas las cabañas"})
                    </span>
                  ))}
                  .{" "}
                </>
              )}
              <Link
                href="/admin/tarifas-diferenciales"
                className="font-semibold text-petroleo-700 underline-offset-4 hover:underline"
              >
                {temporadas.length === 0
                  ? "Crear una en «Tarifas diferenciales»"
                  : "Verlas en «Tarifas diferenciales»"}
              </Link>
            </p>
          ) : null}
        </div>

        <Divisor titulo="Fotos de la cabaña" />

        <div className="sm:col-span-2">
          <p className="mb-3 text-[0.8125rem] leading-relaxed text-crema-700">
            La primera foto es la <strong>portada</strong>: es la que se ve en el
            listado de cabañas. Ordénalas con las flechas.
          </p>
          <EditorGaleria
            name="galeria"
            inicial={galeria}
            carpeta="alojamientos"
            vacio="Esta cabaña todavía no tiene fotos. Sube algunas desde tu computador o pega direcciones."
          />
        </div>
      </div>
    </FormularioAccion>
  );
}

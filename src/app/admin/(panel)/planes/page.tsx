import type { Metadata } from "next";
import Link from "next/link";

import {
  alternarActivoPlanAction,
  eliminarPlanAction,
  guardarOrdenPlanesAction,
} from "./acciones";
import { Aviso } from "@/components/admin/aviso";
import { BotonEnviar } from "@/components/admin/boton-enviar";
import {
  CabeceraTarjeta,
  CLASE_INPUT,
  CuerpoTarjeta,
  EnlaceBoton,
  EncabezadoPagina,
  EstadoVacio,
  Pastilla,
  Tarjeta,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { listarPlanes, mapaDeTarifas } from "@/lib/admin/datos";

export const metadata: Metadata = { title: "Planes tarifarios" };
export const dynamic = "force-dynamic";

export default async function PaginaPlanes({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const [planes, tarifas] = await Promise.all([
    listarPlanes(supabase),
    mapaDeTarifas(supabase),
  ]);

  function cabanasConPrecio(planId: string): number {
    return Object.keys(tarifas).filter((clave) => clave.endsWith(`|${planId}`))
      .length;
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Planes tarifarios"
        descripcion="Los planes que el huésped elige al reservar (Entre Semana, Estándar, Premium…): su nombre, su descripción y qué incluye cada uno. El precio de cada plan se pone por cabaña, en «Cabañas»."
        accion={<EnlaceBoton href="/admin/planes/nueva">Añadir plan</EnlaceBoton>}
      />

      <Aviso ok={params.ok} error={params.error} />

      {planes.length === 0 ? (
        <Tarjeta>
          <CuerpoTarjeta>
            <EstadoVacio
              titulo="Todavía no hay planes"
              descripcion="Un plan es lo que el huésped compara al reservar: qué incluye y a qué precio, cabaña por cabaña."
              accion={
                <EnlaceBoton href="/admin/planes/nueva">
                  Añadir el primer plan
                </EnlaceBoton>
              }
            />
          </CuerpoTarjeta>
        </Tarjeta>
      ) : (
        <form action={guardarOrdenPlanesAction}>
          <Tarjeta>
            <CabeceraTarjeta
              titulo={`${planes.length} ${planes.length === 1 ? "plan" : "planes"}`}
              descripcion="El número de orden decide en qué posición aparece cada plan al comparar precios."
              accion={
                <BotonEnviar tono="secundario" tamano="sm">
                  Guardar orden
                </BotonEnviar>
              }
            />
            <ul className="divide-y divide-crema-900/[0.07]">
              {planes.map((plan) => {
                const incluye = plan.incluye?.length ?? 0;
                const cabanas = cabanasConPrecio(plan.id);

                return (
                  <li
                    key={plan.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:flex-nowrap sm:px-6"
                  >
                    <div className="min-w-[9rem] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/planes/${plan.id}`}
                          className="font-titulo text-[0.9375rem] font-semibold text-crema-900 underline-offset-4 hover:underline"
                        >
                          {plan.nombre}
                        </Link>
                        {plan.activo ? (
                          <Pastilla tono="verde">Visible</Pastilla>
                        ) : (
                          <Pastilla tono="gris">Pausado</Pastilla>
                        )}
                      </div>
                      <p className="mt-0.5 text-[0.75rem] text-crema-600">
                        {cabanas === 0
                          ? "sin precio en ninguna cabaña"
                          : `con precio en ${cabanas} ${cabanas === 1 ? "cabaña" : "cabañas"}`}
                        <span className="mx-1.5">·</span>
                        {incluye} {incluye === 1 ? "ítem incluido" : "ítems incluidos"}
                      </p>
                    </div>

                    <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
                      <label className="sr-only" htmlFor={`orden__${plan.id}`}>
                        Orden de {plan.nombre}
                      </label>
                      <div className="w-[4.5rem]">
                        <input
                          id={`orden__${plan.id}`}
                          name={`orden__${plan.id}`}
                          type="number"
                          min={0}
                          max={9999}
                          defaultValue={plan.orden ?? 0}
                          className={`${CLASE_INPUT} px-2 py-1.5 text-center text-[0.8125rem]`}
                        />
                      </div>
                      <Link
                        href={`/admin/planes/${plan.id}`}
                        className="rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold text-petroleo-700 transition-colors hover:bg-petroleo-600/10"
                      >
                        Editar
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Tarjeta>
        </form>
      )}

      {planes.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {planes.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-tarjeta bg-white px-4 py-3 shadow-tenue ring-1 ring-crema-900/[0.06]"
            >
              <span className="text-[0.875rem] font-semibold text-crema-900">
                {plan.nombre}
              </span>
              <div className="flex items-center gap-1">
                <form action={alternarActivoPlanAction}>
                  <input type="hidden" name="id" value={plan.id} />
                  <input
                    type="hidden"
                    name="activo"
                    value={plan.activo ? "false" : "true"}
                  />
                  <BotonEnviar
                    tono="fantasma"
                    tamano="sm"
                    etiquetaEnEspera="Cambiando…"
                  >
                    {plan.activo ? "Pausar" : "Mostrar"}
                  </BotonEnviar>
                </form>
                <form action={eliminarPlanAction}>
                  <input type="hidden" name="id" value={plan.id} />
                  <BotonEnviar
                    tono="peligro"
                    tamano="sm"
                    etiquetaEnEspera="Borrando…"
                    confirmar={`¿Seguro que quieres borrar «${plan.nombre}»? Esta acción no se puede deshacer.`}
                  >
                    Borrar
                  </BotonEnviar>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

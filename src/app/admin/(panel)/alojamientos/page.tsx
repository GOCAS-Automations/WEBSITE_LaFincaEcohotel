import type { Metadata } from "next";
import Link from "next/link";

import {
  alternarActivoAlojamientoAction,
  eliminarAlojamientoAction,
  guardarOrdenAlojamientosAction,
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
import {
  conteoDeGalerias,
  listarAlojamientos,
  mapaDeTarifas,
  portadasDeAlojamientos,
} from "@/lib/admin/datos";
import { formatearCOP } from "@/lib/utils/formato";

export const metadata: Metadata = { title: "Cabañas" };
export const dynamic = "force-dynamic";

export default async function PaginaAlojamientos({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const [alojamientos, galerias, portadas, tarifas] = await Promise.all([
    listarAlojamientos(supabase),
    conteoDeGalerias(supabase),
    portadasDeAlojamientos(supabase),
    mapaDeTarifas(supabase),
  ]);

  function precioDesde(alojamientoId: string): number | null {
    const precios = Object.entries(tarifas)
      .filter(([clave]) => clave.startsWith(`${alojamientoId}|`))
      .map(([, precio]) => precio);
    return precios.length ? Math.min(...precios) : null;
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Cabañas"
        descripcion="Las cabañas que se publican en el sitio, con sus fotos, sus comodidades y sus precios por plan."
        accion={
          <EnlaceBoton href="/admin/alojamientos/nueva">
            Añadir cabaña
          </EnlaceBoton>
        }
      />

      <Aviso ok={params.ok} error={params.error} />

      {alojamientos.length === 0 ? (
        <Tarjeta>
          <CuerpoTarjeta>
            <EstadoVacio
              titulo="Todavía no hay cabañas"
              descripcion="Aquí se administran las cabañas que ve el huésped en el sitio: nombre, descripción, comodidades, fotos y precio de cada plan."
              accion={
                <EnlaceBoton href="/admin/alojamientos/nueva">
                  Añadir la primera cabaña
                </EnlaceBoton>
              }
            />
          </CuerpoTarjeta>
        </Tarjeta>
      ) : (
        <form action={guardarOrdenAlojamientosAction}>
          <Tarjeta>
            <CabeceraTarjeta
              titulo={`${alojamientos.length} ${alojamientos.length === 1 ? "cabaña" : "cabañas"}`}
              descripcion="El número de orden decide en qué posición aparece cada una en el sitio."
              accion={
                <BotonEnviar tono="secundario" tamano="sm">
                  Guardar orden
                </BotonEnviar>
              }
            />
            <ul className="divide-y divide-crema-900/[0.07]">
              {alojamientos.map((alojamiento) => {
                const fotos = galerias.get(alojamiento.id) ?? 0;
                const desde = precioDesde(alojamiento.id);
                const portada = portadas.get(alojamiento.id);

                return (
                  <li
                    key={alojamiento.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:flex-nowrap sm:px-6"
                  >
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-suave bg-crema-900/10">
                      {portada ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={portada}
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

                    <div className="min-w-[9rem] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/alojamientos/${alojamiento.id}`}
                          className="font-titulo text-[0.9375rem] font-semibold text-crema-900 underline-offset-4 hover:underline"
                        >
                          {alojamiento.nombre}
                        </Link>
                        {alojamiento.activo ? (
                          <Pastilla tono="verde">Visible</Pastilla>
                        ) : (
                          <Pastilla tono="gris">Pausada</Pastilla>
                        )}
                      </div>
                      <p className="mt-0.5 text-[0.75rem] text-crema-600">
                        {fotos} {fotos === 1 ? "foto" : "fotos"}
                        <span className="mx-1.5">·</span>
                        {desde === null
                          ? "sin precio"
                          : `desde ${formatearCOP(desde)}`}
                        <span className="mx-1.5">·</span>
                        {alojamiento.capacidad}{" "}
                        {alojamiento.capacidad === 1 ? "persona" : "personas"}
                      </p>
                    </div>

                    <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
                      <label className="sr-only" htmlFor={`orden__${alojamiento.id}`}>
                        Orden de {alojamiento.nombre}
                      </label>
                      {/* El ancho se fija en el contenedor: `CLASE_INPUT` ya
                          trae `w-full` y una clase de ancho puesta después no
                          siempre gana en Tailwind (manda el orden del CSS
                          generado, no el del atributo). */}
                      <div className="w-[4.5rem]">
                        <input
                          id={`orden__${alojamiento.id}`}
                          name={`orden__${alojamiento.id}`}
                          type="number"
                          min={0}
                          max={9999}
                          defaultValue={alojamiento.orden ?? 0}
                          className={`${CLASE_INPUT} px-2 py-1.5 text-center text-[0.8125rem]`}
                        />
                      </div>
                      <Link
                        href={`/admin/alojamientos/${alojamiento.id}`}
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

      {alojamientos.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {alojamientos.map((alojamiento) => (
            <div
              key={alojamiento.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-tarjeta bg-white px-4 py-3 shadow-tenue ring-1 ring-crema-900/[0.06]"
            >
              <span className="text-[0.875rem] font-semibold text-crema-900">
                {alojamiento.nombre}
              </span>
              <div className="flex items-center gap-1">
                <form action={alternarActivoAlojamientoAction}>
                  <input type="hidden" name="id" value={alojamiento.id} />
                  <input
                    type="hidden"
                    name="activo"
                    value={alojamiento.activo ? "false" : "true"}
                  />
                  <BotonEnviar
                    tono="fantasma"
                    tamano="sm"
                    etiquetaEnEspera="Cambiando…"
                  >
                    {alojamiento.activo ? "Pausar" : "Mostrar"}
                  </BotonEnviar>
                </form>
                <form action={eliminarAlojamientoAction}>
                  <input type="hidden" name="id" value={alojamiento.id} />
                  <BotonEnviar
                    tono="peligro"
                    tamano="sm"
                    etiquetaEnEspera="Borrando…"
                    confirmar={`¿Seguro que quieres borrar «${alojamiento.nombre}»? Esta acción no se puede deshacer.`}
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

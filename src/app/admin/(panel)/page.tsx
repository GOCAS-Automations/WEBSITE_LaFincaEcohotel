import type { Metadata } from "next";
import Link from "next/link";

import { Aviso } from "@/components/admin/aviso";
import {
  CabeceraTarjeta,
  CuerpoTarjeta,
  EnlaceBoton,
  EncabezadoPagina,
  EstadoVacio,
  Indicador,
  Pastilla,
  Tarjeta,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import {
  listarAlojamientos,
  listarBloqueos,
  listarPlanes,
  listarReservas,
} from "@/lib/admin/datos";
import { fechaLarga, hoyISO, rangoCorto, sumarDiasISO } from "@/lib/admin/fechas";
import { ETIQUETA_ESTADO, TONO_ESTADO } from "@/lib/admin/tipos";
import { formatearCOP } from "@/lib/utils/formato";

export const metadata: Metadata = { title: "Resumen" };
export const dynamic = "force-dynamic";

export default async function PaginaResumen({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const [reservas, alojamientos, bloqueos, planes] = await Promise.all([
    listarReservas(supabase, { limite: 400 }),
    listarAlojamientos(supabase),
    listarBloqueos(supabase),
    listarPlanes(supabase),
  ]);

  const hoy = hoyISO();
  const enUnaSemana = sumarDiasISO(hoy, 7);

  const activas = reservas.filter((reserva) => reserva.estado !== "cancelada");
  const pendientes = reservas.filter((reserva) => reserva.estado === "pendiente");

  const lleganHoy = activas.filter((reserva) => reserva.entrada === hoy);
  const salenHoy = activas.filter((reserva) => reserva.salida === hoy);
  const alojadosAhora = activas.filter(
    (reserva) => reserva.entrada <= hoy && reserva.salida > hoy,
  );
  const proximas = activas
    .filter((reserva) => reserva.entrada > hoy && reserva.entrada <= enUnaSemana)
    .sort((a, b) => a.entrada.localeCompare(b.entrada));

  const porCobrar = activas.reduce(
    (suma, reserva) => suma + Math.max(0, reserva.total - reserva.monto_pagado),
    0,
  );

  const bloqueosVigentes = bloqueos.filter((bloqueo) => bloqueo.fin > hoy);
  const cabanasVisibles = alojamientos.filter((alojamiento) => alojamiento.activo);
  const planesVisibles = planes.filter((plan) => plan.activo);
  const sinReservas = reservas.length === 0;

  return (
    <>
      <EncabezadoPagina
        titulo="Resumen"
        descripcion={`Hoy es ${fechaLarga(hoy)}. Esto es lo que está pasando en La Finca.`}
        accion={
          <EnlaceBoton href="/admin/reservas/nueva">Nueva reserva</EnlaceBoton>
        }
      />

      <Aviso ok={params.ok} error={params.error} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador
          valor={alojadosAhora.length}
          etiqueta="Cabañas ocupadas hoy"
          ayuda={`de ${cabanasVisibles.length} visibles`}
          href="/admin/reservas"
        />
        <Indicador
          valor={lleganHoy.length}
          etiqueta="Llegan hoy"
          ayuda={salenHoy.length > 0 ? `${salenHoy.length} salen hoy` : "nadie sale hoy"}
          href="/admin/reservas"
        />
        <Indicador
          valor={pendientes.length}
          etiqueta="Sin confirmar"
          ayuda="reservas pendientes"
          href="/admin/reservas?estado=pendiente"
        />
        <Indicador
          valor={formatearCOP(porCobrar)}
          etiqueta="Falta por cobrar"
          ayuda="sumando todas las reservas activas"
          href="/admin/reservas"
        />
      </div>

      {sinReservas ? (
        <div className="mt-6">
          <Tarjeta>
            <CuerpoTarjeta>
              <EstadoVacio
                titulo="Bienvenido al panel de La Finca"
                descripcion="Desde aquí se maneja todo: las reservas y el calendario de las cabañas, los planes tarifarios y sus precios en cada cabaña, las experiencias que se venden y los textos y las fotos del sitio web. Empieza registrando una reserva o revisando las cabañas."
                accion={
                  <div className="flex flex-wrap justify-center gap-2">
                    <EnlaceBoton href="/admin/reservas/nueva">
                      Registrar una reserva
                    </EnlaceBoton>
                    <EnlaceBoton href="/admin/alojamientos" tono="secundario">
                      Ver las cabañas
                    </EnlaceBoton>
                  </div>
                }
              />
            </CuerpoTarjeta>
          </Tarjeta>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Tarjeta>
            <CabeceraTarjeta
              titulo="Hoy"
              descripcion="Quién llega, quién sale y quién está alojado."
            />
            <CuerpoTarjeta className="space-y-5">
              <GrupoDelDia
                titulo="Llegan hoy"
                reservas={lleganHoy}
                vacio="Nadie llega hoy."
              />
              <GrupoDelDia
                titulo="Salen hoy"
                reservas={salenHoy}
                vacio="Nadie sale hoy."
              />
              <GrupoDelDia
                titulo="Alojados ahora"
                reservas={alojadosAhora}
                vacio="Ninguna cabaña ocupada hoy."
              />
            </CuerpoTarjeta>
          </Tarjeta>

          <Tarjeta>
            <CabeceraTarjeta
              titulo="Próximos siete días"
              descripcion="Las llegadas que vienen."
            />
            {proximas.length === 0 ? (
              <CuerpoTarjeta>
                <p className="text-[0.875rem] text-crema-600">
                  No hay llegadas previstas en la próxima semana.
                </p>
              </CuerpoTarjeta>
            ) : (
              <ul className="divide-y divide-crema-900/[0.07]">
                {proximas.slice(0, 8).map((reserva) => (
                  <li key={reserva.id}>
                    <Link
                      href={`/admin/reservas/${reserva.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-crema-900/[0.025] sm:px-6"
                    >
                      <div className="min-w-0">
                        <p className="text-[0.875rem] font-semibold text-crema-900">
                          {reserva.huesped_nombre}
                        </p>
                        <p className="text-[0.75rem] text-crema-600">
                          {/* Un Día de Calma no tiene cabaña: se nombra el plan
                              para que no aparezca un guion sin explicación. */}
                          {reserva.tipo === "dia"
                            ? "Día de Calma"
                            : (reserva.alojamiento_nombre ?? "—")}
                          <span className="mx-1.5">·</span>
                          {rangoCorto(reserva.entrada, reserva.salida)}
                        </p>
                      </div>
                      <Pastilla tono={TONO_ESTADO[reserva.estado]}>
                        {ETIQUETA_ESTADO[reserva.estado]}
                      </Pastilla>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AtajoSeccion
          href="/admin/alojamientos"
          titulo="Cabañas"
          detalle={`${cabanasVisibles.length} visibles de ${alojamientos.length}`}
        />
        <AtajoSeccion
          href="/admin/planes"
          titulo="Planes tarifarios"
          detalle={`${planesVisibles.length} visibles de ${planes.length}`}
        />
        <AtajoSeccion
          href="/admin/bloqueos"
          titulo="Bloqueos"
          detalle={
            bloqueosVigentes.length === 0
              ? "ninguna fecha bloqueada"
              : `${bloqueosVigentes.length} vigentes`
          }
        />
        <AtajoSeccion
          href="/admin/contenido"
          titulo="Contenido del sitio"
          detalle="textos, fotos y datos de contacto"
        />
      </div>
    </>
  );
}

function GrupoDelDia({
  titulo,
  reservas,
  vacio,
}: {
  titulo: string;
  reservas: {
    id: string;
    huesped_nombre: string;
    alojamiento_nombre: string | null;
    huesped_telefono: string;
    tipo: "hospedaje" | "dia";
  }[];
  vacio: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-crema-600">
        {titulo}
      </p>
      {reservas.length === 0 ? (
        <p className="text-[0.875rem] text-crema-600">{vacio}</p>
      ) : (
        <ul className="space-y-1.5">
          {reservas.map((reserva) => (
            <li key={reserva.id}>
              <Link
                href={`/admin/reservas/${reserva.id}`}
                className="flex flex-wrap items-baseline gap-x-2 text-[0.875rem] text-crema-900 underline-offset-4 hover:underline"
              >
                <span className="font-medium">{reserva.huesped_nombre}</span>
                <span className="text-[0.75rem] text-crema-600">
                  {reserva.tipo === "dia"
                    ? "Día de Calma"
                    : (reserva.alojamiento_nombre ?? "—")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AtajoSeccion({
  href,
  titulo,
  detalle,
}: {
  href: string;
  titulo: string;
  detalle: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-tarjeta bg-white px-4 py-3.5 shadow-tenue ring-1 ring-crema-900/[0.06] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-tarjeta"
    >
      <p className="text-[0.9375rem] font-semibold text-crema-900">{titulo}</p>
      <p className="mt-0.5 text-[0.75rem] text-crema-600">{detalle}</p>
    </Link>
  );
}

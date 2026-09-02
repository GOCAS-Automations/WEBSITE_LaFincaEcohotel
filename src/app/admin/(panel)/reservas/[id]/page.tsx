import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  cambiarEstadoReservaAction,
  eliminarReservaAction,
} from "../acciones";
import { FormularioReserva } from "../formulario-reserva";
import { Aviso } from "@/components/admin/aviso";
import { BotonEnviar } from "@/components/admin/boton-enviar";
import {
  CabeceraTarjeta,
  CuerpoTarjeta,
  Dato,
  EncabezadoPagina,
  Pastilla,
  Tarjeta,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import {
  extrasActivos,
  extrasDeReserva,
  mapaDeTarifas,
  obtenerReserva,
  opcionesAlojamiento,
  opcionesPlan,
} from "@/lib/admin/datos";
import { fechaHora, fechaLarga, nochesEntre } from "@/lib/admin/fechas";
import {
  AYUDA_ESTADO,
  ESTADOS_RESERVA,
  ETIQUETA_ESTADO,
  ETIQUETA_ORIGEN,
  TONO_ESTADO,
} from "@/lib/admin/tipos";
import { esUuid } from "@/lib/admin/validacion";
import { formatearCOP } from "@/lib/utils/formato";

export const metadata: Metadata = { title: "Reserva" };
export const dynamic = "force-dynamic";

export default async function PaginaReserva({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const aviso = await searchParams;

  if (!esUuid(id)) notFound();

  const reserva = await obtenerReserva(supabase, id);
  if (!reserva) notFound();

  const [alojamientos, planes, tarifas, extras, elegidos] = await Promise.all([
    opcionesAlojamiento(supabase),
    opcionesPlan(supabase),
    mapaDeTarifas(supabase),
    extrasActivos(supabase),
    extrasDeReserva(supabase, id),
  ]);

  const noches = nochesEntre(reserva.entrada, reserva.salida);
  const pendiente = reserva.total - reserva.monto_pagado;

  /* Al listado de extras del formulario se le añaden los que la reserva ya
     tiene pero que entretanto se pausaron: si no, editar la reserva los
     borraría en silencio. */
  const idsActivos = new Set(extras.map((extra) => extra.id));
  const extrasFormulario = [
    ...extras,
    ...elegidos
      .filter((elegido) => !idsActivos.has(elegido.extra_id))
      .map((elegido) => ({
        id: elegido.extra_id,
        tipo: "adicional" as const,
        nombre: `${elegido.nombre} (ya no se ofrece)`,
        descripcion: null,
        precio: elegido.precio_unitario,
        imagen_url: null,
        activo: false,
        orden: 999,
      })),
  ];

  return (
    <>
      <EncabezadoPagina
        titulo={reserva.huesped_nombre}
        descripcion={`Reserva ${reserva.codigo} · registrada el ${fechaHora(reserva.created_at)}`}
        accion={
          <Link
            href="/admin/reservas"
            className="text-[0.875rem] font-semibold text-crema-700 underline-offset-4 hover:underline"
          >
            ← Volver a reservas
          </Link>
        }
      />

      <Aviso ok={aviso.ok} error={aviso.error} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tarjeta>
            <CabeceraTarjeta
              titulo="Resumen"
              accion={
                <Pastilla tono={TONO_ESTADO[reserva.estado]}>
                  {ETIQUETA_ESTADO[reserva.estado]}
                </Pastilla>
              }
            />
            <CuerpoTarjeta>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Dato etiqueta="Cabaña">
                  {reserva.alojamiento_nombre ?? "—"}
                </Dato>
                <Dato etiqueta="Plan">{reserva.plan_nombre ?? "—"}</Dato>
                <Dato etiqueta="Entrada">{fechaLarga(reserva.entrada)}</Dato>
                <Dato etiqueta="Salida">
                  {fechaLarga(reserva.salida)}
                  <span className="ml-2 text-[0.8125rem] text-crema-600">
                    ({noches} {noches === 1 ? "noche" : "noches"})
                  </span>
                </Dato>
                <Dato etiqueta="Personas">{reserva.num_personas}</Dato>
                <Dato etiqueta="Cómo llegó">
                  {ETIQUETA_ORIGEN[reserva.origen]}
                </Dato>
                <Dato etiqueta="Teléfono">
                  {reserva.huesped_telefono ? (
                    <a
                      href={`tel:${reserva.huesped_telefono.replace(/[^\d+]/g, "")}`}
                      className="text-petroleo-700 underline-offset-4 hover:underline"
                    >
                      {reserva.huesped_telefono}
                    </a>
                  ) : (
                    "—"
                  )}
                </Dato>
                <Dato etiqueta="Correo">
                  {reserva.huesped_email ? (
                    <a
                      href={`mailto:${reserva.huesped_email}`}
                      className="break-all text-petroleo-700 underline-offset-4 hover:underline"
                    >
                      {reserva.huesped_email}
                    </a>
                  ) : (
                    "—"
                  )}
                </Dato>
                {reserva.huesped_documento && (
                  <Dato etiqueta="Documento">{reserva.huesped_documento}</Dato>
                )}
                {reserva.notas && (
                  <div className="sm:col-span-2">
                    <Dato etiqueta="Notas">
                      <span className="whitespace-pre-line">{reserva.notas}</span>
                    </Dato>
                  </div>
                )}
              </dl>

              {elegidos.length > 0 && (
                <div className="mt-5 rounded-tarjeta bg-crema-900/[0.03] px-4 py-3">
                  <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-crema-600">
                    Experiencias y adicionales
                  </p>
                  <ul className="space-y-1 text-[0.875rem] text-crema-900">
                    {elegidos.map((elegido) => (
                      <li
                        key={elegido.extra_id}
                        className="flex justify-between gap-3"
                      >
                        <span>
                          {elegido.nombre}
                          {elegido.cantidad > 1 && ` × ${elegido.cantidad}`}
                        </span>
                        <span className="font-medium">
                          {formatearCOP(
                            elegido.cantidad * elegido.precio_unitario,
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CuerpoTarjeta>
          </Tarjeta>
        </div>

        <div className="space-y-6">
          <Tarjeta>
            <CabeceraTarjeta titulo="Pago" />
            <CuerpoTarjeta>
              <dl className="space-y-2 text-[0.875rem]">
                <div className="flex justify-between">
                  <dt className="text-crema-700">Alojamiento</dt>
                  <dd className="font-medium text-crema-900">
                    {formatearCOP(reserva.subtotal_alojamiento)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-crema-700">Extras</dt>
                  <dd className="font-medium text-crema-900">
                    {formatearCOP(reserva.subtotal_extras)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-crema-900/10 pt-2">
                  <dt className="font-semibold text-crema-900">Total</dt>
                  <dd className="font-titulo text-[1.125rem] font-semibold text-petroleo-700">
                    {formatearCOP(reserva.total)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-crema-700">Abonado</dt>
                  <dd className="font-medium text-crema-900">
                    {formatearCOP(reserva.monto_pagado)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-crema-700">Falta por pagar</dt>
                  <dd
                    className={`font-semibold ${pendiente > 0 ? "text-dorado-700" : "text-petroleo-700"}`}
                  >
                    {formatearCOP(Math.max(0, pendiente))}
                  </dd>
                </div>
              </dl>
            </CuerpoTarjeta>
          </Tarjeta>

          <Tarjeta>
            <CabeceraTarjeta
              titulo="Cambiar el estado"
              descripcion={AYUDA_ESTADO[reserva.estado]}
            />
            <CuerpoTarjeta className="space-y-2">
              {ESTADOS_RESERVA.filter((estado) => estado !== reserva.estado).map(
                (estado) => (
                  <form key={estado} action={cambiarEstadoReservaAction}>
                    <input type="hidden" name="id" value={reserva.id} />
                    <input type="hidden" name="estado" value={estado} />
                    <BotonEnviar
                      tono="secundario"
                      tamano="sm"
                      className="w-full"
                      etiquetaEnEspera="Cambiando…"
                      confirmar={
                        estado === "cancelada"
                          ? "¿Cancelar esta reserva? Esas noches volverán a quedar libres en el calendario."
                          : undefined
                      }
                    >
                      Marcar como {ETIQUETA_ESTADO[estado].toLowerCase()}
                    </BotonEnviar>
                  </form>
                ),
              )}
            </CuerpoTarjeta>
          </Tarjeta>

          <Tarjeta>
            <CabeceraTarjeta
              titulo="Borrar"
              descripcion="Lo normal es cancelar, que conserva el historial. Borrar es definitivo."
            />
            <CuerpoTarjeta>
              <form action={eliminarReservaAction}>
                <input type="hidden" name="id" value={reserva.id} />
                <BotonEnviar
                  tono="peligro"
                  tamano="sm"
                  className="w-full"
                  etiquetaEnEspera="Borrando…"
                  confirmar={`¿Seguro que quieres borrar la reserva ${reserva.codigo} de ${reserva.huesped_nombre}? Esta acción no se puede deshacer.`}
                >
                  Borrar la reserva
                </BotonEnviar>
              </form>
            </CuerpoTarjeta>
          </Tarjeta>
        </div>
      </div>

      <div className="mt-8">
        <Tarjeta>
          <CabeceraTarjeta
            titulo="Editar la reserva"
            descripcion="Cambia fechas, cabaña, plan, datos del huésped o el dinero."
          />
          <CuerpoTarjeta>
            <FormularioReserva
              reserva={reserva}
              alojamientos={alojamientos}
              planes={planes}
              tarifas={tarifas}
              extras={extrasFormulario}
              extrasElegidos={elegidos}
            />
          </CuerpoTarjeta>
        </Tarjeta>
      </div>
    </>
  );
}

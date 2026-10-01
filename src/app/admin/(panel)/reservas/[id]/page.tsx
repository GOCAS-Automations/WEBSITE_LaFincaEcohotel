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
import { calcularAnticipo } from "@/lib/reserva/total";

import { requireAdmin } from "@/lib/admin/auth";
import {
  extrasActivos,
  extrasDeReserva,
  mapaDeTarifas,
  obtenerReserva,
  opcionesAlojamiento,
  opcionesPlan,
} from "@/lib/admin/datos";
import {
  fechaCorta,
  fechaHora,
  fechaLarga,
  nochesEntre,
} from "@/lib/admin/fechas";
import {
  AYUDA_ESTADO,
  ESTADOS_RESERVA,
  ETIQUETA_CANAL_AUTORIZACION,
  ETIQUETA_CORTA_TIPO_RESERVA,
  ETIQUETA_ESTADO,
  ETIQUETA_ORIGEN,
  TONO_ESTADO,
} from "@/lib/admin/tipos";
import { CUPO_DIA_DE_CALMA } from "@/lib/reserva/dia-de-calma";
import { cuentaAtras, vencePronto } from "@/lib/reserva/holds";
import { pagosDeReserva, resumirPagoDeReserva } from "@/lib/admin/pagos";
import { ETIQUETA_ESTADO_BOLD, esAprobado, esRechazado } from "@/lib/pagos/bold";
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

  const [alojamientos, planes, tarifas, extras, elegidos, pagos] =
    await Promise.all([
      opcionesAlojamiento(supabase),
      opcionesPlan(supabase),
      mapaDeTarifas(supabase),
      extrasActivos(supabase),
      extrasDeReserva(supabase, id),
      /*
        LOS PAGOS SE LEEN CON LA SESIÓN DEL PANEL, NO CON `service_role`.

        `pagos` tiene RLS activo y la política «solo panel» de la migración 002,
        así que el rol `authenticated` la ve. No hace falta el cliente
        privilegiado para una pantalla que ya exige sesión de administrador, y no
        usarlo es una superficie menos.
      */
      pagosDeReserva(supabase, id),
    ]);

  const noches = nochesEntre(reserva.entrada, reserva.salida);
  const pendiente = reserva.total - reserva.monto_pagado;
  const esDia = reserva.tipo === "dia";

  /* Cómo se resume el dinero de esta reserva. El más reciente de los pagos es
     el que manda para la pastilla; los demás se listan igual más abajo. */
  const resumen = resumirPagoDeReserva(
    reserva.total,
    reserva.monto_pagado,
    pagos[0],
    reserva.estado,
  );

  /*
    Las experiencias se agrupan por la noche a la que se añadieron: en una
    estadía de tres noches, ver «Fondue» sin saber cuándo obliga a preguntarle
    al huésped. Lo que no pertenece a una noche (la segunda mascota) va al
    final, bajo «Para toda la estadía».
  */
  const extrasPorNoche = new Map<string, typeof elegidos>();
  for (const elegido of elegidos) {
    const clave = elegido.noche ?? "";
    const lista = extrasPorNoche.get(clave) ?? [];
    lista.push(elegido);
    extrasPorNoche.set(clave, lista);
  }
  const gruposDeExtras = [...extrasPorNoche.entries()].sort(([a], [b]) => {
    if (a === "") return 1;
    if (b === "") return -1;
    return a < b ? -1 : 1;
  });

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

  /* El hold de esta reserva, si vence. `null` cuando no vence (las del panel). */
  const ahora = new Date();
  const restanteHold = cuentaAtras(reserva.expira_at, ahora);
  const holdUrgente = vencePronto(reserva, ahora);

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
                <span className="flex flex-wrap items-center gap-2">
                  {/* El tipo va primero: es lo que cambia cómo se lee todo lo
                      demás (un Día de Calma no tiene cabaña ni noches). */}
                  <Pastilla tono={esDia ? "azul" : "gris"}>
                    {ETIQUETA_CORTA_TIPO_RESERVA[reserva.tipo]}
                  </Pastilla>
                  <Pastilla tono={TONO_ESTADO[reserva.estado]}>
                    {ETIQUETA_ESTADO[reserva.estado]}
                  </Pastilla>
                  {/* El hold, solo si esta reserva vence: las que apunta el
                      equipo a mano no vencen y no muestran nada. */}
                  {reserva.estado === "pendiente" && restanteHold ? (
                    <Pastilla tono={holdUrgente ? "ambar" : "gris"}>
                      {restanteHold}
                    </Pastilla>
                  ) : null}
                </span>
              }
            />
            <CuerpoTarjeta>
              {reserva.estado === "pendiente" && restanteHold ? (
                <p className="mb-4 rounded-[var(--radius-tarjeta)] bg-dorado-100/60 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-dorado-800">
                  Esta solicitud llegó del sitio y está apartando las fechas
                  mientras el huésped paga. <strong>{restanteHold}</strong>: si no
                  llega el pago, se cancela sola y esas noches vuelven al
                  calendario. Si ya la cerraste con el huésped, confírmala aquí
                  abajo y deja de vencer.
                </p>
              ) : null}
              <dl className="grid gap-4 sm:grid-cols-2">
                {esDia ? (
                  <>
                    <Dato etiqueta="Plan">{reserva.plan_nombre ?? "—"}</Dato>
                    <Dato etiqueta="Día">{fechaLarga(reserva.entrada)}</Dato>
                    <Dato etiqueta="Cabaña">
                      Sin cabaña: el Día de Calma no incluye hospedaje y no
                      bloquea ninguna.
                    </Dato>
                    <Dato etiqueta="Personas">
                      {reserva.num_personas}
                      <span className="ml-2 text-[0.8125rem] text-crema-600">
                        (de {CUPO_DIA_DE_CALMA} del día)
                      </span>
                    </Dato>
                  </>
                ) : (
                  <>
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
                  </>
                )}
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
                {/* Prueba de la autorización de datos (Ley 1581 de 2012). Se
                    pinta siempre, también cuando falta: la ausencia es
                    justamente lo que hay que ver de un vistazo. */}
                <Dato etiqueta="Autorización de datos">
                  {reserva.autorizacion_datos_en ? (
                    <span>
                      {ETIQUETA_CANAL_AUTORIZACION[
                        reserva.autorizacion_datos_canal ?? ""
                      ] ?? reserva.autorizacion_datos_canal}
                      {" · "}
                      {new Date(reserva.autorizacion_datos_en).toLocaleDateString(
                        "es-CO",
                        { day: "numeric", month: "long", year: "numeric" },
                      )}
                      {reserva.autorizacion_datos_version
                        ? ` · texto del ${reserva.autorizacion_datos_version}`
                        : ""}
                    </span>
                  ) : (
                    <span className="text-dorado-700">
                      Sin constancia — pídesela y márcala al editar la reserva
                    </span>
                  )}
                </Dato>
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
                  <div className="space-y-3">
                    {gruposDeExtras.map(([noche, lineas]) => (
                      <div key={noche || "estadia"}>
                        <p className="text-[0.75rem] font-semibold text-crema-700">
                          {noche
                            ? `Noche del ${fechaCorta(noche)}`
                            : esDia
                              ? "Para ese día"
                              : "Para toda la estadía"}
                        </p>
                        <ul className="space-y-1 text-[0.875rem] text-crema-900">
                          {lineas.map((elegido) => (
                            <li
                              key={`${noche}-${elegido.extra_id}`}
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
                    ))}
                  </div>
                </div>
              )}
            </CuerpoTarjeta>
          </Tarjeta>
        </div>

        <div className="space-y-6">
          <Tarjeta>
            <CabeceraTarjeta
              titulo="Pago"
              accion={<Pastilla tono={resumen.tono}>{resumen.etiqueta}</Pastilla>}
            />
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
                  <dt className="text-crema-700">
                    Anticipo ({reserva.porcentaje_anticipo} %)
                  </dt>
                  <dd className="font-medium text-crema-900">
                    {formatearCOP(
                      reserva.monto_anticipo ??
                        calcularAnticipo(
                          reserva.total,
                          reserva.porcentaje_anticipo,
                        ).anticipo,
                    )}
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

              {/*
                EL SALDO, DICHO CON PALABRAS Y NO SOLO CON UNA CIFRA.

                Una línea que dice «Falta por pagar $175.000» no le dice a quien
                atiende QUÉ tiene que hacer. Esto sí: el saldo de una reserva
                pagada en línea se cobra **por link antes de la llegada**, porque
                en la finca no hay datáfono ni se maneja efectivo (§5 de
                `docs/DATOS_CLIENTE.md`), y eso es lo mismo que se le prometió al
                huésped en el correo de confirmación.

                ⚠ Solo cuando hay un **pago parcial**. En una reserva sin un peso
                abonado, «queda un saldo» es toda la reserva y la frase «el
                huésped ya lo sabe, está en su correo» sería falsa: no se le ha
                mandado ninguna confirmación porque no ha pagado nada.
              */}
              {pendiente > 0 && reserva.monto_pagado > 0 ? (
                <p className="mt-4 rounded-tarjeta bg-dorado-100/60 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-dorado-800">
                  Queda un saldo de{" "}
                  <strong>{formatearCOP(Math.max(0, pendiente))}</strong> por
                  cobrar. Se le envía un link de pago antes de su llegada: en la
                  finca no hay datáfono ni se maneja efectivo. El huésped ya lo
                  sabe — está en su correo de confirmación.
                </p>
              ) : null}

              {/* ---------------------------------------------------------
                  LOS INTENTOS DE PAGO EN LÍNEA.

                  Se pintan TODOS, del más reciente al más antiguo, y no solo el
                  que salió bien. Es lo que contesta la llamada de «me cobraron
                  dos veces»: casi siempre hay un rechazado y un aprobado, y
                  verlos juntos lo explica en cinco segundos.

                  La REFERENCIA es lo que se busca en el panel de Bold y el
                  identificador de Bold es lo que pide su soporte, así que los dos
                  se pueden seleccionar y copiar (`select-all`, tipografía
                  monoespaciada: son cadenas que alguien va a dictar o pegar).

                  Nada de datos de tarjeta: no los recibimos y no los guardamos.
              ---------------------------------------------------------- */}
              {pagos.length > 0 ? (
                <div className="mt-5 flex flex-col gap-3 border-t border-crema-900/10 pt-4">
                  <p className="text-[0.75rem] font-semibold tracking-wide text-crema-600 uppercase">
                    {pagos.length === 1
                      ? "Pago en línea"
                      : `Intentos de pago (${pagos.length})`}
                  </p>

                  {pagos.map((pago) => (
                    <div
                      key={pago.id}
                      className="flex flex-col gap-1.5 rounded-tarjeta bg-crema-900/[0.03] px-3.5 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Pastilla
                          tono={
                            esAprobado(pago.estado)
                              ? "verde"
                              : esRechazado(pago.estado)
                                ? "rojo"
                                : "ambar"
                          }
                        >
                          {ETIQUETA_ESTADO_BOLD[pago.estado]}
                        </Pastilla>
                        <span className="font-titulo text-[0.9375rem] font-semibold text-crema-900">
                          {formatearCOP(pago.monto)}
                        </span>
                      </div>

                      <dl className="flex flex-col gap-1 text-[0.8125rem]">
                        <div className="flex flex-wrap justify-between gap-x-3">
                          <dt className="text-crema-700">Método</dt>
                          <dd className="text-crema-900">{pago.metodo ?? "—"}</dd>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <dt className="text-crema-700">Referencia</dt>
                          <dd className="font-mono text-[0.75rem] break-all text-crema-900 select-all">
                            {pago.referencia}
                          </dd>
                        </div>
                        {pago.transaccionId ? (
                          <div className="flex flex-col gap-0.5">
                            <dt className="text-crema-700">
                              Identificador en Bold
                            </dt>
                            <dd className="font-mono text-[0.75rem] break-all text-crema-900 select-all">
                              {pago.transaccionId}
                            </dd>
                          </div>
                        ) : null}
                        <div className="flex flex-wrap justify-between gap-x-3">
                          <dt className="text-crema-700">Intentado</dt>
                          <dd className="text-crema-900">
                            {fechaHora(pago.creadoEn)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ))}

                  <p className="text-[0.75rem] leading-snug text-crema-600">
                    El cobro lo procesa Bold. Este sitio no recibe ni guarda
                    datos de la tarjeta.
                  </p>
                </div>
              ) : (
                <p className="mt-5 border-t border-crema-900/10 pt-4 text-[0.8125rem] leading-relaxed text-crema-600">
                  Sin pagos en línea. {resumen.etiqueta === "Pagada"
                    ? "Lo que está abonado se registró a mano desde el panel."
                    : "Esta reserva no se cobró por la pasarela: o la escribió el equipo, o el huésped nunca completó el pago."}
                </p>
              )}
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
            descripcion="Cambia fechas, cabaña, plan, experiencias por noche, datos del huésped o el dinero."
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

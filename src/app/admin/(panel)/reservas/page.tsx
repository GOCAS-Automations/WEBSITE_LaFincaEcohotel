import type { Metadata } from "next";
import Link from "next/link";

import { CalendarioMes } from "./calendario";
import { BloqueDiagnosticoCalendario } from "./diagnostico-calendario";
import { EstadoCalendarioHotel } from "./estado-calendario";
import { Aviso } from "@/components/admin/aviso";
import {
  CabeceraTarjeta,
  CuerpoTarjeta,
  EnlaceBoton,
  EncabezadoPagina,
  EstadoVacio,
  Pastilla,
  Tarjeta,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import {
  bloqueosEnRango,
  listarReservas,
  opcionesAlojamiento,
  personasDeDiaPorFecha,
  reservasEnRango,
} from "@/lib/admin/datos";
import {
  claveMes,
  diasDelMes,
  isoDe,
  leerClaveMes,
  rangoCorto,
  sumarDiasISO,
} from "@/lib/admin/fechas";
import {
  ESTADOS_RESERVA,
  ETIQUETA_CORTA_TIPO_RESERVA,
  ETIQUETA_ESTADO,
  ETIQUETA_ORIGEN,
  TONO_ESTADO,
} from "@/lib/admin/tipos";
import { resumirPagoDeReserva, ultimoPagoPorReserva } from "@/lib/admin/pagos";
import { cuentaAtras, vencePronto } from "@/lib/reserva/holds";
import { liberarReservasVencidas } from "@/lib/reserva/liberar-vencidas";
import { ocupacionDelCalendario } from "@/lib/reserva/ocupacion-externa";
import { formatearCOP } from "@/lib/utils/formato";
import type { EstadoReserva } from "@/lib/tipos/basedatos";

export const metadata: Metadata = { title: "Reservas" };
export const dynamic = "force-dynamic";

const FILTROS: { valor: string; etiqueta: string }[] = [
  { valor: "todas", etiqueta: "Todas" },
  ...ESTADOS_RESERVA.map((estado) => ({
    valor: estado,
    etiqueta: ETIQUETA_ESTADO[estado],
  })),
];

export default async function PaginaReservas({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    error?: string;
    mes?: string;
    estado?: string;
  }>;
}) {
  const { supabase, rol } = await requireAdmin();
  const params = await searchParams;

  const mes = leerClaveMes(params.mes);
  const primerDia = isoDe(mes, 1);
  const finDeMes = sumarDiasISO(isoDe(mes, diasDelMes(mes)), 1);

  const estadoFiltro =
    params.estado && ESTADOS_RESERVA.includes(params.estado as EstadoReserva)
      ? (params.estado as EstadoReserva)
      : "todas";

  /*
    AL ENTRAR AL CALENDARIO SE BARREN LAS VENCIDAS.

    Es la pantalla que el hotel abre para saber qué días tiene libres, así que es
    justo donde una solicitud caducada que siguiera diciendo «pendiente» haría
    más daño: el equipo rechazaría por teléfono una noche que está libre.

    El barrido cancela las que ya vencieron, así que lo que se lee justo después
    ya está limpio. `ocupaCalendario()` sigue aplicándose encima —el barrido
    puede fallar y la página no puede depender de él—, pero con las dos cosas el
    listado y el calendario dicen lo mismo. Nunca lanza.
  */
  await liberarReservasVencidas(supabase);

  /* Un solo instante para toda la pantalla: dos `new Date()` distintos podrían
     dejar el calendario y el listado a lados opuestos de un vencimiento. */
  const ahora = new Date();

  const [
    alojamientos,
    reservasDelMes,
    bloqueosDelMes,
    reservas,
    cupoDelMes,
    calendarioHotel,
  ] = await Promise.all([
    opcionesAlojamiento(supabase),
    reservasEnRango(supabase, primerDia, finDeMes),
    bloqueosEnRango(supabase, primerDia, finDeMes),
    listarReservas(supabase, { estado: estadoFiltro }),
    personasDeDiaPorFecha(supabase, primerDia, finDeMes),
    /* La capa de Google. Nunca lanza: si no está configurada o falla, viene
       con estado y una lista vacía, y el mes se pinta igual. */
    ocupacionDelCalendario(primerDia, finDeMes),
  ]);

  /*
    EL ÚLTIMO PAGO DE CADA RESERVA DEL LISTADO, EN UNA SOLA CONSULTA.

    Una por fila serían hasta 300 viajes a la base para pintar una pastilla. Esto
    es un `in (…)` y un `Map`. Nunca lanza: si la consulta falla, el mapa viene
    vacío y el listado se pinta igual, con la pastilla que salga de lo que ya
    tiene la reserva (`monto_pagado`).
  */
  const pagosPorReserva = await ultimoPagoPorReserva(
    supabase,
    reservas.map((reserva) => reserva.id),
  );

  return (
    <>
      <EncabezadoPagina
        titulo="Reservas"
        descripcion="El calendario del mes con las cabañas y el cupo del Día de Calma y, más abajo, todas las reservas registradas."
        accion={
          <EnlaceBoton href="/admin/reservas/nueva">Nueva reserva</EnlaceBoton>
        }
      />

      <Aviso ok={params.ok} error={params.error} />

      <CalendarioMes
        mes={mes}
        alojamientos={alojamientos}
        reservas={reservasDelMes}
        bloqueos={bloqueosDelMes}
        personasDeDia={cupoDelMes}
        ocupacionGoogle={calendarioHotel.ocupacion}
      />

      <EstadoCalendarioHotel
        estado={calendarioHotel.estado}
        mensaje={calendarioHotel.mensaje}
        consultado={calendarioHotel.consultado}
        mes={claveMes(mes)}
        avisos={calendarioHotel.avisos}
        lecturaIncompleta={calendarioHotel.lecturaIncompleta}
        escrituraSinPermiso={calendarioHotel.escrituraSinPermiso}
        /* Los identificadores de Google son cosa del propietario: a quien
           atiende el teléfono no le aportan nada. */
        detalle={rol === "propietario" ? <BloqueDiagnosticoCalendario /> : null}
      />

      <div className="mt-8">
        <Tarjeta>
          <CabeceraTarjeta
            titulo="Listado de reservas"
            descripcion="Las más recientes primero. Toca una para ver la ficha completa."
          />

          <div className="border-b border-crema-900/[0.07] px-4 py-3 sm:px-6">
            <nav aria-label="Filtrar por estado">
              <ul className="flex flex-wrap gap-2">
                {FILTROS.map((filtro) => {
                  const activo = estadoFiltro === filtro.valor;
                  const consulta = new URLSearchParams();
                  consulta.set("mes", claveMes(mes));
                  if (filtro.valor !== "todas") {
                    consulta.set("estado", filtro.valor);
                  }
                  return (
                    <li key={filtro.valor}>
                      <Link
                        href={`/admin/reservas?${consulta.toString()}`}
                        aria-current={activo ? "true" : undefined}
                        className={`inline-flex rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors ${
                          activo
                            ? "bg-petroleo-600 text-white"
                            : "bg-crema-900/[0.05] text-crema-700 hover:bg-crema-900/[0.09]"
                        }`}
                      >
                        {filtro.etiqueta}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {reservas.length === 0 ? (
            <CuerpoTarjeta>
              <EstadoVacio
                titulo={
                  estadoFiltro === "todas"
                    ? "Todavía no hay reservas"
                    : "No hay reservas con ese estado"
                }
                descripcion={
                  estadoFiltro === "todas"
                    ? "Aquí quedan registradas todas las estadías: las que lleguen por el sitio y las que apuntes tú cuando te escriban por WhatsApp o te llamen. Al crear una, esas noches se bloquean solas en el calendario."
                    : "Prueba con otro filtro o mira todas las reservas."
                }
                accion={
                  estadoFiltro === "todas" ? (
                    <EnlaceBoton href="/admin/reservas/nueva">
                      Registrar la primera reserva
                    </EnlaceBoton>
                  ) : undefined
                }
              />
            </CuerpoTarjeta>
          ) : (
            <ul className="divide-y divide-crema-900/[0.07]">
              {reservas.map((reserva) => {
                /*
                  LA CUENTA ATRÁS DEL HOLD.

                  Solo aparece en las pendientes que vencen —las del sitio, que
                  esperan un pago—. Las que el equipo apunta a mano no vencen y
                  no muestran nada: una cuenta atrás donde no hay plazo asusta
                  sin motivo.

                  El plazo son treinta minutos y esta página no se refresca
                  sola, así que el texto va en minutos y no en segundos: a los
                  segundos estaría mintiendo desde el primer instante.
                */
                const restante =
                  reserva.estado === "pendiente"
                    ? cuentaAtras(reserva.expira_at, ahora)
                    : null;
                const urgente = vencePronto(reserva, ahora);

                /*
                  PAGADA O PENDIENTE DE COBRO, DE UN VISTAZO.

                  El estado de la reserva («confirmada») y el del dinero son dos
                  cosas distintas: una confirmada puede tener la mitad por cobrar,
                  y una pendiente puede tener un pago en curso en la pasarela
                  ahora mismo. El equipo necesita las dos, así que hay dos
                  pastillas y no una que las mezcle.
                */
                const dinero = resumirPagoDeReserva(
                  reserva.total,
                  reserva.monto_pagado,
                  pagosPorReserva.get(reserva.id),
                  reserva.estado,
                );
                const falta = reserva.total - reserva.monto_pagado;

                return (
                <li key={reserva.id}>
                  <Link
                    href={`/admin/reservas/${reserva.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3.5 transition-colors hover:bg-crema-900/[0.025] sm:px-6"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-titulo text-[0.9375rem] font-semibold text-crema-900">
                          {reserva.huesped_nombre}
                        </span>
                        <Pastilla tono={TONO_ESTADO[reserva.estado]}>
                          {ETIQUETA_ESTADO[reserva.estado]}
                        </Pastilla>
                        {/* «Sin pago» en una cancelada es ruido: ahí no hay nada
                            que cobrar y la pastilla del estado ya lo dice. */}
                        {reserva.estado !== "cancelada" ? (
                          <Pastilla tono={dinero.tono}>{dinero.etiqueta}</Pastilla>
                        ) : null}
                        {restante ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold ${
                              urgente
                                ? "bg-dorado-100 text-dorado-800 ring-1 ring-dorado-500/40"
                                : "bg-crema-900/[0.06] text-crema-700"
                            }`}
                          >
                            {restante}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[0.75rem] text-crema-600">
                        {reserva.codigo}
                        <span className="mx-1.5">·</span>
                        {reserva.tipo === "dia"
                          ? `${ETIQUETA_CORTA_TIPO_RESERVA.dia} · ${reserva.num_personas} ${reserva.num_personas === 1 ? "persona" : "personas"}`
                          : (reserva.alojamiento_nombre ?? "Sin cabaña")}
                        <span className="mx-1.5">·</span>
                        {rangoCorto(reserva.entrada, reserva.salida)}
                        <span className="mx-1.5">·</span>
                        {ETIQUETA_ORIGEN[reserva.origen]}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.9375rem] font-semibold text-crema-900">
                        {formatearCOP(reserva.total)}
                      </p>
                      {/* Lo que falta pesa más que lo abonado: es la acción
                          pendiente, no el dato histórico. */}
                      {reserva.monto_pagado > 0 && falta > 0 ? (
                        <p className="text-[0.75rem] text-dorado-700">
                          falta {formatearCOP(falta)}
                        </p>
                      ) : reserva.monto_pagado > 0 ? (
                        <p className="text-[0.75rem] text-crema-600">
                          abonado {formatearCOP(reserva.monto_pagado)}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>
      </div>
    </>
  );
}

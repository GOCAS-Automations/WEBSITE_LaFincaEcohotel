import type { Metadata } from "next";
import Link from "next/link";

import { Aviso } from "@/components/admin/aviso";
import {
  Banner,
  CabeceraTarjeta,
  CuerpoTarjeta,
  EnlaceBoton,
  EncabezadoPagina,
  Indicador,
  Pastilla,
  Tarjeta,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import {
  bloqueosEnRango,
  listarBloqueos,
  listarPlanes,
  listarReservas,
  opcionesAlojamiento,
  reservasEnRango,
} from "@/lib/admin/datos";
import {
  etiquetaFuente,
  porcentaje,
  resumirHotel,
  type Estadia,
  type FuenteEstadia,
} from "@/lib/admin/estadisticas";
import {
  diasDelMes,
  hoyISO,
  isoDe,
  mesDe,
  nochesEntre,
  sumarDiasISO,
  tituloMes,
} from "@/lib/admin/fechas";
import { tarifasParaReservaManual } from "@/lib/admin/temporadas";
import { ETIQUETA_ESTADO, TONO_ESTADO } from "@/lib/admin/tipos";
import { CUPO_DIA_DE_CALMA } from "@/lib/reserva/dia-de-calma";
import { tiposOfrecidosDe } from "@/lib/reserva/elegibilidad-calendario";
import { ocupacionDelCalendario } from "@/lib/reserva/ocupacion-externa";
import { formatearCOP, formatearFechaConDia } from "@/lib/utils/formato";

export const metadata: Metadata = { title: "Resumen" };
export const dynamic = "force-dynamic";

/**
 * El Resumen del panel: lo que pasa hoy, lo que viene esta semana y cómo va
 * el mes.
 *
 * Cuenta TODAS las reservas: las de la base (sitio web y panel) y las que el
 * hotel apunta a mano en su calendario de Google, sin contar dos veces la
 * misma (`resumirHotel()`, en `src/lib/admin/estadisticas.ts`, explica cómo).
 * Los ingresos van aparte: solo las reservas de la base tienen montos.
 *
 * Si Google no responde, la página no se rompe: cuenta lo de la base y lo
 * dice en una línea.
 */
export default async function PaginaResumen({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const hoy = hoyISO();
  const mes = mesDe(hoy);
  const primerDia = isoDe(mes, 1);
  const finDeMes = sumarDiasISO(isoDe(mes, diasDelMes(mes)), 1);
  const finSemana = sumarDiasISO(hoy, 8);
  /* Una ventana que cubre el mes Y los próximos siete días (al final del mes
     se sale de él). */
  const hasta = finSemana > finDeMes ? finSemana : finDeMes;

  const [
    alojamientos,
    reservas,
    bloqueosDelMes,
    tarifas,
    calendario,
    recientes,
    bloqueos,
    planes,
  ] = await Promise.all([
    opcionesAlojamiento(supabase),
    reservasEnRango(supabase, primerDia, hasta),
    bloqueosEnRango(supabase, primerDia, finDeMes),
    tarifasParaReservaManual(supabase),
    /* Nunca lanza: si Google falla, viene con estado y sin ocupación. */
    ocupacionDelCalendario(primerDia, hasta),
    listarReservas(supabase, { limite: 400 }),
    listarBloqueos(supabase),
    listarPlanes(supabase),
  ]);

  const tiposOfrecidos = Object.fromEntries(
    alojamientos.map((cabana) => [
      cabana.id,
      tiposOfrecidosDe({
        tarifas: Object.entries(tarifas)
          .filter(([clave]) => clave.startsWith(`${cabana.id}|`))
          .map(([, tarifa]) => tarifa),
      }),
    ]),
  );

  const resumen = resumirHotel({
    hoy,
    mes,
    alojamientos,
    reservas,
    bloqueos: bloqueosDelMes,
    franjas: calendario.estado === "conectado" ? calendario.ocupacion : [],
    diasDeCalma: calendario.estado === "conectado" ? calendario.diasDeCalma : [],
    tiposOfrecidos,
    ahora: new Date(),
  });

  const avisoCalendario =
    calendario.estado === "error"
      ? "No se pudo leer el calendario de Google del hotel: estas cifras cuentan solo las reservas del sitio y del panel."
      : calendario.estado === "sin_configurar"
        ? "El calendario de Google del hotel no está conectado: estas cifras cuentan solo las reservas del sitio y del panel."
        : calendario.lecturaIncompleta
          ? "Uno de los calendarios de Google del hotel no respondió: puede faltar alguna reserva apuntada allí."
          : null;

  /* Lo que ya mostraba el Resumen y sigue sirviendo: cosas por hacer. */
  const pendientes = recientes.filter((reserva) => reserva.estado === "pendiente");
  const porCobrar = recientes
    .filter((reserva) => reserva.estado !== "cancelada")
    .reduce(
      (suma, reserva) => suma + Math.max(0, reserva.total - reserva.monto_pagado),
      0,
    );
  const bloqueosVigentes = bloqueos.filter((bloqueo) => bloqueo.fin > hoy);
  const cabanasVisibles = alojamientos.filter((cabana) => cabana.activo);
  const planesVisibles = planes.filter((plan) => plan.activo);

  const nombreMes = tituloMes(mes).split(" ")[0].toLowerCase();
  const { ocupacion } = resumen;
  const totalDelMes =
    resumen.porFuente.sitio + resumen.porFuente.panel + resumen.porFuente.calendario;

  return (
    <>
      <EncabezadoPagina
        titulo="Resumen"
        descripcion={`Hoy es ${formatearFechaConDia(hoy)}. Cuenta las reservas del sitio, las del panel y las del calendario de Google del hotel.`}
        accion={
          <EnlaceBoton href="/admin/reservas/nueva">Nueva reserva</EnlaceBoton>
        }
      />

      <Aviso ok={params.ok} error={params.error} />

      {avisoCalendario ? (
        <div className="mb-5">
          <Banner tono="info">{avisoCalendario}</Banner>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          valor={resumen.enCasa.length}
          etiqueta="En casa esta noche"
          ayuda={`cabañas ocupadas de ${cabanasVisibles.length}${resumen.personasDeDiaHoy > 0 ? ` · ${resumen.personasDeDiaHoy} de día` : ""}`}
          href="/admin/reservas"
        />
        <Indicador
          valor={resumen.llegadasHoy.length}
          etiqueta="Llegan hoy"
          ayuda={
            resumen.salidasHoy.length > 0
              ? `${resumen.salidasHoy.length} ${resumen.salidasHoy.length === 1 ? "sale" : "salen"} hoy`
              : "nadie sale hoy"
          }
          href="/admin/reservas"
        />
        <Indicador
          valor={resumen.llegadasProximas.length}
          etiqueta="Llegan esta semana"
          ayuda="de mañana a dentro de 7 días"
          href="/admin/reservas"
        />
        <Indicador
          valor={`${porcentaje(ocupacion.ocupadas, ocupacion.disponibles)} %`}
          etiqueta={`Ocupación de ${nombreMes}`}
          ayuda={`${ocupacion.ocupadas} de ${ocupacion.disponibles} noches`}
          href="/admin/reservas"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Tarjeta>
          <CabeceraTarjeta
            titulo="Hoy"
            descripcion="Quién llega, quién sale y quién duerme esta noche."
          />
          <CuerpoTarjeta className="space-y-5">
            <GrupoDelDia
              titulo="Llegan hoy"
              estadias={resumen.llegadasHoy}
              vacio="Nadie llega hoy."
            />
            <GrupoDelDia
              titulo="Salen hoy"
              estadias={resumen.salidasHoy}
              vacio="Nadie sale hoy."
            />
            <GrupoDelDia
              titulo="En casa esta noche"
              estadias={resumen.enCasa}
              vacio="Ninguna cabaña ocupada esta noche."
            />
            {resumen.personasDeDiaHoy > 0 ? (
              <p className="text-[0.8125rem] text-crema-700">
                Día de Calma hoy: {resumen.personasDeDiaHoy} de {CUPO_DIA_DE_CALMA}{" "}
                cupos.
              </p>
            ) : null}
          </CuerpoTarjeta>
        </Tarjeta>

        <Tarjeta>
          <CabeceraTarjeta
            titulo="Próximos siete días"
            descripcion={`Las llegadas del ${formatearFechaConDia(sumarDiasISO(hoy, 1))} al ${formatearFechaConDia(sumarDiasISO(hoy, 7))}.`}
          />
          {resumen.llegadasProximas.length === 0 ? (
            <CuerpoTarjeta>
              <p className="text-[0.875rem] text-crema-600">
                No hay llegadas previstas en la próxima semana.
              </p>
            </CuerpoTarjeta>
          ) : (
            <ul className="divide-y divide-crema-900/[0.07]">
              {resumen.llegadasProximas.map((estadia) => (
                <li key={estadia.clave}>
                  <FilaEstadia estadia={estadia} conFecha />
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Tarjeta className="lg:col-span-3">
          <CabeceraTarjeta
            titulo={`Ocupación de ${nombreMes}`}
            descripcion="Noches ocupadas sobre las noches que se podían vender (sin bloqueos ni las noches que la cabaña no ofrece). Suma el sitio, el panel y el calendario del hotel."
          />
          <CuerpoTarjeta className="space-y-3.5">
            {ocupacion.porCabana.map((cabana) => (
              <Medidor
                key={cabana.id}
                etiqueta={cabana.nombre}
                ocupadas={cabana.ocupadas}
                disponibles={cabana.disponibles}
              />
            ))}
            <div className="border-t border-crema-900/[0.08] pt-3.5">
              <Medidor
                etiqueta="Total"
                ocupadas={ocupacion.ocupadas}
                disponibles={ocupacion.disponibles}
                fuerte
              />
            </div>
            {ocupacion.sinCabana > 0 ? (
              <p className="text-[0.75rem] leading-relaxed text-dorado-800">
                {ocupacion.sinCabana === 1
                  ? "1 evento del calendario del hotel no dice qué cabaña"
                  : `${ocupacion.sinCabana} eventos del calendario del hotel no dicen qué cabaña`}
                : bloquean todas en la disponibilidad, pero no entran en este
                porcentaje. Conviene escribir la cabaña en su título.
              </p>
            ) : null}
          </CuerpoTarjeta>
        </Tarjeta>

        <div className="space-y-6 lg:col-span-2">
          <Tarjeta>
            <CabeceraTarjeta
              titulo={`Reservas de ${nombreMes}`}
              descripcion={`Con llegada en ${nombreMes}, según de dónde salieron.`}
            />
            <CuerpoTarjeta>
              <PorFuente porFuente={resumen.porFuente} total={totalDelMes} />
              {resumen.diasDeCalma > 0 ? (
                <p className="mt-3 text-[0.75rem] text-crema-600">
                  De ellas, {resumen.diasDeCalma} de Día de Calma.
                </p>
              ) : null}
            </CuerpoTarjeta>
          </Tarjeta>

          <Tarjeta>
            <CabeceraTarjeta
              titulo={`Ingresos de ${nombreMes}`}
              descripcion="Solo de las reservas registradas en el sitio y el panel. Las del calendario de Google no tienen montos, así que no se suman."
            />
            <CuerpoTarjeta>
              <dl className="space-y-1.5 text-[0.875rem]">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-crema-700">
                    Total de {resumen.ingresos.reservas}{" "}
                    {resumen.ingresos.reservas === 1 ? "reserva" : "reservas"}
                  </dt>
                  <dd className="font-titulo text-[1.125rem] font-semibold tabular-nums text-crema-900">
                    {formatearCOP(resumen.ingresos.total)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-crema-700">Ya abonado</dt>
                  <dd className="font-medium tabular-nums text-crema-900">
                    {formatearCOP(resumen.ingresos.abonado)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-crema-700">Falta por cobrar</dt>
                  <dd className="font-medium tabular-nums text-dorado-800">
                    {formatearCOP(resumen.ingresos.porCobrar)}
                  </dd>
                </div>
              </dl>
            </CuerpoTarjeta>
          </Tarjeta>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AtajoSeccion
          href="/admin/reservas?estado=pendiente"
          titulo="Sin confirmar"
          detalle={
            pendientes.length === 0
              ? "ninguna reserva pendiente"
              : `${pendientes.length} ${pendientes.length === 1 ? "reserva pendiente" : "reservas pendientes"}`
          }
        />
        <AtajoSeccion
          href="/admin/reservas"
          titulo="Falta por cobrar"
          detalle={`${formatearCOP(porCobrar)} en todas las reservas activas`}
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
          href="/admin/planes"
          titulo="Planes tarifarios"
          detalle={`${planesVisibles.length} visibles de ${planes.length}`}
        />
      </div>
    </>
  );
}

/* ===========================================================================
 * Piezas
 * ======================================================================== */

const TONO_FUENTE: Record<FuenteEstadia, string> = {
  sitio: "bg-petroleo-600",
  panel: "bg-oliva-500",
  calendario: "bg-crema-500",
};

function EtiquetaFuente({ estadia }: { estadia: Estadia }) {
  if (estadia.fuente === "calendario") {
    return (
      <Pastilla tono={estadia.sinCabana ? "ambar" : "gris"}>
        {estadia.sinCabana ? "Calendario del hotel · sin cabaña" : "Calendario del hotel"}
      </Pastilla>
    );
  }
  return estadia.estado ? (
    <Pastilla tono={TONO_ESTADO[estadia.estado]}>
      {ETIQUETA_ESTADO[estadia.estado]}
    </Pastilla>
  ) : null;
}

/** Una estadía en una lista: nombre, cabaña, fechas y de dónde sale. */
function FilaEstadia({
  estadia,
  conFecha = false,
}: {
  estadia: Estadia;
  conFecha?: boolean;
}) {
  const noches = nochesEntre(estadia.entrada, estadia.salida);
  const contenido = (
    <>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[0.875rem] font-semibold text-crema-900">
            {estadia.nombre || "Sin nombre"}
          </span>
          <EtiquetaFuente estadia={estadia} />
        </p>
        <p className="mt-0.5 text-[0.75rem] text-crema-600">
          {estadia.cabana}
          <span className="mx-1.5">·</span>
          {conFecha ? `${formatearFechaConDia(estadia.entrada)} · ` : ""}
          {estadia.esDia
            ? `${estadia.personas ?? 0} ${estadia.personas === 1 ? "persona" : "personas"}`
            : `${noches} ${noches === 1 ? "noche" : "noches"}, sale el ${formatearFechaConDia(estadia.salida)}`}
          {/* La fuente de las del calendario ya la dice la pastilla. */}
          {estadia.fuente !== "calendario" ? (
            <>
              <span className="mx-1.5">·</span>
              {etiquetaFuente(estadia.fuente)}
            </>
          ) : null}
        </p>
      </div>
    </>
  );
  const clase =
    "flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6";
  return estadia.href ? (
    <Link href={estadia.href} className={`${clase} transition-colors hover:bg-crema-900/[0.025]`}>
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}

function GrupoDelDia({
  titulo,
  estadias,
  vacio,
}: {
  titulo: string;
  estadias: Estadia[];
  vacio: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-crema-600">
        {titulo}
        {estadias.length > 0 ? ` · ${estadias.length}` : ""}
      </p>
      {estadias.length === 0 ? (
        <p className="text-[0.875rem] text-crema-600">{vacio}</p>
      ) : (
        <ul className="-mx-4 divide-y divide-crema-900/[0.06] sm:-mx-6">
          {estadias.map((estadia) => (
            <li key={estadia.clave}>
              <FilaEstadia estadia={estadia} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Un medidor de ocupación: barra de un solo tono sobre una pista tenue, con
 * la cifra escrita al lado (el color nunca va solo).
 */
function Medidor({
  etiqueta,
  ocupadas,
  disponibles,
  fuerte = false,
}: {
  etiqueta: string;
  ocupadas: number;
  disponibles: number;
  fuerte?: boolean;
}) {
  const valor = porcentaje(ocupadas, disponibles);
  return (
    <div
      className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3"
      title={`${etiqueta}: ${ocupadas} de ${disponibles} noches ocupadas (${valor} %)`}
    >
      <span
        className={`truncate text-[0.8125rem] ${fuerte ? "font-semibold text-crema-900" : "text-crema-800"}`}
      >
        {etiqueta}
      </span>
      <span
        role="meter"
        aria-label={`Ocupación de ${etiqueta}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={valor}
        aria-valuetext={`${ocupadas} de ${disponibles} noches, ${valor} %`}
        className="h-2.5 overflow-hidden rounded-full bg-crema-900/[0.07]"
      >
        <span
          className={`block h-full rounded-full ${fuerte ? "bg-petroleo-700" : "bg-petroleo-500"}`}
          style={{ width: `${Math.min(100, valor)}%` }}
        />
      </span>
      <span
        className={`w-[7.5rem] text-right text-[0.8125rem] tabular-nums ${fuerte ? "font-semibold text-crema-900" : "text-crema-700"}`}
      >
        {valor} % <span className="text-crema-500">· {ocupadas}/{disponibles}</span>
      </span>
    </div>
  );
}

/** Las reservas del mes por fuente: tres cifras y una barra repartida. */
function PorFuente({
  porFuente,
  total,
}: {
  porFuente: Record<FuenteEstadia, number>;
  total: number;
}) {
  const fuentes: FuenteEstadia[] = ["sitio", "panel", "calendario"];
  return (
    <div>
      {total > 0 ? (
        <div
          aria-hidden="true"
          className="mb-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full"
        >
          {fuentes
            .filter((fuente) => porFuente[fuente] > 0)
            .map((fuente) => (
              <span
                key={fuente}
                className={`h-full first:rounded-l-full last:rounded-r-full ${TONO_FUENTE[fuente]}`}
                style={{ flexGrow: porFuente[fuente] }}
              />
            ))}
        </div>
      ) : null}
      <dl className="space-y-1.5">
        {fuentes.map((fuente) => (
          <div key={fuente} className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-[0.875rem] text-crema-800">
              <span
                aria-hidden="true"
                className={`size-2.5 shrink-0 rounded-full ${TONO_FUENTE[fuente]}`}
              />
              {etiquetaFuente(fuente)}
            </dt>
            <dd className="font-titulo text-[1.125rem] font-semibold tabular-nums text-crema-900">
              {porFuente[fuente]}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[0.75rem] text-crema-600">
        {total === 0 ? "Ninguna reserva con llegada este mes." : `Total: ${total}.`}
      </p>
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

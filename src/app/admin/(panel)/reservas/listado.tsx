import Link from "next/link";
import type { ReactNode } from "react";

import { COLOR_GOOGLE, COLOR_GOOGLE_SIN_CABANA, PATRON_GOOGLE } from "./estilos-calendario";
import {
  Banner,
  CabeceraTarjeta,
  CuerpoTarjeta,
  EnlaceBoton,
  EstadoVacio,
  Pastilla,
  Tarjeta,
} from "@/components/admin/ui";
import {
  ESTADOS_LISTADO,
  ETIQUETA_ORIGEN_LISTADO,
  ORIGENES_LISTADO,
  cambiarFiltro,
  parametrosDeFiltros,
  type FiltrosListado,
  type ListadoDeReservas,
} from "@/lib/admin/listado-reservas";
import type { ResumenPagoReserva } from "@/lib/admin/pagos";
import {
  ETIQUETA_CORTA_TIPO_RESERVA,
  ETIQUETA_ESTADO,
  ETIQUETA_ORIGEN,
  TONO_ESTADO,
  type ReservaAdmin,
} from "@/lib/admin/tipos";
import { cuentaAtras, vencePronto } from "@/lib/reserva/holds";
import type { EstadoConexion } from "@/lib/reserva/ocupacion-externa";
import { formatearCOP, formatearFecha, formatearRango } from "@/lib/utils/formato";

/**
 * El listado de Reservas: la base (sitio web y panel) y los eventos del
 * calendario de Google del hotel, con sus filtros. Las reglas —qué entra, qué
 * no se repite y cómo se combinan los filtros— viven en
 * `src/lib/admin/listado-reservas.ts`; aquí solo se dibuja.
 */
export function ListadoReservas({
  listado,
  filtros,
  mesClave,
  mesEnPalabras,
  calendario,
  pagos,
  ahora,
}: {
  listado: ListadoDeReservas;
  filtros: FiltrosListado;
  /** «2026-10», para los enlaces. */
  mesClave: string;
  /** «octubre de 2026». */
  mesEnPalabras: string;
  /** Cómo fue la lectura de Google (solo importa en la vista del mes). */
  calendario: { estado: EstadoConexion; lecturaIncompleta: boolean };
  /** Resumen del dinero de cada reserva de la base, por id. */
  pagos: Map<string, ResumenPagoReserva>;
  ahora: Date;
}) {
  const enlace = (cambio: Partial<FiltrosListado>) => {
    const parametros = parametrosDeFiltros(cambiarFiltro(filtros, cambio));
    parametros.set("mes", mesClave);
    /* `#listado`: tocar un filtro no devuelve la pantalla al calendario. */
    return `/admin/reservas?${parametros.toString()}#listado`;
  };
  const delMes = filtros.vista === "mes";

  return (
    <div className="mt-8" id="listado">
      <Tarjeta>
        <CabeceraTarjeta
          titulo={delMes ? `Reservas de ${mesEnPalabras}` : "Todas las reservas del sitio y del panel"}
          descripcion={
            delMes
              ? `Todo lo que tiene noches o Día de Calma en ${mesEnPalabras}, por fecha de llegada. Cambia de mes con las flechas del calendario.`
              : "Las últimas registradas primero (hasta 300). Los eventos del calendario del hotel se ven mes a mes."
          }
        />

        <div className="space-y-3 border-b border-crema-900/[0.07] px-4 py-3.5 sm:px-6">
          {/* La línea de ayuda: de dónde sale cada cosa. */}
          <p className="text-[0.8125rem] leading-relaxed text-crema-700">
            <strong className="font-semibold text-crema-900">Sitio web</strong> y{" "}
            <strong className="font-semibold text-crema-900">Panel</strong> son
            reservas registradas aquí, con ficha, teléfono e importes;{" "}
            <strong className="font-semibold text-crema-900">Calendario del hotel</strong>{" "}
            son los eventos que el equipo apunta a mano en Google: se ven, pero se
            cambian en Google. Nada sale dos veces.
          </p>

          <FilaDeFiltros etiqueta="Fechas">
            <Chip href={enlace({ vista: "mes" })} activo={delMes}>
              {mesEnPalabras.charAt(0).toUpperCase() + mesEnPalabras.slice(1)}
            </Chip>
            <Chip href={enlace({ vista: "todas" })} activo={!delMes}>
              Todas las fechas
            </Chip>
          </FilaDeFiltros>

          <FilaDeFiltros etiqueta="Origen">
            {ORIGENES_LISTADO.map((origen) => (
              <Chip
                key={origen}
                href={enlace({ origen })}
                activo={filtros.origen === origen}
                cuenta={listado.cuantos[origen]}
              >
                {ETIQUETA_ORIGEN_LISTADO[origen]}
              </Chip>
            ))}
          </FilaDeFiltros>

          <FilaDeFiltros etiqueta="Estado">
            {ESTADOS_LISTADO.map((estado) => (
              <Chip
                key={estado}
                href={enlace({ estado })}
                activo={filtros.estado === estado}
              >
                {estado === "todos" ? "Todos" : ETIQUETA_ESTADO[estado]}
              </Chip>
            ))}
          </FilaDeFiltros>

          {/* Cómo se combinan: el estado es solo de la base. */}
          {filtros.origen === "calendario" ? (
            <p className="text-[0.75rem] leading-relaxed text-crema-600">
              Los eventos del calendario del hotel no tienen estado: si eliges uno,
              el listado vuelve a las reservas del sitio y del panel.
            </p>
          ) : listado.ocultosPorEstado > 0 ? (
            <p className="text-[0.75rem] leading-relaxed text-crema-600">
              El estado solo lo tienen las reservas del sitio y del panel: con «
              {ETIQUETA_ESTADO[filtros.estado as keyof typeof ETIQUETA_ESTADO]}»
              elegido no salen {listado.ocultosPorEstado === 1
                ? "el evento"
                : `los ${listado.ocultosPorEstado} eventos`}{" "}
              del calendario del hotel de este mes.
            </p>
          ) : null}

          {/* Si Google no respondió, se dice: el listado trae solo la base. */}
          {delMes && calendario.estado === "error" ? (
            <Banner tono="info">
              El calendario de Google del hotel no respondió, así que aquí solo
              salen las reservas del sitio y del panel. Vuelve a cargar la página
              en un minuto.
            </Banner>
          ) : delMes && calendario.estado === "sin_configurar" ? (
            <Banner tono="info">
              El calendario de Google del hotel no está conectado: aquí solo salen
              las reservas del sitio y del panel.
            </Banner>
          ) : delMes && calendario.lecturaIncompleta ? (
            <Banner tono="info">
              Uno de los calendarios del hotel no se pudo leer: puede faltar algún
              evento suyo en este listado.
            </Banner>
          ) : null}
        </div>

        {listado.filas.length === 0 ? (
          <CuerpoTarjeta>
            <ListadoVacio filtros={filtros} mesEnPalabras={mesEnPalabras} />
          </CuerpoTarjeta>
        ) : (
          <ul className="divide-y divide-crema-900/[0.07]">
            {listado.filas.map((fila) =>
              fila.tipo === "reserva" ? (
                <FilaReserva
                  key={fila.clave}
                  reserva={fila.reserva}
                  pago={pagos.get(fila.reserva.id)}
                  ahora={ahora}
                />
              ) : (
                <li key={fila.clave}>
                  <FilaEventoDelHotel
                    nombre={fila.estadia.nombre}
                    cabana={fila.estadia.cabana}
                    entrada={fila.estadia.entrada}
                    salida={fila.estadia.salida}
                    esDia={fila.estadia.esDia}
                    personas={fila.estadia.personas}
                    sinCabana={fila.estadia.sinCabana}
                  />
                </li>
              ),
            )}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}

function FilaDeFiltros({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <nav
      aria-label={`Filtrar por ${etiqueta.toLowerCase()}`}
      className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3"
    >
      <span className="w-16 shrink-0 text-[0.75rem] font-semibold uppercase tracking-wide text-crema-600">
        {etiqueta}
      </span>
      <ul className="flex flex-wrap gap-2">{children}</ul>
    </nav>
  );
}

function Chip({
  href,
  activo,
  cuenta,
  children,
}: {
  href: string;
  activo: boolean;
  cuenta?: number | null;
  children: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={activo ? "true" : undefined}
        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors ${
          activo
            ? "bg-petroleo-600 text-white"
            : "bg-crema-900/[0.05] text-crema-700 hover:bg-crema-900/[0.09]"
        }`}
      >
        {children}
        {typeof cuenta === "number" ? (
          <span
            className={`tabular-nums ${activo ? "text-white/80" : "text-crema-500"}`}
          >
            {cuenta}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function ListadoVacio({
  filtros,
  mesEnPalabras,
}: {
  filtros: FiltrosListado;
  mesEnPalabras: string;
}) {
  const sinFiltros = filtros.origen === "todos" && filtros.estado === "todos";
  if (sinFiltros && filtros.vista === "todas") {
    return (
      <EstadoVacio
        titulo="Todavía no hay reservas"
        descripcion="Aquí quedan registradas todas las estadías: las que lleguen por el sitio y las que apuntes tú cuando te escriban por WhatsApp o te llamen. Al crear una, esas noches se bloquean solas en el calendario."
        accion={
          <EnlaceBoton href="/admin/reservas/nueva">
            Registrar la primera reserva
          </EnlaceBoton>
        }
      />
    );
  }
  if (sinFiltros) {
    return (
      <EstadoVacio
        titulo={`Nada en ${mesEnPalabras}`}
        descripcion="Ni reservas del sitio o del panel ni eventos del calendario del hotel con fechas en este mes. Cambia de mes con las flechas del calendario."
      />
    );
  }
  return (
    <EstadoVacio
      titulo="Nada con estos filtros"
      descripcion="Prueba con «Todos» en el origen y en el estado, o mira otro mes."
    />
  );
}

/** Una reserva de la base: abre su ficha. */
function FilaReserva({
  reserva,
  pago,
  ahora,
}: {
  reserva: ReservaAdmin;
  pago: ResumenPagoReserva | undefined;
  ahora: Date;
}) {
  /*
    LA CUENTA ATRÁS DEL HOLD.

    Solo aparece en las pendientes que vencen —las del sitio, que esperan un
    pago—. Las que el equipo apunta a mano no vencen y no muestran nada: una
    cuenta atrás donde no hay plazo asusta sin motivo.

    El plazo son treinta minutos y esta página no se refresca sola, así que el
    texto va en minutos y no en segundos: a los segundos estaría mintiendo desde
    el primer instante.
  */
  const restante =
    reserva.estado === "pendiente" ? cuentaAtras(reserva.expira_at, ahora) : null;
  const urgente = vencePronto(reserva, ahora);
  const falta = reserva.total - reserva.monto_pagado;
  const esDia = reserva.tipo === "dia";

  return (
    <li>
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
            {/* «Sin pago» en una cancelada es ruido: ahí no hay nada que cobrar
                y la pastilla del estado ya lo dice. */}
            {reserva.estado !== "cancelada" && pago ? (
              <Pastilla tono={pago.tono}>{pago.etiqueta}</Pastilla>
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
            {esDia
              ? `${ETIQUETA_CORTA_TIPO_RESERVA.dia} · ${reserva.num_personas} ${reserva.num_personas === 1 ? "persona" : "personas"}`
              : (reserva.alojamiento_nombre ?? "Sin cabaña")}
            <span className="mx-1.5">·</span>
            {/* Un Día de Calma es un solo día: «04/10/2026», no «04/10 al 05/10». */}
            {esDia ? formatearFecha(reserva.entrada) : formatearRango(reserva.entrada, reserva.salida)}
            <span className="mx-1.5">·</span>
            {reserva.origen === "web" ? "Sitio web" : `Panel (${ETIQUETA_ORIGEN[reserva.origen].toLowerCase()})`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[0.9375rem] font-semibold text-crema-900">
            {formatearCOP(reserva.total)}
          </p>
          {/* Lo que falta pesa más que lo abonado: es la acción pendiente, no
              el dato histórico. */}
          {reserva.monto_pagado > 0 && falta > 0 ? (
            <p className="text-[0.75rem] text-dorado-700">falta {formatearCOP(falta)}</p>
          ) : reserva.monto_pagado > 0 ? (
            <p className="text-[0.75rem] text-crema-600">
              abonado {formatearCOP(reserva.monto_pagado)}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

/**
 * Un evento del calendario de Google del hotel: solo lectura. No tiene ficha,
 * ni teléfono, ni importes; se cambia en Google.
 */
function FilaEventoDelHotel({
  nombre,
  cabana,
  entrada,
  salida,
  esDia,
  personas,
  sinCabana,
}: {
  nombre: string;
  cabana: string;
  entrada: string;
  salida: string;
  esDia: boolean;
  personas: number | null;
  sinCabana: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3.5 sm:px-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-titulo text-[0.9375rem] font-semibold text-crema-900">
            {nombre}
          </span>
          <span
            style={PATRON_GOOGLE}
            className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${
              sinCabana ? COLOR_GOOGLE_SIN_CABANA : COLOR_GOOGLE
            }`}
          >
            Calendario del hotel
          </span>
        </div>
        <p className="mt-0.5 text-[0.75rem] text-crema-600">
          {esDia
            ? `Día de Calma · ${personas ?? 2} personas (así se cuenta cada «plan día»)`
            : sinCabana
              ? "Sin cabaña: el evento no dice cuál, así que ocupa las cinco"
              : cabana}
          <span className="mx-1.5">·</span>
          {esDia ? formatearFecha(entrada) : formatearRango(entrada, salida)}
        </p>
      </div>
      <p className="text-right text-[0.75rem] text-crema-500">Se cambia en Google</p>
    </div>
  );
}

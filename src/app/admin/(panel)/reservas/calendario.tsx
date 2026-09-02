import Link from "next/link";

import {
  DIAS_SEMANA_INICIAL,
  claveMes,
  diasDeMes,
  esFinDeSemana,
  hoyISO,
  indiceDiaSemana,
  sumarMeses,
  tituloMes,
  type AnioMes,
} from "@/lib/admin/fechas";
import { ETIQUETA_ESTADO } from "@/lib/admin/tipos";
import type {
  BloqueoAdmin,
  OpcionAlojamiento,
  ReservaAdmin,
} from "@/lib/admin/tipos";
import type { EstadoReserva } from "@/lib/tipos/basedatos";

/**
 * Calendario mensual del hotel: una fila por cabaña, una columna por día.
 *
 * Es la pantalla que el cliente abre todos los días, así que está pensada para
 * responder de un vistazo a "¿qué tengo ocupado este mes?". Cada celda es una
 * noche; las noches de una misma reserva se pintan como una barra continua con
 * el nombre del huésped encima.
 *
 * Es un componente de SERVIDOR: el mes viaja en la dirección (`?mes=2026-09`),
 * así que las flechas son enlaces normales. No hay estado en el navegador que
 * pueda quedar desincronizado con los datos.
 */

type Ocupacion =
  | { tipo: "reserva"; reserva: ReservaAdmin }
  | { tipo: "bloqueo"; bloqueo: BloqueoAdmin };

const COLOR_ESTADO: Record<EstadoReserva, string> = {
  pendiente: "bg-dorado-400 text-dorado-950",
  confirmada: "bg-petroleo-500 text-white",
  completada: "bg-petroleo-200 text-petroleo-900",
  cancelada: "bg-crema-300 text-crema-800",
};

const COLOR_BLOQUEO = "bg-crema-600 text-white";

export function CalendarioMes({
  mes,
  alojamientos,
  reservas,
  bloqueos,
}: {
  mes: AnioMes;
  alojamientos: OpcionAlojamiento[];
  reservas: ReservaAdmin[];
  bloqueos: BloqueoAdmin[];
}) {
  const dias = diasDeMes(mes);
  const hoy = hoyISO();

  const anterior = claveMes(sumarMeses(mes, -1));
  const siguiente = claveMes(sumarMeses(mes, 1));
  const actual = claveMes({
    anio: Number(hoy.slice(0, 4)),
    mes: Number(hoy.slice(5, 7)),
  });

  /** Qué ocupa cada noche de cada cabaña. */
  const ocupacion = new Map<string, Ocupacion>();

  for (const bloqueo of bloqueos) {
    for (const dia of dias) {
      if (dia >= bloqueo.inicio && dia < bloqueo.fin) {
        ocupacion.set(`${bloqueo.alojamiento_id}|${dia}`, {
          tipo: "bloqueo",
          bloqueo,
        });
      }
    }
  }

  // Las reservas se pintan encima de los bloqueos: si por lo que sea coexisten,
  // manda la información del huésped.
  for (const reserva of reservas) {
    if (!reserva.alojamiento_id) continue;
    if (reserva.estado === "cancelada") continue;
    for (const dia of dias) {
      if (dia >= reserva.entrada && dia < reserva.salida) {
        ocupacion.set(`${reserva.alojamiento_id}|${dia}`, {
          tipo: "reserva",
          reserva,
        });
      }
    }
  }

  return (
    <div className="rounded-amplio bg-white shadow-tarjeta ring-1 ring-crema-900/[0.06]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-crema-900/[0.07] px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-1.5">
          <FlechaMes href={`?mes=${anterior}`} etiqueta="Mes anterior">
            <path d="m14 6-6 6 6 6" />
          </FlechaMes>
          <h2 className="min-w-[10rem] text-center font-titulo text-[1.0625rem] font-semibold text-crema-900">
            {tituloMes(mes)}
          </h2>
          <FlechaMes href={`?mes=${siguiente}`} etiqueta="Mes siguiente">
            <path d="m10 6 6 6-6 6" />
          </FlechaMes>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {claveMes(mes) !== actual && (
            <Link
              href={`?mes=${actual}`}
              className="rounded-full bg-crema-900/[0.06] px-3 py-1.5 text-[0.8125rem] font-semibold text-crema-900 transition-colors hover:bg-crema-900/[0.1]"
            >
              Ir a hoy
            </Link>
          )}
          <Leyenda />
        </div>
      </header>

      {alojamientos.length === 0 ? (
        <p className="px-6 py-10 text-center text-[0.875rem] text-crema-600">
          Todavía no hay cabañas creadas, así que el calendario está vacío.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-separate border-spacing-0 text-[0.75rem]">
            <caption className="sr-only">
              Ocupación de {tituloMes(mes)}: una fila por cabaña y una columna por
              día.
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 w-36 border-b border-crema-900/[0.07] bg-white px-3 py-2 text-left font-semibold text-crema-700"
                >
                  Cabaña
                </th>
                {dias.map((dia) => {
                  const numero = Number(dia.slice(8, 10));
                  const finde = esFinDeSemana(dia);
                  const esHoy = dia === hoy;
                  return (
                    <th
                      key={dia}
                      scope="col"
                      className={`w-[1.9rem] border-b border-crema-900/[0.07] px-0 py-1.5 text-center font-medium ${
                        esHoy
                          ? "bg-petroleo-600/10 text-petroleo-800"
                          : finde
                            ? "bg-crema-900/[0.04] text-crema-700"
                            : "text-crema-600"
                      }`}
                    >
                      <span className="block text-[0.5625rem] uppercase leading-none">
                        {DIAS_SEMANA_INICIAL[indiceDiaSemana(dia)]}
                      </span>
                      <span
                        className={`mt-0.5 block leading-none ${esHoy ? "font-bold" : ""}`}
                      >
                        {numero}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {alojamientos.map((alojamiento) => (
                <tr key={alojamiento.id}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-b border-crema-900/[0.05] bg-white px-3 py-2 text-left"
                  >
                    <span className="block truncate text-[0.8125rem] font-semibold text-crema-900">
                      {alojamiento.nombre}
                    </span>
                    {!alojamiento.activo && (
                      <span className="block text-[0.625rem] text-crema-500">
                        pausada
                      </span>
                    )}
                  </th>
                  {dias.map((dia, indice) => (
                    <Celda
                      key={dia}
                      dia={dia}
                      hoy={hoy}
                      ocupacion={ocupacion.get(`${alojamiento.id}|${dia}`)}
                      anterior={
                        indice > 0
                          ? ocupacion.get(`${alojamiento.id}|${dias[indice - 1]}`)
                          : undefined
                      }
                      siguiente={
                        indice < dias.length - 1
                          ? ocupacion.get(`${alojamiento.id}|${dias[indice + 1]}`)
                          : undefined
                      }
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Identidad de lo que ocupa una celda, para saber si la barra continúa. */
function identidad(ocupacion?: Ocupacion): string | null {
  if (!ocupacion) return null;
  return ocupacion.tipo === "reserva"
    ? ocupacion.reserva.id
    : ocupacion.bloqueo.id;
}

function Celda({
  dia,
  hoy,
  ocupacion,
  anterior,
  siguiente,
}: {
  dia: string;
  hoy: string;
  ocupacion?: Ocupacion;
  anterior?: Ocupacion;
  siguiente?: Ocupacion;
}) {
  const finde = esFinDeSemana(dia);
  const esHoy = dia === hoy;

  const fondoLibre = esHoy
    ? "bg-petroleo-600/[0.07]"
    : finde
      ? "bg-crema-900/[0.03]"
      : "";

  const claseCelda = `h-9 border-b border-crema-900/[0.05] p-0 align-middle ${fondoLibre}`;

  if (!ocupacion) return <td className={claseCelda} />;

  /* Las noches seguidas de la misma reserva se pintan como UNA barra continua:
     solo el primer día lleva el nombre y solo los extremos van redondeados. */
  const clave = identidad(ocupacion);
  const empieza = clave !== identidad(anterior);
  const termina = clave !== identidad(siguiente);

  const bordes = `${empieza ? "ml-0.5 rounded-l-[4px] pl-1" : ""} ${
    termina ? "mr-0.5 rounded-r-[4px]" : ""
  }`;

  if (ocupacion.tipo === "bloqueo") {
    const { bloqueo } = ocupacion;
    const motivo = bloqueo.motivo ?? "sin motivo";
    return (
      <td className={claseCelda}>
        <div className="flex h-full items-stretch py-1">
          <span
            title={`Bloqueo: ${motivo}`}
            className={`flex flex-1 items-center overflow-hidden ${bordes} ${COLOR_BLOQUEO}`}
          >
            {empieza && (
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                aria-hidden="true"
              >
                <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" />
              </svg>
            )}
            <span className="sr-only">Bloqueado: {motivo}</span>
          </span>
        </div>
      </td>
    );
  }

  const { reserva } = ocupacion;
  return (
    <td className={claseCelda}>
      <div className="flex h-full items-stretch py-1">
        <Link
          href={`/admin/reservas/${reserva.id}`}
          title={`${reserva.huesped_nombre} · ${reserva.codigo} · ${ETIQUETA_ESTADO[reserva.estado]}`}
          className={`flex flex-1 items-center overflow-hidden transition-opacity hover:opacity-80 ${bordes} ${COLOR_ESTADO[reserva.estado]}`}
        >
          {empieza && (
            <span className="truncate text-[0.5625rem] font-semibold leading-none">
              {primerNombre(reserva.huesped_nombre)}
            </span>
          )}
          <span className="sr-only">
            {reserva.huesped_nombre}, reserva {reserva.codigo},{" "}
            {ETIQUETA_ESTADO[reserva.estado]}
          </span>
        </Link>
      </div>
    </td>
  );
}

function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

function FlechaMes({
  href,
  etiqueta,
  children,
}: {
  href: string;
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={etiqueta}
      title={etiqueta}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-crema-700 transition-colors hover:bg-crema-900/[0.07]"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </Link>
  );
}

function Leyenda() {
  const items: { color: string; etiqueta: string }[] = [
    { color: COLOR_ESTADO.confirmada, etiqueta: "Confirmada" },
    { color: COLOR_ESTADO.pendiente, etiqueta: "Pendiente" },
    { color: COLOR_ESTADO.completada, etiqueta: "Completada" },
    { color: COLOR_BLOQUEO, etiqueta: "Bloqueo" },
  ];

  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {items.map((item) => (
        <li
          key={item.etiqueta}
          className="flex items-center gap-1.5 text-[0.75rem] text-crema-700"
        >
          <span
            className={`h-3 w-3 rounded-[3px] ${item.color}`}
            aria-hidden="true"
          />
          {item.etiqueta}
        </li>
      ))}
    </ul>
  );
}

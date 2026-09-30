import Link from "next/link";
import type { CSSProperties } from "react";

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
import { CUPO_DIA_DE_CALMA } from "@/lib/reserva/dia-de-calma";
import { ocupaCalendario } from "@/lib/reserva/holds";
import { cabanasAfectadas } from "@/lib/reserva/calendario-externo";
import type { OcupacionExterna } from "@/lib/reserva/calendario-externo";
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
 * Debajo de las cabañas hay una fila más: el **Día de Calma**. No es una
 * cabaña —esas reservas no ocupan ninguna— pero sí tiene un límite propio, de
 * {@link CUPO_DIA_DE_CALMA} personas por día en toda la finca, y el equipo
 * necesita verlo junto al resto del mes: `4/10`, con el color subiendo de tono
 * según se llena.
 *
 * Es un componente de SERVIDOR: el mes viaja en la dirección (`?mes=2026-09`),
 * así que las flechas son enlaces normales. No hay estado en el navegador que
 * pueda quedar desincronizado con los datos.
 */

type Ocupacion =
  | { tipo: "reserva"; reserva: ReservaAdmin }
  | { tipo: "bloqueo"; bloqueo: BloqueoAdmin }
  | { tipo: "google"; franja: OcupacionExterna };

const COLOR_ESTADO: Record<EstadoReserva, string> = {
  pendiente: "bg-dorado-400 text-dorado-950",
  confirmada: "bg-petroleo-500 text-white",
  completada: "bg-petroleo-200 text-petroleo-900",
  cancelada: "bg-crema-300 text-crema-800",
};

const COLOR_BLOQUEO = "bg-crema-600 text-white";

/**
 * La capa de Google se pinta RAYADA, no con un color plano.
 *
 * Tiene que distinguirse de un vistazo de lo que vive en la base: esas franjas
 * no son reservas nuestras —no tienen código, ni huésped, ni total— sino lo
 * que el hotel apuntó a mano en su calendario. Una trama diagonal dice
 * «ocupado, pero de otra fuente» sin gastar otro color de la paleta.
 */
const PATRON_GOOGLE: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(31,90,90,0.34) 0 3px, rgba(31,90,90,0.10) 3px 7px)",
};

export function CalendarioMes({
  mes,
  alojamientos,
  reservas,
  bloqueos,
  personasDeDia,
  ocupacionGoogle = [],
}: {
  mes: AnioMes;
  alojamientos: OpcionAlojamiento[];
  reservas: ReservaAdmin[];
  bloqueos: BloqueoAdmin[];
  /** Personas reservadas de día, por fecha. Alimenta la fila del Día de Calma. */
  personasDeDia: Map<string, number>;
  /** Franjas del Google Calendar del hotel. Vacío si no está conectado. */
  ocupacionGoogle?: OcupacionExterna[];
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

  /* Google va PRIMERO, o sea DEBAJO: si una noche está en las dos fuentes,
     manda la nuestra, que es la que tiene nombre, código y teléfono. La franja
     de Google sin cabaña reconocible se pinta en las cinco filas, que es lo
     mismo que hace la comprobación de disponibilidad. */
  const cabanasParaEmparejar = alojamientos.map((alojamiento) => ({
    id: alojamiento.id,
    nombre: alojamiento.nombre,
  }));
  for (const franja of ocupacionGoogle) {
    for (const cabana of cabanasAfectadas(franja, cabanasParaEmparejar)) {
      for (const dia of dias) {
        if (dia >= franja.inicio && dia < franja.fin) {
          ocupacion.set(`${cabana.id}|${dia}`, { tipo: "google", franja });
        }
      }
    }
  }

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
  /* Un solo instante para todo el mes: si cada fila leyera su propio `new
     Date()`, dos celdas de la misma reserva podrían caer a lados distintos del
     vencimiento y la barra saldría partida. */
  const ahora = new Date();

  for (const reserva of reservas) {
    /* Las de Día de Calma no ocupan cabaña: van en su propia fila, abajo. */
    if (reserva.tipo === "dia") continue;
    if (!reserva.alojamiento_id) continue;
    /* La MISMA regla que el sitio público y que la comprobación de choques:
       una cancelada no ocupa, y tampoco una solicitud cuyo hold venció. Pintar
       una noche como ocupada cuando el sitio la vende libre sería enseñarle al
       hotel un calendario que no es el que tienen los huéspedes. */
    if (!ocupaCalendario(reserva, ahora)) continue;
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

              {/*
                LA FILA DEL DÍA DE CALMA.
                No es una cabaña: es el cupo de la finca entera para las visitas
                de día. Va debajo de las cinco cabañas, separada por una línea
                más marcada, porque se lee distinto: aquí no hay barras de
                reserva sino cuántas de las diez personas del día están tomadas.
              */}
              <tr>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-t-2 border-b border-crema-900/[0.05] border-t-crema-900/[0.12] bg-white px-3 py-2 text-left"
                >
                  <span className="block truncate text-[0.8125rem] font-semibold text-crema-900">
                    Día de Calma
                  </span>
                  <span className="block text-[0.625rem] text-crema-500">
                    cupo {CUPO_DIA_DE_CALMA} personas/día
                  </span>
                </th>
                {dias.map((dia) => (
                  <CeldaCupo
                    key={dia}
                    dia={dia}
                    hoy={hoy}
                    personas={personasDeDia.get(dia) ?? 0}
                  />
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Una celda de la fila del Día de Calma: cuántas de las diez personas del día
 * están tomadas.
 *
 * El color sube de tono con la ocupación —claro cuando hay sitio de sobra,
 * ámbar cuando queda poco, lleno cuando no cabe nadie más— para poder barrer
 * el mes con la vista sin leer los números uno a uno. El texto («4/10») sigue
 * ahí para quien sí necesita el dato exacto, y el `title` lo dice con
 * palabras para quien usa lector de pantalla.
 */
function CeldaCupo({
  dia,
  hoy,
  personas,
}: {
  dia: string;
  hoy: string;
  personas: number;
}) {
  const finde = esFinDeSemana(dia);
  const esHoy = dia === hoy;
  const lleno = personas >= CUPO_DIA_DE_CALMA;

  const fondoLibre = esHoy
    ? "bg-petroleo-600/[0.07]"
    : finde
      ? "bg-crema-900/[0.03]"
      : "";

  if (personas <= 0) {
    return (
      <td
        className={`h-9 border-t-2 border-b border-crema-900/[0.05] border-t-crema-900/[0.12] p-0 align-middle ${fondoLibre}`}
      />
    );
  }

  const tono = lleno
    ? "bg-crema-700 text-white"
    : personas >= CUPO_DIA_DE_CALMA * 0.6
      ? "bg-dorado-400 text-dorado-950"
      : "bg-oliva-200 text-oliva-900";

  return (
    <td
      className={`h-9 border-t-2 border-b border-crema-900/[0.05] border-t-crema-900/[0.12] p-0 align-middle ${fondoLibre}`}
    >
      <div className="flex h-full items-stretch px-0.5 py-1">
        <span
          title={`${personas} de ${CUPO_DIA_DE_CALMA} cupos del Día de Calma${lleno ? " — completo" : ""}`}
          className={`flex flex-1 items-center justify-center rounded-[4px] text-[0.5rem] leading-none font-bold tabular-nums ${tono}`}
        >
          {personas}/{CUPO_DIA_DE_CALMA}
          <span className="sr-only">
            {" "}
            personas en el Día de Calma{lleno ? ", completo" : ""}
          </span>
        </span>
      </div>
    </td>
  );
}

/** Identidad de lo que ocupa una celda, para saber si la barra continúa. */
function identidad(ocupacion?: Ocupacion): string | null {
  if (!ocupacion) return null;
  if (ocupacion.tipo === "reserva") return ocupacion.reserva.id;
  if (ocupacion.tipo === "bloqueo") return ocupacion.bloqueo.id;
  return `google:${ocupacion.franja.eventoId}`;
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

  if (ocupacion.tipo === "google") {
    const { franja } = ocupacion;
    const aclaracion =
      franja.motivo === "sin_cabana"
        ? " — el evento no dice qué cabaña, así que se marcan todas"
        : "";
    return (
      <td className={claseCelda}>
        <div className="flex h-full items-stretch py-1">
          <span
            style={PATRON_GOOGLE}
            title={`Calendario del hotel: ${franja.titulo}${aclaracion}`}
            className={`flex flex-1 items-center overflow-hidden text-petroleo-900 ${bordes}`}
          >
            {empieza && (
              <span className="truncate text-[0.5625rem] font-semibold leading-none">
                {franja.titulo}
              </span>
            )}
            <span className="sr-only">
              Ocupado en el calendario del hotel: {franja.titulo}
              {aclaracion}
            </span>
          </span>
        </div>
      </td>
    );
  }

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
  const items: { color: string; etiqueta: string; estilo?: CSSProperties }[] = [
    { color: COLOR_ESTADO.confirmada, etiqueta: "Confirmada" },
    { color: COLOR_ESTADO.pendiente, etiqueta: "Pendiente" },
    { color: COLOR_ESTADO.completada, etiqueta: "Completada" },
    { color: COLOR_BLOQUEO, etiqueta: "Bloqueo" },
    { color: "bg-oliva-200", etiqueta: "Día de Calma" },
    { color: "", etiqueta: "Google Calendar", estilo: PATRON_GOOGLE },
  ];

  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {items.map((item) => (
        <li
          key={item.etiqueta}
          className="flex items-center gap-1.5 text-[0.75rem] text-crema-700"
        >
          <span
            style={item.estilo}
            className={`h-3 w-3 rounded-[3px] ${item.color}`}
            aria-hidden="true"
          />
          {item.etiqueta}
        </li>
      ))}
    </ul>
  );
}

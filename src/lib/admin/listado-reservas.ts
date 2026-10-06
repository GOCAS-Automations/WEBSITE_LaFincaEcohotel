/**
 * El listado de `/admin/reservas`: las reservas de la base y los eventos del
 * calendario de Google del hotel, juntos y sin repetir nada.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EL LISTADO VA POR MES
 * ---------------------------------------------------------------------------
 * Antes el listado solo traía la base (las 300 últimas, por fecha de registro)
 * y lo que el equipo apunta a mano en Google salía en el calendario pero no
 * aquí. Google se lee por ventanas de fechas y sus eventos no tienen «fecha de
 * registro» en la que ordenarlos, así que el listado sigue **el mes que enseña
 * el calendario de arriba** (`?mes=`), por fecha de llegada: lo que se ve en
 * el calendario está debajo, de las tres fuentes.
 *
 * La vista anterior se conserva como «Todas las fechas» (`?ver=todas`): solo
 * la base, las últimas registradas primero. Es a la que lleva el Resumen
 * («Sin confirmar», «Falta por cobrar»), porque esas cifras son de todas las
 * fechas.
 *
 * ---------------------------------------------------------------------------
 * LOS FILTROS, Y CÓMO SE COMBINAN SIN CONFUNDIR
 * ---------------------------------------------------------------------------
 * · **Origen**: Sitio web, Panel o Calendario del hotel.
 * · **Estado** (pendiente, confirmada…): solo lo tienen las reservas de la
 *   base. Con un estado elegido, los eventos de Google no salen —y se dice
 *   cuántos quedaron fuera—, porque no se puede saber si un evento está
 *   «confirmado».
 * · Elegir «Calendario del hotel» quita el estado y pasa a la vista del mes;
 *   elegir un estado con «Calendario del hotel» puesto vuelve a todos los
 *   orígenes. Así los enlaces nunca llevan a una combinación vacía por
 *   definición.
 *
 * ---------------------------------------------------------------------------
 * SIN CONTAR DOS VECES
 * ---------------------------------------------------------------------------
 * La misma lectura que el Resumen y el calendario: lo que escribió el propio
 * sitio en Google ya llega descartado, el mismo evento en dos calendarios ya
 * llega unido, y un evento con la misma cabaña y las mismas fechas que una
 * reserva de la base cuenta como la de la base (`estadiasDelCalendario`).
 *
 * Puro: sin red y sin reloj. Fechas `AAAA-MM-DD`, rangos `[entrada, salida)`.
 */

import {
  clavesDeLaBase,
  estadiasDelCalendario,
  fuenteDeReserva,
  type Estadia,
  type FuenteEstadia,
} from "./estadisticas";
import { ESTADOS_RESERVA, type OpcionAlojamiento, type ReservaAdmin } from "./tipos";
import type {
  DiaDeCalmaExterno,
  OcupacionExterna,
} from "../reserva/calendario-externo";
import type { EstadoReserva } from "../tipos/basedatos";

export type VistaListado = "mes" | "todas";
export type OrigenListado = "todos" | FuenteEstadia;
export type EstadoListado = "todos" | EstadoReserva;

export type FiltrosListado = {
  vista: VistaListado;
  origen: OrigenListado;
  estado: EstadoListado;
};

export const ORIGENES_LISTADO: readonly OrigenListado[] = [
  "todos",
  "sitio",
  "panel",
  "calendario",
];

export const ETIQUETA_ORIGEN_LISTADO: Record<OrigenListado, string> = {
  todos: "Todos",
  sitio: "Sitio web",
  panel: "Panel",
  calendario: "Calendario del hotel",
};

export const ESTADOS_LISTADO: readonly EstadoListado[] = ["todos", ...ESTADOS_RESERVA];

/** Deja los filtros en una combinación con sentido (ver la cabecera). */
function normalizar(filtros: FiltrosListado): FiltrosListado {
  if (filtros.origen === "calendario") {
    return { vista: "mes", origen: "calendario", estado: "todos" };
  }
  return filtros;
}

/** Los filtros de la dirección; lo que no se entiende, al valor por defecto. */
export function leerFiltrosListado(params: {
  ver?: string;
  origen?: string;
  estado?: string;
}): FiltrosListado {
  const origen = ORIGENES_LISTADO.includes(params.origen as OrigenListado)
    ? (params.origen as OrigenListado)
    : "todos";
  const estado = ESTADOS_LISTADO.includes(params.estado as EstadoListado)
    ? (params.estado as EstadoListado)
    : "todos";
  return normalizar({
    vista: params.ver === "todas" ? "todas" : "mes",
    origen,
    estado,
  });
}

/**
 * Los filtros tras tocar un botón. El cambio que se pide manda: si choca con
 * otro filtro, el otro cede.
 */
export function cambiarFiltro(
  actual: FiltrosListado,
  cambio: Partial<FiltrosListado>,
): FiltrosListado {
  const siguiente = { ...actual, ...cambio };
  if (cambio.origen === "calendario") {
    return { vista: "mes", origen: "calendario", estado: "todos" };
  }
  if (siguiente.origen === "calendario") {
    /* Se eligió un estado o «Todas las fechas» con «Calendario del hotel»
       puesto: el origen vuelve a todos. */
    const pideEstado = cambio.estado !== undefined && cambio.estado !== "todos";
    const pideTodas = cambio.vista === "todas";
    if (pideEstado || pideTodas) siguiente.origen = "todos";
  }
  return normalizar(siguiente);
}

/** Los filtros como parámetros de la dirección (sin los que van por defecto). */
export function parametrosDeFiltros(filtros: FiltrosListado): URLSearchParams {
  const parametros = new URLSearchParams();
  if (filtros.vista === "todas") parametros.set("ver", "todas");
  if (filtros.origen !== "todos") parametros.set("origen", filtros.origen);
  if (filtros.estado !== "todos") parametros.set("estado", filtros.estado);
  return parametros;
}

/** Una fila del listado: una reserva de la base o un evento de Google. */
export type FilaListado =
  | {
      tipo: "reserva";
      clave: string;
      fuente: Exclude<FuenteEstadia, "calendario">;
      reserva: ReservaAdmin;
    }
  | {
      tipo: "calendario";
      clave: string;
      fuente: "calendario";
      /** Fechas, cabaña o «Día de Calma», nombre según el título. */
      estadia: Estadia;
    };

export type ListadoDeReservas = {
  filas: FilaListado[];
  /**
   * Cuántas filas saldrían al tocar cada origen (con el estado que lleve ese
   * enlace). `null` en «Calendario del hotel» con «Todas las fechas»: ahí
   * Google no se lee.
   */
  cuantos: Record<OrigenListado, number | null>;
  /** Eventos de Google del periodo que el filtro de estado deja fuera. */
  ocultosPorEstado: number;
};

function tocaElRango(
  entrada: string,
  salida: string,
  rango: { desde: string; hasta: string },
): boolean {
  return entrada < rango.hasta && rango.desde < salida;
}

function cabanaDeReserva(reserva: ReservaAdmin): string {
  return reserva.tipo === "dia"
    ? "Día de Calma"
    : (reserva.alojamiento_nombre ?? "Sin cabaña");
}

function pasaFiltros(fila: FilaListado, filtros: FiltrosListado): boolean {
  if (filtros.origen !== "todos" && fila.fuente !== filtros.origen) return false;
  if (filtros.estado !== "todos") {
    return fila.tipo === "reserva" && fila.reserva.estado === filtros.estado;
  }
  return true;
}

/**
 * Arma el listado.
 *
 * · Con `rango` (la vista del mes): las reservas de la base que tienen alguna
 *   noche —o su Día de Calma— en el mes, en cualquier estado, y los eventos de
 *   Google del mes sin los que repiten una reserva de la base. Por fecha de
 *   llegada.
 * · Sin `rango` («Todas las fechas»): solo las reservas que llegan, en el
 *   orden en que llegan (las últimas registradas primero). Google no entra.
 */
export function armarListado({
  reservas,
  franjas = [],
  diasDeCalma = [],
  alojamientos,
  rango,
  filtros,
  ahora,
}: {
  reservas: ReservaAdmin[];
  franjas?: OcupacionExterna[];
  diasDeCalma?: DiaDeCalmaExterno[];
  alojamientos: OpcionAlojamiento[];
  /** El mes del calendario, `hasta` exclusivo; `null` = todas las fechas. */
  rango: { desde: string; hasta: string } | null;
  filtros: FiltrosListado;
  ahora: Date;
}): ListadoDeReservas {
  const deLaBase: FilaListado[] = reservas
    .filter((reserva) => !rango || tocaElRango(reserva.entrada, reserva.salida, rango))
    .map((reserva) => ({
      tipo: "reserva",
      clave: `reserva:${reserva.id}`,
      fuente: fuenteDeReserva(reserva),
      reserva,
    }));

  const delCalendario: FilaListado[] = rango
    ? estadiasDelCalendario({
        franjas,
        diasDeCalma,
        alojamientos,
        deLaBase: clavesDeLaBase(reservas, ahora),
      })
        .filter((estadia) => tocaElRango(estadia.entrada, estadia.salida, rango))
        .map((estadia) => ({
          tipo: "calendario",
          clave: estadia.clave,
          fuente: "calendario",
          estadia,
        }))
    : [];

  const todas = [...deLaBase, ...delCalendario];
  if (rango) {
    const orden = (fila: FilaListado) =>
      fila.tipo === "reserva"
        ? {
            entrada: fila.reserva.entrada,
            cabana: cabanaDeReserva(fila.reserva),
            nombre: fila.reserva.huesped_nombre,
          }
        : {
            entrada: fila.estadia.entrada,
            cabana: fila.estadia.cabana,
            nombre: fila.estadia.nombre,
          };
    todas.sort((a, b) => {
      const x = orden(a);
      const y = orden(b);
      return (
        x.entrada.localeCompare(y.entrada) ||
        x.cabana.localeCompare(y.cabana, "es") ||
        x.nombre.localeCompare(y.nombre, "es")
      );
    });
  }

  const cuantos = Object.fromEntries(
    ORIGENES_LISTADO.map((origen) => {
      if (origen === "calendario" && !rango) return [origen, null];
      const conEse = cambiarFiltro(filtros, { origen });
      return [origen, todas.filter((fila) => pasaFiltros(fila, conEse)).length];
    }),
  ) as Record<OrigenListado, number | null>;

  return {
    filas: todas.filter((fila) => pasaFiltros(fila, filtros)),
    cuantos,
    ocultosPorEstado:
      filtros.estado !== "todos" && filtros.origen === "todos"
        ? delCalendario.length
        : 0,
  };
}

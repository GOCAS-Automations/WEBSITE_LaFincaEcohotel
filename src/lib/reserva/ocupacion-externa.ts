import "server-only";

import {
  calendarioConfigurado,
  configuracionDeCalendarios,
  correoDeLaCuentaDeServicio,
  credencialConfigurada,
  listarCalendarios,
  listarEventos,
} from "@/lib/google/calendario";
import {
  franjasQueChocan,
  ocupacionDesdeVariosCalendarios,
  sumarDias,
  type LoteDeCalendario,
  type OcupacionExterna,
} from "./calendario-externo";
import type { ConfiguracionCalendarios } from "./calendarios-config";

/**
 * La capa «Google Calendar» de la disponibilidad, con caché.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ HAY CACHÉ, Y POR QUÉ SON CINCO MINUTOS
 * ---------------------------------------------------------------------------
 * El calendario del hotel se consulta en sitios muy transitados: cada vez que
 * el panel pinta un mes, cada vez que alguien guarda una reserva, cada vez que
 * el sitio público comprueba unas fechas. Sin caché, una tarde movida son
 * cientos de llamadas a Google por el mismo mes, con su cuota y su latencia.
 *
 * Cinco minutos es el equilibrio que pidió el proyecto: suficientemente corto
 * para que un cambio hecho a mano en Google aparezca «enseguida», y
 * suficientemente largo para que una pantalla que se recarga no dispare una
 * llamada por visita. Cuando hace falta ver el cambio YA, el panel tiene el
 * botón «Actualizar ahora», que llama a {@link invalidarCacheCalendario}.
 *
 * ---------------------------------------------------------------------------
 * LA CACHÉ VA POR MESES COMPLETOS
 * ---------------------------------------------------------------------------
 * Si la clave fuera el rango exacto que se pide, no acertaría casi nunca: cada
 * reserva pregunta por unas fechas distintas. Por eso el rango pedido se
 * redondea hacia fuera a meses enteros y se guarda ESE. Así el mes que pinta
 * el panel y la comprobación de una estadía del día 12 al 15 comparten la
 * misma consulta.
 *
 * La caché vive en memoria del proceso. En Vercel eso significa «por instancia
 * de la función», que es exactamente lo que se quiere: no hay nada que
 * invalidar entre despliegues y nunca sirve datos de otro hotel.
 *
 * ---------------------------------------------------------------------------
 * VARIOS CALENDARIOS, Y QUÉ PASA SI UNO FALLA
 * ---------------------------------------------------------------------------
 * `GOOGLE_CALENDAR_ID` es una lista (ver `calendarios-config.ts`): el general
 * del hotel y, cuando existan, los cinco subcalendarios por cabaña. Se consultan
 * **todos en paralelo** y la ocupación se une.
 *
 * Si uno falla y otro responde, se usa **lo que sí llegó** y el fallo se cuenta
 * como aviso. Es la misma decisión que ya tomaba el caso de un solo calendario:
 * un error de lectura no bloquea nada (devolvía ocupación vacía, y
 * `choquesDelCalendario` no añadía ningún choque), porque la fuente de verdad es
 * Postgres y el calendario de Google solo puede añadir ocupación, nunca quitarla.
 * Un fallo parcial se comporta igual: lo que no se pudo leer simplemente no
 * bloquea, y el panel lo dice en lugar de callárselo.
 */

const VIDA_CACHE_MS = 5 * 60 * 1000;

export type EstadoConexion = "conectado" | "sin_configurar" | "error";

export type LecturaCalendario = {
  estado: EstadoConexion;
  /** Frase lista para enseñar en el panel. */
  mensaje: string;
  /** Franjas ocupadas según Google. Vacío si no hay conexión. */
  ocupacion: OcupacionExterna[];
  /** Cuántos eventos vinieron (antes de descartar los nuestros y los cancelados). */
  eventos: number;
  /** Momento de la consulta que hay en caché, en ISO; `null` si no hubo. */
  consultado: string | null;
  /** Cierto si la respuesta salió de la caché y no de Google. */
  deCache: boolean;
  /**
   * Cosas que contarle a quien administra: mapeos que no se entendieron,
   * identificadores repetidos, calendarios que no se pudieron leer. Vacío =
   * todo en orden.
   */
  avisos: string[];
  /** Cierto si algún calendario de la lista no se pudo leer. */
  lecturaIncompleta: boolean;
};

type Entrada = {
  caducidad: number;
  valor: Omit<LecturaCalendario, "deCache">;
};

const cache = new Map<string, Entrada>();
/** Consultas en vuelo, para que diez pantallas a la vez no pidan diez veces. */
const enVuelo = new Map<string, Promise<Omit<LecturaCalendario, "deCache">>>();

/**
 * Tira la caché entera. La usa el botón «Actualizar ahora» del panel.
 *
 * También olvida el diagnóstico: quien acaba de compartir un calendario con la
 * cuenta de servicio pulsa ese botón para verlo aparecer en la lista.
 */
export function invalidarCacheCalendario(): void {
  cache.clear();
  enVuelo.clear();
  diagnosticoEnCache = null;
}

/** Redondea `[desde, hasta)` hacia fuera hasta meses completos. */
function ventanaDe(desde: string, hasta: string): { desde: string; hasta: string } {
  const inicio = `${desde.slice(0, 7)}-01`;
  const [anio, mes] = hasta.split("-").map(Number);
  /* `hasta` es exclusivo: si cae en el día 1, su mes no hace falta. */
  const finMes = hasta.slice(8, 10) === "01" ? mes : mes + 1;
  const fin = new Date(Date.UTC(anio, finMes - 1, 1)).toISOString().slice(0, 10);
  return { desde: inicio, hasta: fin > inicio ? fin : sumarDias(inicio, 31) };
}

function sinConfigurar(
  avisos: string[] = [],
): Omit<LecturaCalendario, "deCache"> {
  const correo = correoDeLaCuentaDeServicio();
  const mensaje = !credencialConfigurada()
    ? "No hay credencial del calendario de Google (GOOGLE_CALENDAR_CREDENCIALES)."
    : `Falta el identificador del calendario del hotel (GOOGLE_CALENDAR_ID). El hotel tiene que compartir su calendario «la finca» con ${
        correo ?? "la cuenta de servicio"
      } y darle permiso de «Hacer cambios en eventos».`;
  return {
    estado: "sin_configurar",
    mensaje,
    ocupacion: [],
    eventos: 0,
    consultado: null,
    avisos,
    lecturaIncompleta: false,
  };
}

/** La frase del indicador del panel cuando sí hay conexión. */
function mensajeConectado(
  leidos: number,
  total: number,
  franjas: number,
): string {
  const cabecera =
    total === 1
      ? "Conectado con el calendario del hotel"
      : leidos === total
        ? `Conectado con los ${total} calendarios del hotel`
        : `Conectado con ${leidos} de los ${total} calendarios del hotel`;
  const cola =
    franjas === 0
      ? ". No hay eventos en este periodo."
      : `: ${franjas} ${
          franjas === 1 ? "evento ocupa fechas" : "eventos ocupan fechas"
        }.`;
  return cabecera + cola;
}

async function consultar(
  desde: string,
  hasta: string,
): Promise<Omit<LecturaCalendario, "deCache">> {
  const config = configuracionDeCalendarios();
  if (config.calendarios.length === 0 || !credencialConfigurada()) {
    return sinConfigurar(config.avisos);
  }

  /* Todos a la vez: son peticiones independientes y seis en serie serían seis
     viajes de red encadenados delante de cada pantalla del panel. */
  const respuestas = await Promise.all(
    config.calendarios.map(async (calendario) => ({
      calendario,
      respuesta: await listarEventos(calendario.id, desde, hasta),
    })),
  );

  const lotes: LoteDeCalendario[] = [];
  const fallos: string[] = [];
  let eventos = 0;

  for (const { calendario, respuesta } of respuestas) {
    if (respuesta.ok) {
      lotes.push({ cabana: calendario.cabana, eventos: respuesta.datos });
      eventos += respuesta.datos.length;
      continue;
    }
    /* Un fallo de Google NO puede tumbar la pantalla: se deja constancia en el
       servidor y se cuenta como aviso. Quien reserva sigue viendo lo que dice la
       base, que es la fuente que sí controlamos. */
    console.error(
      `[calendario] no se pudo leer el calendario ${calendario.id}:`,
      respuesta.mensaje,
    );
    fallos.push(`No se pudo leer el calendario «${calendario.id}»: ${respuesta.mensaje}`);
  }

  const avisos = [...config.avisos, ...fallos];

  /* Ninguno respondió: es el caso «error» de siempre, con ocupación vacía. */
  if (lotes.length === 0) {
    return {
      estado: "error",
      mensaje: fallos[0] ?? "No se pudo leer el calendario del hotel.",
      ocupacion: [],
      eventos: 0,
      consultado: new Date().toISOString(),
      avisos,
      lecturaIncompleta: true,
    };
  }

  const ocupacion = ocupacionDesdeVariosCalendarios(lotes);
  return {
    estado: "conectado",
    mensaje: mensajeConectado(lotes.length, config.calendarios.length, ocupacion.length),
    ocupacion,
    eventos,
    consultado: new Date().toISOString(),
    avisos,
    lecturaIncompleta: fallos.length > 0,
  };
}

/**
 * Ocupación del calendario del hotel entre dos fechas (`hasta` exclusivo).
 * Nunca lanza: si algo falla, devuelve estado `error` y ocupación vacía.
 */
export async function ocupacionDelCalendario(
  desde: string,
  hasta: string,
): Promise<LecturaCalendario> {
  const ventana = ventanaDe(desde, hasta);
  const clave = `${ventana.desde}|${ventana.hasta}`;

  const guardada = cache.get(clave);
  if (guardada && guardada.caducidad > Date.now()) {
    return { ...guardada.valor, deCache: true };
  }

  const yaPedida = enVuelo.get(clave);
  if (yaPedida) return { ...(await yaPedida), deCache: true };

  const peticion = consultar(ventana.desde, ventana.hasta)
    .then((valor) => {
      /* Un error no se cachea los cinco minutos completos: si Google tuvo un
         hipo, reintentar al minuto siguiente es razonable. Una lectura a la que
         le faltó un calendario cuenta igual: no conviene quedarse cinco minutos
         con media verdad. */
      const vida =
        valor.estado === "error" || valor.lecturaIncompleta ? 60_000 : VIDA_CACHE_MS;
      cache.set(clave, { caducidad: Date.now() + vida, valor });
      return valor;
    })
    .finally(() => {
      enVuelo.delete(clave);
    });

  enVuelo.set(clave, peticion);
  return { ...(await peticion), deCache: false };
}

/**
 * Franjas del calendario del hotel que chocan con una estadía en una cabaña.
 * `nombreCabana` es el de la base («Cabaña 03»).
 */
export async function choquesDelCalendario(
  nombreCabana: string,
  entrada: string,
  salida: string,
): Promise<OcupacionExterna[]> {
  const lectura = await ocupacionDelCalendario(entrada, salida);
  if (lectura.estado !== "conectado") return [];
  return franjasQueChocan(lectura.ocupacion, nombreCabana, entrada, salida);
}

/**
 * Estado de la conexión para el indicador del panel, sin traerse la ocupación.
 * Consulta el mes en curso, que es lo que el panel está mirando de todos modos.
 */
export async function estadoDelCalendario(
  desde: string,
  hasta: string,
): Promise<{
  estado: EstadoConexion;
  mensaje: string;
  consultado: string | null;
  configurado: boolean;
  avisos: string[];
}> {
  const lectura = await ocupacionDelCalendario(desde, hasta);
  return {
    estado: lectura.estado,
    mensaje: lectura.mensaje,
    consultado: lectura.consultado,
    configurado: calendarioConfigurado(),
    avisos: lectura.avisos,
  };
}

/* ===========================================================================
 * Diagnóstico para el panel
 * ======================================================================== */

/** Un calendario que la cuenta de servicio ve de verdad en Google. */
export type CalendarioVisible = {
  id: string;
  nombre: string;
  /** `owner`, `writer`, `reader`… tal como lo llama Google. */
  acceso: string;
  /** Cierto si además está en `GOOGLE_CALENDAR_ID`. */
  configurado: boolean;
  /** Cabaña a la que está atado, si lo está. */
  cabana: number | null;
  /** Cierto si es el calendario donde se apuntan las reservas del panel. */
  deEscritura: boolean;
};

export type DiagnosticoCalendario = {
  credencial: boolean;
  /** El correo al que hay que invitar el calendario. */
  correoCuenta: string | null;
  configurado: boolean;
  /** Los calendarios de la variable, en su orden, con lo que se sabe de ellos. */
  configurados: {
    id: string;
    cabana: number | null;
    /** Cierto si la cuenta de servicio lo ve de verdad. */
    visible: boolean;
    deEscritura: boolean;
  }[];
  escribirEn: string | null;
  escrituraForzada: boolean;
  escrituraFueraDeLista: boolean;
  avisos: string[];
  /** Lo que la cuenta ve en Google; `null` si no se pudo preguntar. */
  visibles: CalendarioVisible[] | null;
  /** Por qué no se pudo preguntar, si es el caso. */
  errorVisibles: string | null;
};

type EntradaDiagnostico = { caducidad: number; valor: DiagnosticoCalendario };
let diagnosticoEnCache: EntradaDiagnostico | null = null;

function mismoId(a: string | null | undefined, b: string | null | undefined): boolean {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function armarDiagnostico(
  config: ConfiguracionCalendarios,
  visibles: { id: string; nombre: string; acceso: string }[] | null,
  errorVisibles: string | null,
): DiagnosticoCalendario {
  const porId = new Map(
    config.calendarios.map((calendario) => [calendario.id.toLowerCase(), calendario]),
  );

  return {
    credencial: credencialConfigurada(),
    correoCuenta: correoDeLaCuentaDeServicio(),
    configurado: calendarioConfigurado(),
    configurados: config.calendarios.map((calendario) => ({
      id: calendario.id,
      cabana: calendario.cabana,
      visible: visibles
        ? visibles.some((visto) => mismoId(visto.id, calendario.id))
        : false,
      deEscritura: mismoId(calendario.id, config.escribirEn),
    })),
    escribirEn: config.escribirEn,
    escrituraForzada: config.escrituraForzada,
    escrituraFueraDeLista: config.escrituraFueraDeLista,
    avisos: config.avisos,
    visibles:
      visibles?.map((visto) => {
        const configurado = porId.get(visto.id.toLowerCase());
        return {
          ...visto,
          configurado: Boolean(configurado),
          cabana: configurado?.cabana ?? null,
          deEscritura: mismoId(visto.id, config.escribirEn),
        };
      }) ?? null,
    errorVisibles,
  };
}

/**
 * Todo lo que hace falta para entender la integración desde el panel: qué dice
 * la configuración y qué calendarios ve de verdad la cuenta de servicio.
 *
 * Lo segundo es lo que nos ahorra pedirle el identificador al hotel: en cuanto
 * compartan el calendario, aparece aquí con su id completo y solo hay que
 * copiarlo a la variable.
 *
 * Se guarda cinco minutos, igual que la ocupación, porque es una llamada más a
 * Google por cada vez que se pinta la pantalla de reservas. El botón «Actualizar
 * ahora» del panel también tira esta caché. Nunca lanza.
 */
export async function diagnosticoDelCalendario(): Promise<DiagnosticoCalendario> {
  if (diagnosticoEnCache && diagnosticoEnCache.caducidad > Date.now()) {
    return diagnosticoEnCache.valor;
  }

  const config = configuracionDeCalendarios();

  let visibles: { id: string; nombre: string; acceso: string }[] | null = null;
  let errorVisibles: string | null = null;

  if (credencialConfigurada()) {
    const respuesta = await listarCalendarios();
    if (respuesta.ok) {
      visibles = respuesta.datos;
    } else {
      errorVisibles = respuesta.mensaje;
      console.error("[calendario] no se pudo listar los calendarios:", respuesta.mensaje);
    }
  }

  const valor = armarDiagnostico(config, visibles, errorVisibles);
  diagnosticoEnCache = {
    caducidad: Date.now() + (errorVisibles ? 60_000 : VIDA_CACHE_MS),
    valor,
  };
  return valor;
}

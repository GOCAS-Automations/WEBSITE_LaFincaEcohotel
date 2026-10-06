import "server-only";

import {
  accesoPermiteEscribir,
  calendarioConfigurado,
  comprobarCalendario,
  configuracionDeCalendarios,
  correoDeLaCuentaDeServicio,
  credencialConfigurada,
  leerCalendario,
  listarCalendarios,
} from "@/lib/google/calendario";
import {
  franjasQueChocan,
  lecturaDeVariosCalendarios,
  personasDeDiaDeCalmaPorFecha,
  sumarDias,
  type DiaDeCalmaExterno,
  type LoteDeCalendario,
  type OcupacionExterna,
} from "./calendario-externo";
import {
  armarDiagnostico,
  avisoDeEscrituraSinPermiso,
  calendariosAComprobar,
  type CalendarioSuscrito,
  type ComprobacionDeCalendario,
  type DiagnosticoCalendario,
} from "./diagnostico-calendarios";

export type {
  CalendarioDiagnosticado,
  CalendarioSuscrito,
  DiagnosticoCalendario,
} from "./diagnostico-calendarios";

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
  /**
   * Días de Calma apuntados en un calendario general («Cristian Arcila plan
   * día»): no ocupan cabaña y gastan cupo del Día de Calma (regla 2b de
   * `calendario-externo.ts`). Vacío si no hay conexión.
   */
  diasDeCalma: DiaDeCalmaExterno[];
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
  /**
   * Cierto si Google dijo que la cuenta del sitio **no puede escribir** en el
   * calendario donde el panel apunta las reservas. Es grave y va destacado: con
   * esto en cierto, cada reserva creada desde el panel se queda sin apuntar.
   */
  escrituraSinPermiso: boolean;
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
    diasDeCalma: [],
    eventos: 0,
    consultado: null,
    avisos,
    lecturaIncompleta: false,
    escrituraSinPermiso: false,
  };
}

/** La frase del indicador del panel cuando sí hay conexión. */
function mensajeConectado(
  leidos: number,
  total: number,
  franjas: number,
  diasDeCalma = 0,
): string {
  const cabecera =
    total === 1
      ? "Conectado con el calendario del hotel"
      : leidos === total
        ? `Conectado con los ${total} calendarios del hotel`
        : `Conectado con ${leidos} de los ${total} calendarios del hotel`;
  /* Un «plan día» no ocupa cabaña: se cuenta aparte para que nadie lo busque
     entre las cabañas ocupadas. */
  const deDia =
    diasDeCalma === 0
      ? ""
      : diasDeCalma === 1
        ? "1 evento es de Día de Calma (no ocupa cabaña, cuenta en el cupo del día)"
        : `${diasDeCalma} eventos son de Día de Calma (no ocupan cabaña, cuentan en el cupo del día)`;
  const cola =
    franjas === 0 && diasDeCalma === 0
      ? ". No hay eventos en este periodo."
      : franjas === 0
        ? `: ${deDia}.`
        : `: ${franjas} ${
            franjas === 1 ? "evento ocupa fechas" : "eventos ocupan fechas"
          }${deDia ? `; ${deDia}` : ""}.`;
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
      respuesta: await leerCalendario(calendario.id, desde, hasta),
    })),
  );

  const lotes: LoteDeCalendario[] = [];
  const fallos: string[] = [];
  /** Avisos que no son un fallo de lectura, pero que hay que contar igual. */
  const graves: string[] = [];
  let escrituraSinPermiso = false;
  let eventos = 0;

  for (const { calendario, respuesta } of respuestas) {
    if (respuesta.ok) {
      lotes.push({ cabana: calendario.cabana, eventos: respuesta.datos.eventos });
      eventos += respuesta.datos.eventos.length;
      /* El permiso viene GRATIS en la misma respuesta, así que se aprovecha: si
         el calendario donde el panel apunta las reservas resulta estar
         compartido en solo lectura, nadie debería enterarse por echar en falta
         una reserva. */
      if (
        calendario.id.toLowerCase() === config.escribirEn?.toLowerCase() &&
        respuesta.datos.acceso !== null &&
        !accesoPermiteEscribir(respuesta.datos.acceso)
      ) {
        escrituraSinPermiso = true;
        graves.push(avisoDeEscrituraSinPermiso(respuesta.datos.nombre ?? calendario.id, respuesta.datos.acceso));
      }
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

  const avisos = [...config.avisos, ...graves, ...fallos];

  /* Ninguno respondió: es el caso «error» de siempre, con ocupación vacía. */
  if (lotes.length === 0) {
    return {
      estado: "error",
      mensaje: fallos[0] ?? "No se pudo leer el calendario del hotel.",
      ocupacion: [],
      diasDeCalma: [],
      eventos: 0,
      consultado: new Date().toISOString(),
      avisos,
      lecturaIncompleta: true,
      escrituraSinPermiso,
    };
  }

  const { ocupacion, diasDeCalma } = lecturaDeVariosCalendarios(lotes);
  return {
    estado: "conectado",
    mensaje: mensajeConectado(
      lotes.length,
      config.calendarios.length,
      ocupacion.length,
      diasDeCalma.length,
    ),
    ocupacion,
    diasDeCalma,
    eventos,
    consultado: new Date().toISOString(),
    avisos,
    lecturaIncompleta: fallos.length > 0,
    escrituraSinPermiso,
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
 * Personas que el calendario del hotel ya gasta del cupo del Día de Calma en
 * `[desde, hasta)`, fecha por fecha (2 por cada «plan día», regla 2b de
 * `calendario-externo.ts`). Sale de la misma caché de cinco minutos y nunca
 * lanza: sin conexión con Google devuelve `{}` y el cupo cuenta solo la base.
 */
export async function personasDiaDeCalmaDelCalendario(
  desde: string,
  hasta: string,
): Promise<Record<string, number>> {
  const lectura = await ocupacionDelCalendario(desde, hasta);
  if (lectura.estado !== "conectado") return {};
  return personasDeDiaDeCalmaPorFecha(lectura.diasDeCalma, desde, hasta);
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
  escrituraSinPermiso: boolean;
}> {
  const lectura = await ocupacionDelCalendario(desde, hasta);
  return {
    estado: lectura.estado,
    mensaje: lectura.mensaje,
    consultado: lectura.consultado,
    configurado: calendarioConfigurado(),
    avisos: lectura.avisos,
    escrituraSinPermiso: lectura.escrituraSinPermiso,
  };
}

/* ===========================================================================
 * Diagnóstico para el panel
 * ======================================================================== */

type EntradaDiagnostico = { caducidad: number; valor: DiagnosticoCalendario };
let diagnosticoEnCache: EntradaDiagnostico | null = null;

/**
 * Todo lo que hace falta para entender la integración desde el panel.
 *
 * ---------------------------------------------------------------------------
 * LA FUENTE DE VERDAD ES LA LECTURA, NO LA LISTA DE SUSCRIPCIONES
 * ---------------------------------------------------------------------------
 * Cada calendario configurado se comprueba **preguntándole a Google por sus
 * eventos** ({@link comprobarCalendario}), que es exactamente lo que hace el
 * sitio para calcular disponibilidad. Si eso responde, hay acceso: punto. De esa
 * misma respuesta salen el nombre del calendario y el permiso real.
 *
 * `calendarList.list` se sigue llamando, pero solo para **descubrir**
 * identificadores que nadie nos ha dado. No decide nada: ver la cabecera de
 * `diagnostico-calendarios.ts`, que cuenta el falso negativo que costó esta
 * distinción.
 *
 * Las comprobaciones van en paralelo —son siete peticiones independientes— y se
 * guardan cinco minutos, igual que la ocupación, porque esto se pinta en la
 * pantalla de reservas. El botón «Actualizar ahora» del panel tira la caché.
 * Nunca lanza.
 */
export async function diagnosticoDelCalendario(): Promise<DiagnosticoCalendario> {
  if (diagnosticoEnCache && diagnosticoEnCache.caducidad > Date.now()) {
    return diagnosticoEnCache.valor;
  }

  const config = configuracionDeCalendarios();
  const hayCredencial = credencialConfigurada();

  const comprobaciones: Record<string, ComprobacionDeCalendario> = {};
  let suscritos: CalendarioSuscrito[] | null = null;
  let errorSuscritos: string | null = null;

  if (hayCredencial) {
    const aComprobar = calendariosAComprobar(config);
    const [respuestas, lista] = await Promise.all([
      Promise.all(
        aComprobar.map(async (id) => ({ id, respuesta: await comprobarCalendario(id) })),
      ),
      listarCalendarios(),
    ]);

    for (const { id, respuesta } of respuestas) {
      if (respuesta.ok) {
        comprobaciones[id.toLowerCase()] = {
          ok: true,
          nombre: respuesta.datos.nombre,
          acceso: respuesta.datos.acceso,
          puedeEscribir: respuesta.datos.puedeEscribir,
        };
        continue;
      }
      comprobaciones[id.toLowerCase()] = { ok: false, mensaje: respuesta.mensaje };
      console.error(
        `[calendario] no se pudo comprobar el calendario ${id}:`,
        respuesta.mensaje,
      );
    }

    if (lista.ok) {
      suscritos = lista.datos;
    } else {
      errorSuscritos = lista.mensaje;
      console.error("[calendario] no se pudo listar las suscripciones:", lista.mensaje);
    }
  }

  const valor = armarDiagnostico({
    credencial: hayCredencial,
    correoCuenta: correoDeLaCuentaDeServicio(),
    config,
    comprobaciones,
    suscritos,
    errorSuscritos,
  });

  /* Un diagnóstico con algo roto se guarda solo un minuto: quien está arreglando
     un permiso en Google quiere ver el efecto pronto, no dentro de cinco. */
  const algoRoto =
    errorSuscritos !== null ||
    valor.escrituraSinPermiso ||
    valor.configurados.some((calendario) => calendario.error !== null);
  diagnosticoEnCache = {
    caducidad: Date.now() + (algoRoto ? 60_000 : VIDA_CACHE_MS),
    valor,
  };
  return valor;
}

import "server-only";

import {
  calendarioConfigurado,
  correoDeLaCuentaDeServicio,
  credencialConfigurada,
  idCalendarioHotel,
  listarEventos,
} from "@/lib/google/calendario";
import {
  franjasQueChocan,
  ocupacionDesdeEventos,
  sumarDias,
  type OcupacionExterna,
} from "./calendario-externo";

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
};

type Entrada = {
  caducidad: number;
  valor: Omit<LecturaCalendario, "deCache">;
};

const cache = new Map<string, Entrada>();
/** Consultas en vuelo, para que diez pantallas a la vez no pidan diez veces. */
const enVuelo = new Map<string, Promise<Omit<LecturaCalendario, "deCache">>>();

/** Tira la caché entera. La usa el botón «Actualizar ahora» del panel. */
export function invalidarCacheCalendario(): void {
  cache.clear();
  enVuelo.clear();
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

function sinConfigurar(): Omit<LecturaCalendario, "deCache"> {
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
  };
}

async function consultar(
  desde: string,
  hasta: string,
): Promise<Omit<LecturaCalendario, "deCache">> {
  const calendarioId = idCalendarioHotel();
  if (!calendarioId || !credencialConfigurada()) return sinConfigurar();

  const respuesta = await listarEventos(calendarioId, desde, hasta);
  if (!respuesta.ok) {
    if (respuesta.motivo === "no_configurado") return sinConfigurar();
    /* Un fallo de Google NO puede tumbar la pantalla: se deja constancia en el
       servidor y se devuelve una capa vacía con el aviso. Quien reserva sigue
       viendo lo que dice la base, que es la fuente que sí controlamos. */
    console.error("[calendario] no se pudo leer el calendario del hotel:", respuesta.mensaje);
    return {
      estado: "error",
      mensaje: respuesta.mensaje,
      ocupacion: [],
      eventos: 0,
      consultado: new Date().toISOString(),
    };
  }

  const ocupacion = ocupacionDesdeEventos(respuesta.datos);
  return {
    estado: "conectado",
    mensaje:
      ocupacion.length === 0
        ? "Conectado con el calendario del hotel. No hay eventos en este periodo."
        : `Conectado con el calendario del hotel: ${ocupacion.length} ${
            ocupacion.length === 1 ? "evento ocupa fechas" : "eventos ocupan fechas"
          }.`,
    ocupacion,
    eventos: respuesta.datos.length,
    consultado: new Date().toISOString(),
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
         hipo, reintentar al minuto siguiente es razonable. */
      const vida = valor.estado === "error" ? 60_000 : VIDA_CACHE_MS;
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
}> {
  const lectura = await ocupacionDelCalendario(desde, hasta);
  return {
    estado: lectura.estado,
    mensaje: lectura.mensaje,
    consultado: lectura.consultado,
    configurado: calendarioConfigurado(),
  };
}

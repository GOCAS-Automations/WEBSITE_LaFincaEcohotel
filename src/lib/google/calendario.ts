// Este módulo solo puede importarse desde el servidor: lleva una clave privada.
import "server-only";

import { createSign } from "node:crypto";

import {
  ORIGEN_PROPIO,
  ZONA_HOTEL,
  type EventoCalendario,
} from "../reserva/calendario-externo";
import {
  parsearCalendarios,
  type CalendarioDelHotel,
  type ConfiguracionCalendarios,
} from "../reserva/calendarios-config";

/**
 * Google Calendar con una cuenta de servicio, a pelo.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO ENTRA `googleapis`
 * ---------------------------------------------------------------------------
 * El paquete oficial pesa decenas de megas y arrastra todo el catálogo de APIs
 * de Google para usar tres llamadas. Lo único que hace de verdad es lo de
 * abajo: firmar un JWT con RS256, cambiarlo por un token en
 * `oauth2.googleapis.com/token` y hacer `fetch` contra la API v3. Son setenta
 * líneas y se leen enteras; la librería sería una caja negra más grande que el
 * problema, y en Vercel cada mega cuenta en el arranque en frío.
 *
 * ---------------------------------------------------------------------------
 * LAS VARIABLES
 * ---------------------------------------------------------------------------
 * · `GOOGLE_CALENDAR_CREDENCIALES` → el JSON de la cuenta de servicio
 *   `lafinca-calendario@…` **en base64, en una sola línea**. En base64 porque
 *   la clave privada lleva saltos de línea y un `.env` de una línea no los
 *   aguanta. También se acepta el JSON en claro por comodidad en local.
 * · `GOOGLE_CALENDAR_ID` → la **lista** de calendarios que se leen, con el
 *   mapeo opcional a cabaña (`general@…, cab1@…=1, cab2@…=2`). El formato
 *   entero está documentado en `../reserva/calendarios-config.ts`. Un solo
 *   identificador sigue valiendo.
 * · `GOOGLE_CALENDAR_ESCRIBIR_EN` → opcional. Dónde se apuntan las reservas del
 *   panel; por defecto, el primero de la lista.
 *
 * ---------------------------------------------------------------------------
 * `calendarList` NO DICE A QUÉ TIENE ACCESO LA CUENTA
 * ---------------------------------------------------------------------------
 * Esto costó una tarde de buscar un problema que no existía, así que queda
 * escrito: `calendarList.list` devuelve los calendarios a los que la cuenta
 * está **suscrita** (los suyos y los que alguien añadió a su lista), no
 * aquellos sobre los que tiene **permiso**. Cuando una persona comparte un
 * calendario con una cuenta de servicio, el permiso (la ACL) se concede pero
 * nadie «acepta» la invitación —una cuenta de servicio no tiene bandeja de
 * entrada ni interfaz—, así que su `calendarList` se queda vacía.
 *
 * El acceso de verdad se comprueba leyendo eventos: `events.list` funciona con
 * el permiso aunque `calendarList` esté vacía, y su respuesta trae además el
 * nombre del calendario (`summary`) y el permiso real (`accessRole`). Por eso
 * {@link comprobarCalendario} es la fuente de verdad del diagnóstico y
 * {@link listarCalendarios} se usa solo para **descubrir** identificadores que
 * nadie nos ha dado.
 *
 * ---------------------------------------------------------------------------
 * NADA DE ESTO PUEDE TIRAR EL SITIO
 * ---------------------------------------------------------------------------
 * Ninguna función lanza. Todas devuelven un {@link ResultadoCalendario}: o
 * `ok`, o un motivo (`no_configurado` / `error`) con un mensaje en español ya
 * escrito para enseñárselo a quien usa el panel. Si Google se cae, si la
 * credencial caduca o si nadie ha compartido el calendario, el hotel sigue
 * pudiendo reservar: simplemente no hay capa de Google.
 */

const URL_TOKEN = "https://oauth2.googleapis.com/token";
const BASE_API = "https://www.googleapis.com/calendar/v3";
const ALCANCE = "https://www.googleapis.com/auth/calendar";

/** Cuánto esperamos a Google antes de rendirnos y seguir sin él. */
const TIEMPO_MAXIMO_MS = 8000;

export type MotivoFallo = "no_configurado" | "error";

export type ResultadoCalendario<T> =
  | { ok: true; datos: T }
  | { ok: false; motivo: MotivoFallo; mensaje: string };

function fallo<T>(motivo: MotivoFallo, mensaje: string): ResultadoCalendario<T> {
  return { ok: false, motivo, mensaje };
}

/* ===========================================================================
 * Credencial y token
 * ======================================================================== */

type Credencial = { correo: string; clavePrivada: string };

/**
 * Lee la credencial de la variable de entorno. Devuelve `null` si no está
 * puesta, y también si está pero no se entiende: un JSON roto no debe tumbar
 * el arranque, solo apagar la integración.
 */
function leerCredencial(): Credencial | null {
  const crudo = process.env.GOOGLE_CALENDAR_CREDENCIALES?.trim();
  if (!crudo) return null;

  try {
    const texto = crudo.startsWith("{")
      ? crudo
      : Buffer.from(crudo, "base64").toString("utf8");
    const json = JSON.parse(texto) as Record<string, unknown>;
    const correo = typeof json.client_email === "string" ? json.client_email : "";
    const clavePrivada =
      typeof json.private_key === "string" ? json.private_key : "";
    if (!correo || !clavePrivada) return null;
    return { correo, clavePrivada };
  } catch {
    return null;
  }
}

/** ¿Hay credencial utilizable? (No comprueba que Google la acepte.) */
export function credencialConfigurada(): boolean {
  return leerCredencial() !== null;
}

/** Correo de la cuenta de servicio, para poder decirle al hotel con quién compartir. */
export function correoDeLaCuentaDeServicio(): string | null {
  return leerCredencial()?.correo ?? null;
}

/**
 * Los calendarios configurados y a dónde se escribe, ya entendidos.
 *
 * Se lee de las variables en cada llamada —no se guarda— porque es barato y
 * porque así un cambio en Vercel surte efecto sin tocar nada más. Nunca lanza:
 * lo que no se entiende sale como aviso en `avisos`.
 */
export function configuracionDeCalendarios(): ConfiguracionCalendarios {
  return parsearCalendarios(
    process.env.GOOGLE_CALENDAR_ID,
    process.env.GOOGLE_CALENDAR_ESCRIBIR_EN,
  );
}

/** Los calendarios que el sitio LEE. Vacío si todavía no hay ninguno. */
export function calendariosDelHotel(): CalendarioDelHotel[] {
  return configuracionDeCalendarios().calendarios;
}

/**
 * El único calendario donde el sitio ESCRIBE, o `null` si no hay ninguno.
 *
 * Es uno solo a propósito: si las reservas del panel se apuntaran en el
 * calendario general y además en el de su cabaña, el equipo vería cada reserva
 * dos veces y habría que mantener dos eventos por reserva. Por defecto es el
 * primero de `GOOGLE_CALENDAR_ID`; `GOOGLE_CALENDAR_ESCRIBIR_EN` lo cambia.
 */
export function calendarioDeEscritura(): string | null {
  return configuracionDeCalendarios().escribirEn;
}

/** ¿Está la integración completa (credencial + al menos un calendario)? */
export function calendarioConfigurado(): boolean {
  return credencialConfigurada() && calendariosDelHotel().length > 0;
}

function base64url(dato: Buffer | string): string {
  return (typeof dato === "string" ? Buffer.from(dato, "utf8") : dato)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Token en memoria.
 *
 * Google los da por una hora. Pedir uno nuevo en cada llamada serían dos
 * viajes de red por consulta y una firma RSA de más. Se guarda con un minuto
 * de margen y se comparte la petición en vuelo, para que diez consultas
 * simultáneas no pidan diez tokens.
 */
let tokenEnCache: { valor: string; expira: number } | null = null;
let tokenEnVuelo: Promise<string> | null = null;

const MARGEN_TOKEN_MS = 60_000;

async function pedirToken(credencial: Credencial): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const cuerpo = base64url(
    JSON.stringify({
      iss: credencial.correo,
      scope: ALCANCE,
      aud: URL_TOKEN,
      iat: ahora,
      exp: ahora + 3600,
    }),
  );

  const firmador = createSign("RSA-SHA256");
  firmador.update(`${cabecera}.${cuerpo}`);
  /* La clave puede venir con los saltos de línea escapados si alguien pegó el
     JSON a mano en el `.env`; se normalizan antes de firmar. */
  const clave = credencial.clavePrivada.includes("\\n")
    ? credencial.clavePrivada.replace(/\\n/g, "\n")
    : credencial.clavePrivada;
  const firma = base64url(firmador.sign(clave));

  const respuesta = await fetch(URL_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${cabecera}.${cuerpo}.${firma}`,
    }),
    signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    cache: "no-store",
  });

  const texto = await respuesta.text();
  if (!respuesta.ok) {
    throw new Error(
      `Google no aceptó la credencial de la cuenta de servicio (${respuesta.status}). ${resumirError(texto)}`,
    );
  }

  const datos = JSON.parse(texto) as { access_token?: string; expires_in?: number };
  if (!datos.access_token) {
    throw new Error("Google devolvió una respuesta sin token de acceso.");
  }

  tokenEnCache = {
    valor: datos.access_token,
    expira: Date.now() + (datos.expires_in ?? 3600) * 1000 - MARGEN_TOKEN_MS,
  };
  return datos.access_token;
}

async function tokenDeAcceso(credencial: Credencial): Promise<string> {
  if (tokenEnCache && tokenEnCache.expira > Date.now()) return tokenEnCache.valor;
  if (tokenEnVuelo) return tokenEnVuelo;

  tokenEnVuelo = pedirToken(credencial).finally(() => {
    tokenEnVuelo = null;
  });
  return tokenEnVuelo;
}

/** Olvida el token guardado. La usa el script de pruebas entre credenciales. */
export function olvidarToken(): void {
  tokenEnCache = null;
  tokenEnVuelo = null;
}

/* ===========================================================================
 * Llamadas a la API
 * ======================================================================== */

/** Saca el mensaje de un error de Google sin volcar el JSON entero. */
function resumirError(texto: string): string {
  try {
    const json = JSON.parse(texto) as {
      error?: { message?: string } | string;
      error_description?: string;
    };
    if (typeof json.error === "string") {
      return json.error_description ?? json.error;
    }
    return json.error?.message ?? "";
  } catch {
    return texto.slice(0, 200);
  }
}

/** Traduce el código HTTP de Google a algo que se pueda enseñar en el panel. */
function mensajeDeEstado(estado: number, detalle: string): string {
  const cola = detalle ? ` (${detalle})` : "";
  if (estado === 401) {
    return `Google rechazó la credencial del calendario. Puede que la clave de la cuenta de servicio se haya revocado o que la hora del servidor esté desajustada.${cola}`;
  }
  if (estado === 403) {
    return `La cuenta de servicio no tiene permiso sobre ese calendario. En Google Calendar hay que compartirlo con ella y darle «Hacer cambios en eventos».${cola}`;
  }
  if (estado === 404) {
    return `No existe ese calendario o ese evento. Revisa el identificador de GOOGLE_CALENDAR_ID.${cola}`;
  }
  if (estado === 410) {
    return `Google dice que ese evento ya no existe.${cola}`;
  }
  if (estado === 429) {
    return `Google está limitando las consultas al calendario. Vuelve a intentarlo en un minuto.${cola}`;
  }
  if (estado >= 500) {
    return `Google Calendar no está respondiendo bien ahora mismo.${cola}`;
  }
  return `Google Calendar respondió con un error ${estado}.${cola}`;
}

type OpcionesLlamada = {
  metodo?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  busqueda?: Record<string, string>;
  cuerpo?: unknown;
  /** Códigos HTTP que NO son un fallo para quien llama (p. ej. borrar un 404). */
  tolerar?: number[];
};

async function llamar<T>(
  ruta: string,
  opciones: OpcionesLlamada = {},
): Promise<ResultadoCalendario<T>> {
  const credencial = leerCredencial();
  if (!credencial) {
    return fallo(
      "no_configurado",
      "Falta la credencial del calendario (GOOGLE_CALENDAR_CREDENCIALES).",
    );
  }

  let token: string;
  try {
    token = await tokenDeAcceso(credencial);
  } catch (error) {
    return fallo(
      "error",
      error instanceof Error ? error.message : "No se pudo autenticar con Google.",
    );
  }

  const url = new URL(`${BASE_API}${ruta}`);
  for (const [clave, valor] of Object.entries(opciones.busqueda ?? {})) {
    url.searchParams.set(clave, valor);
  }

  try {
    const respuesta = await fetch(url, {
      method: opciones.metodo ?? "GET",
      headers: {
        authorization: `Bearer ${token}`,
        ...(opciones.cuerpo === undefined
          ? {}
          : { "content-type": "application/json" }),
      },
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      cache: "no-store",
    });

    if (respuesta.status === 204) return { ok: true, datos: null as T };

    const texto = await respuesta.text();
    if (!respuesta.ok) {
      if (opciones.tolerar?.includes(respuesta.status)) {
        return { ok: true, datos: null as T };
      }
      /* Un 401 puede ser un token que caducó antes de tiempo: se tira el que
         hay para que la siguiente llamada pida uno nuevo. */
      if (respuesta.status === 401) tokenEnCache = null;
      return fallo("error", mensajeDeEstado(respuesta.status, resumirError(texto)));
    }

    return { ok: true, datos: (texto ? JSON.parse(texto) : null) as T };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return fallo("error", "Google Calendar tardó demasiado en responder.");
    }
    return fallo(
      "error",
      error instanceof Error
        ? `No se pudo hablar con Google Calendar: ${error.message}`
        : "No se pudo hablar con Google Calendar.",
    );
  }
}

/* ===========================================================================
 * Eventos
 * ======================================================================== */

type EventoApi = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  extendedProperties?: { private?: Record<string, string> };
};

function normalizar(evento: EventoApi): EventoCalendario | null {
  if (!evento.id) return null;
  const privadas = evento.extendedProperties?.private ?? {};
  return {
    id: evento.id,
    estado: evento.status ?? "confirmed",
    titulo: evento.summary ?? "",
    descripcion: evento.description ?? null,
    inicioFecha: evento.start?.date ?? null,
    finFecha: evento.end?.date ?? null,
    inicioHora: evento.start?.dateTime ?? null,
    finHora: evento.end?.dateTime ?? null,
    origen: privadas.origen ?? null,
    reservaId: privadas.reserva_id ?? null,
  };
}

/**
 * Permisos de Google que dejan crear, mover y borrar eventos.
 *
 * Los cuatro valores posibles de `accessRole` son `owner`, `writer`, `reader` y
 * `freeBusyReader`. Solo los dos primeros permiten escribir; con `reader` el
 * sitio puede calcular disponibilidad pero no apuntar nada, y con
 * `freeBusyReader` ni siquiera ve los títulos.
 */
export function accesoPermiteEscribir(acceso: string | null | undefined): boolean {
  return acceso === "owner" || acceso === "writer";
}

/** Lo que Google cuenta de un calendario al devolver sus eventos. */
export type LecturaDeCalendario = {
  eventos: EventoCalendario[];
  /** Nombre que le puso el hotel; `null` si Google no lo devolvió. */
  nombre: string | null;
  /** Permiso real de la cuenta: `owner`, `writer`, `reader`, `freeBusyReader`. */
  acceso: string | null;
};

/**
 * Eventos de un calendario entre dos fechas (`AAAA-MM-DD`, `hasta` exclusivo),
 * más el nombre y el permiso real que Google adjunta en la misma respuesta.
 *
 * `singleEvents=true` es imprescindible: sin él, una serie que se repite llega
 * como UN evento con su regla de repetición y habría que expandirla a mano.
 * Con él, Google devuelve cada aparición ya resuelta, que es justo lo que
 * necesita un calendario de ocupación.
 *
 * Pagina hasta agotar `nextPageToken`, con un tope por si acaso: un calendario
 * con miles de eventos en un mes es un calendario roto, no una razón para
 * dejar la petición corriendo.
 *
 * El `summary` y el `accessRole` vienen GRATIS en esta misma respuesta, así que
 * se devuelven: son lo que permite al panel decir «leo el calendario “Reservas
 * Finca Villarreal” y solo puedo leerlo» sin una llamada de más.
 */
export async function leerCalendario(
  calendarioId: string,
  desde: string,
  hasta: string,
): Promise<ResultadoCalendario<LecturaDeCalendario>> {
  if (!calendarioId) {
    return fallo(
      "no_configurado",
      "Todavía no está configurado el calendario del hotel (GOOGLE_CALENDAR_ID).",
    );
  }

  const eventos: EventoCalendario[] = [];
  let nombre: string | null = null;
  let acceso: string | null = null;
  let pagina: string | undefined;

  for (let vuelta = 0; vuelta < 10; vuelta += 1) {
    const busqueda: Record<string, string> = {
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
      showDeleted: "false",
      timeZone: ZONA_HOTEL,
      /* `timeMin`/`timeMax` quieren RFC 3339. Se envían con el desfase fijo de
         Colombia para que un evento del día `hasta` a las 00:00 quede fuera. */
      timeMin: `${desde}T00:00:00-05:00`,
      timeMax: `${hasta}T00:00:00-05:00`,
    };
    if (pagina) busqueda.pageToken = pagina;

    const respuesta = await llamar<{
      items?: EventoApi[];
      nextPageToken?: string;
      summary?: string;
      accessRole?: string;
    }>(`/calendars/${encodeURIComponent(calendarioId)}/events`, { busqueda });

    if (!respuesta.ok) return respuesta;

    nombre ??= respuesta.datos.summary ?? null;
    acceso ??= respuesta.datos.accessRole ?? null;

    for (const item of respuesta.datos.items ?? []) {
      const normalizado = normalizar(item);
      if (normalizado) eventos.push(normalizado);
    }

    pagina = respuesta.datos.nextPageToken;
    if (!pagina) break;
  }

  return { ok: true, datos: { eventos, nombre, acceso } };
}

/**
 * Solo los eventos, para quien no necesita el nombre ni el permiso.
 * Es la firma de siempre; {@link leerCalendario} es la que trae todo.
 */
export async function listarEventos(
  calendarioId: string,
  desde: string,
  hasta: string,
): Promise<ResultadoCalendario<EventoCalendario[]>> {
  const respuesta = await leerCalendario(calendarioId, desde, hasta);
  return respuesta.ok ? { ok: true, datos: respuesta.datos.eventos } : respuesta;
}

/** Lo que se sabe de un calendario después de preguntárselo a Google. */
export type CalendarioComprobado = {
  id: string;
  /** Nombre que le puso el hotel; `null` si Google no lo devolvió. */
  nombre: string | null;
  /** Permiso real: `owner`, `writer`, `reader`, `freeBusyReader`. */
  acceso: string | null;
  /** Cierto si la cuenta del sitio puede apuntar eventos en él. */
  puedeEscribir: boolean;
};

/**
 * ¿Tiene la cuenta del sitio acceso de verdad a este calendario, y con qué
 * permiso? Es **la** comprobación del diagnóstico.
 *
 * Se pregunta por sus eventos, que es lo que el sitio hace de verdad para
 * calcular disponibilidad: si esto responde, el acceso funciona, y da igual que
 * `calendarList` esté vacía (ver la cabecera del módulo). Se piden `maxResults=1`
 * y solo los campos `summary` y `accessRole`, así que la respuesta no trae ni un
 * evento: es la llamada más barata que prueba el acceso.
 *
 * Un fallo se devuelve con el mensaje en español de {@link mensajeDeEstado}, que
 * ya distingue «no tiene permiso» (403) de «no existe ese identificador» (404).
 */
export async function comprobarCalendario(
  calendarioId: string,
): Promise<ResultadoCalendario<CalendarioComprobado>> {
  if (!calendarioId) {
    return fallo(
      "no_configurado",
      "Todavía no está configurado el calendario del hotel (GOOGLE_CALENDAR_ID).",
    );
  }

  const respuesta = await llamar<{ summary?: string; accessRole?: string }>(
    `/calendars/${encodeURIComponent(calendarioId)}/events`,
    { busqueda: { maxResults: "1", fields: "summary,accessRole" } },
  );
  if (!respuesta.ok) return respuesta;

  const acceso = respuesta.datos?.accessRole ?? null;
  return {
    ok: true,
    datos: {
      id: calendarioId,
      nombre: respuesta.datos?.summary ?? null,
      acceso,
      puedeEscribir: accesoPermiteEscribir(acceso),
    },
  };
}

/** Lo que el sitio necesita decir para apuntar una reserva en el calendario. */
export type EventoNuevo = {
  titulo: string;
  descripcion?: string | null;
  /** Primer día ocupado, `AAAA-MM-DD`. */
  inicio: string;
  /** Día de liberación (exclusivo), igual que en la base. */
  fin: string;
  /** Id de la reserva, para poder reencontrar el evento. */
  reservaId?: string | null;
};

/**
 * Los eventos que crea el sitio son de TODO EL DÍA, a propósito.
 *
 * Una reserva de hotel no es «de las 14:00 a las 11:00»: es un juego de noches.
 * Con `start.date` / `end.date` el rango es exactamente el mismo `[entrada,
 * salida)` que guarda Postgres, se ve como una barra limpia en el calendario
 * del hotel y no hay ninguna hora que interpretar mal.
 */
function cuerpoDeEvento(evento: EventoNuevo): Record<string, unknown> {
  return {
    summary: evento.titulo,
    description: evento.descripcion ?? undefined,
    start: { date: evento.inicio },
    end: { date: evento.fin },
    extendedProperties: {
      private: {
        origen: ORIGEN_PROPIO,
        ...(evento.reservaId ? { reserva_id: evento.reservaId } : {}),
      },
    },
  };
}

export async function crearEvento(
  calendarioId: string,
  evento: EventoNuevo,
): Promise<ResultadoCalendario<{ id: string }>> {
  const respuesta = await llamar<EventoApi>(
    `/calendars/${encodeURIComponent(calendarioId)}/events`,
    { metodo: "POST", cuerpo: cuerpoDeEvento(evento) },
  );
  if (!respuesta.ok) return respuesta;
  if (!respuesta.datos?.id) {
    return fallo("error", "Google creó el evento pero no devolvió su identificador.");
  }
  return { ok: true, datos: { id: respuesta.datos.id } };
}

export async function actualizarEvento(
  calendarioId: string,
  eventoId: string,
  evento: EventoNuevo,
): Promise<ResultadoCalendario<{ id: string }>> {
  const respuesta = await llamar<EventoApi>(
    `/calendars/${encodeURIComponent(calendarioId)}/events/${encodeURIComponent(eventoId)}`,
    { metodo: "PATCH", cuerpo: cuerpoDeEvento(evento) },
  );
  if (!respuesta.ok) return respuesta;
  return { ok: true, datos: { id: respuesta.datos?.id ?? eventoId } };
}

/**
 * Borra un evento. Un 404/410 se trata como éxito: el evento ya no está, que
 * es exactamente lo que se pedía.
 */
export async function eliminarEvento(
  calendarioId: string,
  eventoId: string,
): Promise<ResultadoCalendario<null>> {
  return llamar<null>(
    `/calendars/${encodeURIComponent(calendarioId)}/events/${encodeURIComponent(eventoId)}`,
    { metodo: "DELETE", tolerar: [404, 410] },
  );
}

/* ===========================================================================
 * Calendarios (solo para el script de pruebas)
 * ======================================================================== */

/**
 * Crea un calendario **propiedad de la cuenta de servicio**.
 *
 * Solo lo usa `scripts/probar-calendario.mjs`: permite verificar la
 * integración entera sin tocar el calendario real del hotel y sin esperar a
 * que nos lo compartan. El script lo borra al terminar.
 */
export async function crearCalendario(
  nombre: string,
): Promise<ResultadoCalendario<{ id: string }>> {
  const respuesta = await llamar<{ id?: string }>("/calendars", {
    metodo: "POST",
    cuerpo: { summary: nombre, timeZone: ZONA_HOTEL },
  });
  if (!respuesta.ok) return respuesta;
  if (!respuesta.datos?.id) {
    return fallo("error", "Google creó el calendario pero no devolvió su identificador.");
  }
  return { ok: true, datos: { id: respuesta.datos.id } };
}

/**
 * Borra un calendario propio de la cuenta de servicio.
 *
 * Son DOS llamadas, y las dos hacen falta: `calendars.delete` borra el
 * calendario, pero su entrada en la lista de la cuenta puede tardar en
 * desaparecer. Quitarla también (`calendarList.delete`) hace que una
 * comprobación posterior no encuentre restos y crea que la limpieza falló.
 */
export async function eliminarCalendario(
  calendarioId: string,
): Promise<ResultadoCalendario<null>> {
  /* Google contesta 400 —no 404— cuando el calendario ya no existe, así que
     volver a borrarlo tampoco es un error. */
  const borrado = await llamar<null>(
    `/calendars/${encodeURIComponent(calendarioId)}`,
    { metodo: "DELETE", tolerar: [400, 404, 410] },
  );
  if (!borrado.ok) return borrado;

  await llamar<null>(`/users/me/calendarList/${encodeURIComponent(calendarioId)}`, {
    metodo: "DELETE",
    tolerar: [404, 410],
  });
  return borrado;
}

/**
 * Los calendarios a los que la cuenta de servicio está **suscrita**.
 *
 * ⚠️ NO es la lista de a lo que tiene acceso: un calendario que el hotel
 * comparte con la cuenta de servicio casi nunca aparece aquí (ver la cabecera
 * del módulo). Sirve para **descubrir** identificadores —los calendarios que la
 * cuenta creó ella misma, o los que alguien añadió a su lista— y nunca para
 * concluir que un calendario no es accesible. Para eso está
 * {@link comprobarCalendario}.
 */
export async function listarCalendarios(): Promise<
  ResultadoCalendario<{ id: string; nombre: string; acceso: string }[]>
> {
  const respuesta = await llamar<{
    items?: { id?: string; summary?: string; accessRole?: string }[];
  }>("/users/me/calendarList", { busqueda: { maxResults: "50" } });
  if (!respuesta.ok) return respuesta;
  return {
    ok: true,
    datos: (respuesta.datos.items ?? [])
      .filter((item): item is { id: string; summary?: string; accessRole?: string } =>
        Boolean(item.id),
      )
      .map((item) => ({
        id: item.id,
        nombre: item.summary ?? "(sin nombre)",
        acceso: item.accessRole ?? "desconocido",
      })),
  };
}

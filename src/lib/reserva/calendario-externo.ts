/**
 * Del Google Calendar del hotel a la ocupación de las cabañas.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTE MÓDULO ES PURO
 * ---------------------------------------------------------------------------
 * Aquí no se habla con Google ni con Supabase: entran eventos ya normalizados
 * y salen rangos de noches ocupadas. Así se puede probar con Vitest —las
 * reglas de abajo son adivinanzas sobre cómo escribe el hotel sus eventos, y
 * van a cambiar— sin pedirle nada a la red.
 *
 * La capa que sí habla con Google es `src/lib/google/calendario.ts`, y la que
 * cachea y mezcla con la base es `src/lib/reserva/ocupacion-externa.ts`.
 *
 * ⚠️ NO importar `server-only` ni alias `@/` aquí: `scripts/probar-calendario.mjs`
 * carga este archivo tal cual para verificar las reglas de punta a punta.
 *
 * ---------------------------------------------------------------------------
 * LAS REGLAS (pensadas para ajustarse, no para durar para siempre)
 * ---------------------------------------------------------------------------
 * Todavía no sabemos con qué palabras apunta el hotel sus reservas en el
 * calendario «la finca». Hasta que lo sepamos, las reglas son estas y están
 * escritas para que cambiar una sea cambiar una línea:
 *
 *   1. Si el título contiene «cabaña», «cabana» o «cab» seguido de un número
 *      del 1 al 5 (con o sin cero delante), el evento ocupa ESA cabaña.
 *   2. Si no se reconoce ninguna cabaña, el evento bloquea LAS CINCO. Es la
 *      decisión conservadora a propósito: preferimos decirle «no hay sitio» a
 *      quien sí cabía antes que vender dos veces la misma noche.
 *   3. Los eventos cancelados se ignoran.
 *   4. Los eventos que creó el propio sitio se ignoran: ya están en la tabla
 *      `reservas` y contarlos dos veces haría que una reserva chocara consigo
 *      misma. Se reconocen por `extendedProperties.private.origen`.
 *
 * ---------------------------------------------------------------------------
 * FECHAS
 * ---------------------------------------------------------------------------
 * Todo sale como `AAAA-MM-DD` y como rango medio-abierto `[inicio, fin)`, que
 * es el mismo idioma que hablan `daterange` en Postgres y el resto del motor.
 * Colombia es UTC-5 todo el año (no tiene horario de verano), así que un
 * evento con hora se lleva a día de Bogotá restando cinco horas, igual que
 * hace `hoyISO()` en el panel.
 */

/** Marca con la que el sitio firma los eventos que crea él mismo. */
export const ORIGEN_PROPIO = "lafinca-web";

/** Zona del hotel. Colombia no cambia de hora: el desfase es fijo. */
export const ZONA_HOTEL = "America/Bogota";
const DESFASE_BOGOTA_MS = 5 * 60 * 60 * 1000;

/** Cuántas cabañas tiene la finca. Fuera de este rango no se reconoce número. */
export const CABANAS_DE_LA_FINCA = 5;

/**
 * Un evento de Google Calendar ya normalizado.
 *
 * Es la forma que devuelve `src/lib/google/calendario.ts`; se declara aquí
 * porque este módulo es el que la consume y el que se prueba.
 */
export type EventoCalendario = {
  id: string;
  /** "confirmed" | "tentative" | "cancelled" (Google puede añadir más). */
  estado: string;
  titulo: string;
  descripcion: string | null;
  /** Evento de todo el día: `AAAA-MM-DD`, con `fin` ya exclusivo. */
  inicioFecha: string | null;
  finFecha: string | null;
  /** Evento con hora: marca de tiempo RFC 3339 tal como la da Google. */
  inicioHora: string | null;
  finHora: string | null;
  /** `extendedProperties.private.origen`, si lo trae. */
  origen: string | null;
  /** `extendedProperties.private.reserva_id`, si lo trae. */
  reservaId: string | null;
};

/** Una franja ocupada según el calendario del hotel. */
export type OcupacionExterna = {
  eventoId: string;
  titulo: string;
  /** Primera noche ocupada, `AAAA-MM-DD`. */
  inicio: string;
  /** Día de liberación (exclusivo): la noche anterior es la última ocupada. */
  fin: string;
  /** Número de cabaña (1–5) reconocido en el título; `null` = bloquea todas. */
  cabana: number | null;
  /** Por qué bloquea, para poder explicarlo en el panel en español. */
  motivo: "cabana_reconocida" | "sin_cabana";
};

/* ---------------------------------------------------------------------------
 * Aritmética de fechas (texto, nunca `Date` con husos)
 * ------------------------------------------------------------------------- */

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function esFechaISO(valor: unknown): boolean {
  return typeof valor === "string" && FECHA_ISO.test(valor);
}

export function sumarDias(iso: string, dias: number): string {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

/**
 * Día de Bogotá de una marca de tiempo RFC 3339.
 *
 * `new Date(...)` entiende el desplazamiento que trae la cadena
 * (`2026-09-12T14:00:00-05:00`, o `...Z`), así que lo único que hay que hacer
 * es correr el instante cinco horas y leer la parte de fecha en UTC.
 */
export function diaEnBogota(marca: string): string | null {
  const instante = new Date(marca);
  if (Number.isNaN(instante.getTime())) return null;
  return new Date(instante.getTime() - DESFASE_BOGOTA_MS)
    .toISOString()
    .slice(0, 10);
}

/* ---------------------------------------------------------------------------
 * ¿De qué cabaña habla este título?
 * ------------------------------------------------------------------------- */

/** Quita tildes y pasa a minúsculas para poder comparar sin sorpresas. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Número de cabaña que nombra un texto, o `null` si no nombra ninguno.
 *
 * Reconoce «Cabaña 3», «cabaña 03», «CABANA #4», «Cab. 2», «cab5» y también
 * «La Finca — Cabaña 01 · Ana». Lo que NO reconoce —a propósito— es un número
 * suelto: «Reserva 3 personas» no habla de la cabaña 3.
 *
 * Sirve para dos cosas: leer el título de un evento de Google y leer el nombre
 * de una cabaña de la base («Cabaña 03»), que es como se emparejan las dos.
 */
export function numeroDeCabana(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const limpio = normalizar(texto);
  const coincidencia = /\bcab(?:ana|anas|\.)?\s*(?:n[o°.]?\s*|#\s*)?0*(\d{1,2})\b/.exec(
    limpio,
  );
  if (!coincidencia) return null;
  const numero = Number(coincidencia[1]);
  if (!Number.isInteger(numero)) return null;
  if (numero < 1 || numero > CABANAS_DE_LA_FINCA) return null;
  return numero;
}

/* ---------------------------------------------------------------------------
 * De un evento a un rango de noches
 * ------------------------------------------------------------------------- */

/**
 * Rango `[inicio, fin)` de noches que ocupa un evento, o `null` si no se
 * entiende.
 *
 * · **Todo el día**: Google ya da `end.date` exclusivo, así que el rango pasa
 *   tal cual. Un evento de un solo día llega como `[12, 13)`.
 * · **Con hora**: se toman los días de Bogotá de la entrada y de la salida. Un
 *   14:00 del 12 a un 11:00 del 15 son las noches 12, 13 y 14 → `[12, 15)`, que
 *   es justo la convención del hotel (la salida no se cobra). Si entrada y
 *   salida caen el mismo día —una visita de 10:00 a 17:00— el rango se queda
 *   vacío, y un rango vacío no bloquea nada: se estira a un día, porque ese día
 *   la cabaña sí está ocupada.
 */
export function rangoDelEvento(
  evento: EventoCalendario,
): { inicio: string; fin: string } | null {
  if (esFechaISO(evento.inicioFecha)) {
    const inicio = evento.inicioFecha as string;
    const fin = esFechaISO(evento.finFecha)
      ? (evento.finFecha as string)
      : sumarDias(inicio, 1);
    return { inicio, fin: fin > inicio ? fin : sumarDias(inicio, 1) };
  }

  if (!evento.inicioHora) return null;
  const inicio = diaEnBogota(evento.inicioHora);
  if (!inicio) return null;

  const finCrudo = evento.finHora ? diaEnBogota(evento.finHora) : null;
  const fin = finCrudo && finCrudo > inicio ? finCrudo : sumarDias(inicio, 1);
  return { inicio, fin };
}

/** ¿Este evento lo creó nuestro propio sitio? */
export function esEventoPropio(evento: EventoCalendario): boolean {
  return evento.origen === ORIGEN_PROPIO;
}

/**
 * Convierte los eventos del calendario del hotel en franjas de ocupación.
 *
 * Descarta lo cancelado, lo propio y lo que no tiene fechas legibles. El
 * resultado sale ordenado por fecha, que es como se lee en el panel.
 */
export function ocupacionDesdeEventos(
  eventos: EventoCalendario[],
): OcupacionExterna[] {
  const franjas: OcupacionExterna[] = [];

  for (const evento of eventos) {
    if (evento.estado === "cancelled") continue;
    if (esEventoPropio(evento)) continue;

    const rango = rangoDelEvento(evento);
    if (!rango) continue;

    const cabana = numeroDeCabana(evento.titulo);
    franjas.push({
      eventoId: evento.id,
      titulo: evento.titulo.trim() || "Evento sin título",
      inicio: rango.inicio,
      fin: rango.fin,
      cabana,
      motivo: cabana === null ? "sin_cabana" : "cabana_reconocida",
    });
  }

  franjas.sort((a, b) =>
    a.inicio === b.inicio ? a.titulo.localeCompare(b.titulo) : a.inicio < b.inicio ? -1 : 1,
  );
  return franjas;
}

/* ---------------------------------------------------------------------------
 * Emparejar con las cabañas de la base
 * ------------------------------------------------------------------------- */

/** Lo mínimo que hace falta saber de una cabaña para emparejarla. */
export type CabanaConNombre = { id: string; nombre: string };

/**
 * ¿A qué cabañas de la base afecta una franja?
 *
 * Si la franja nombra un número, a la cabaña cuyo nombre lleve ese mismo
 * número («Cabaña 03» → 3). Si no lo nombra, a todas: regla 2 de arriba.
 */
export function cabanasAfectadas(
  franja: OcupacionExterna,
  cabanas: CabanaConNombre[],
): CabanaConNombre[] {
  if (franja.cabana === null) return cabanas;
  const emparejadas = cabanas.filter(
    (cabana) => numeroDeCabana(cabana.nombre) === franja.cabana,
  );
  /* Si el hotel escribió «Cabaña 4» y en la base no hay ninguna cabaña con ese
     número, se vuelve a lo conservador: bloquea todas en vez de no bloquear
     nada. Un número que no reconocemos no es permiso para vender. */
  return emparejadas.length > 0 ? emparejadas : cabanas;
}

/** ¿Se cruzan dos rangos medio-abiertos? Comparar ISO es comparar fechas. */
export function seCruzan(
  aInicio: string,
  aFin: string,
  bInicio: string,
  bFin: string,
): boolean {
  return aInicio < bFin && bInicio < aFin;
}

/**
 * Franjas que chocan con `[entrada, salida)` en una cabaña concreta.
 * `nombreCabana` es el de la base («Cabaña 03»).
 */
export function franjasQueChocan(
  franjas: OcupacionExterna[],
  nombreCabana: string,
  entrada: string,
  salida: string,
): OcupacionExterna[] {
  const numero = numeroDeCabana(nombreCabana);
  return franjas.filter((franja) => {
    if (!seCruzan(entrada, salida, franja.inicio, franja.fin)) return false;
    if (franja.cabana === null) return true;
    return numero !== null && franja.cabana === numero;
  });
}

/** Todos los días sueltos que cubre una franja, para pintar el calendario. */
export function diasDeLaFranja(franja: OcupacionExterna): string[] {
  const dias: string[] = [];
  for (let dia = franja.inicio; dia < franja.fin; dia = sumarDias(dia, 1)) {
    dias.push(dia);
    if (dias.length > 400) break; // red de seguridad ante un rango absurdo
  }
  return dias;
}

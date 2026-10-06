/**
 * EL CALENDARIO DEL HOTEL NO RESPONDIÓ, Y POR ESO NO SE ESCRIBE NADA.
 *
 * Hasta el 2026-10-05 un fallo al leer Google se trataba como «no hay
 * ocupación»: la disponibilidad seguía solo con la base. Eso valía cuando las
 * reservas vivían en Postgres, pero hoy la base tiene cero reservas y **todas**
 * las reales están en el calendario de Google del hotel. Una clave revocada, un
 * 5xx o un `timeout` abrían el calendario entero a la venta.
 *
 * La regla nueva: **antes de escribir** una reserva (el sitio o el panel), si
 * Google está configurado y no se pudo leer entero, se falla cerrado con este
 * error. Si Google no está configurado (sin `GOOGLE_CALENDAR_ID`), no cambia
 * nada: la base sigue siendo la única fuente.
 *
 * Vive aparte, sin `server-only` ni dependencias de red, para que las pruebas
 * que sustituyen la capa de Google por un doble puedan seguir usando la clase
 * de verdad (`instanceof`).
 */
export class CalendarioSinRespuesta extends Error {
  /** El motivo técnico, para el registro del servidor. Nunca va al huésped. */
  readonly detalle: string;

  constructor(detalle: string) {
    super("No se pudo leer el calendario de Google del hotel.");
    this.name = "CalendarioSinRespuesta";
    this.detalle = detalle;
  }
}

export function esCalendarioSinRespuesta(error: unknown): error is CalendarioSinRespuesta {
  return error instanceof CalendarioSinRespuesta;
}

/** Lo que lee el HUÉSPED (sitio público). */
export const MENSAJE_SIN_CALENDARIO_HUESPED =
  "No pudimos comprobar la disponibilidad en este momento. Intenta en unos minutos o escríbenos por WhatsApp.";

/** Lo que lee el EQUIPO en el panel. */
export const MENSAJE_SIN_CALENDARIO_PANEL =
  "El calendario de Google del hotel no respondió, así que no se puede comprobar si esas noches están libres. No se guardó nada: vuelve a intentarlo en unos minutos (o pulsa «Actualizar ahora» en Reservas).";

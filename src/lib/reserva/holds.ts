/**
 * Reglas del HOLD: cuánto tiempo aparta una reserva sin pagar las fechas.
 *
 * ---------------------------------------------------------------------------
 * QUÉ ES UN HOLD Y POR QUÉ EXISTE
 * ---------------------------------------------------------------------------
 * Con la pasarela de pagos, una reserva nace `pendiente`: nadie ha pagado
 * todavía, pero las noches tienen que quedar apartadas mientras el huésped
 * está en la pantalla de la pasarela, o dos personas acabarán pagando la misma
 * cabaña la misma noche. Apartarlas para siempre tampoco sirve: quien abre el
 * checkout y cierra el navegador dejaría la cabaña bloqueada hasta que alguien
 * lo note a mano.
 *
 * De ahí el hold: `expira_at = ahora + 30 min`. Un `pendiente` con `expira_at`
 * pasado **NO ocupa calendario**, y el barrido lo cancela.
 *
 * `expira_at = null` significa «no vence». Es lo que llevan las confirmadas,
 * las completadas y **todas las que el equipo apunta a mano desde el panel**:
 * esas no caducan, porque detrás hay una conversación por WhatsApp o una
 * llamada, no un checkout abandonado.
 *
 * ---------------------------------------------------------------------------
 * ⚠ UNA RESERVA CON UN PAGO COBRADO **NO CADUCA NUNCA** (2026-10-02)
 * ---------------------------------------------------------------------------
 * El vencimiento es una regla sobre un checkout abandonado, no sobre el dinero.
 * El barrido (`liberar_reservas_vencidas`, migración **016**) excluye:
 *
 *   · toda reserva con un pago `APPROVED` — sin plazo ninguno, y
 *   · toda reserva con un pago `PROCESSING`/`PENDING` movido en los últimos
 *     **15 minutos**, que es la carrera del cobro que se aprueba justo cuando el
 *     hold muere (PSE es el que más tarda).
 *
 * Hizo falta porque el 2026-10-01 pasó de verdad: dos pagos reales en el sandbox
 * de Bold, cero eventos de webhook, y `LF-2026-0001` cancelada sola con el pago
 * hecho. La gracia es corta y no larga por una razón concreta, explicada en la
 * cabecera de la migración: una `pendiente` sin cancelar sigue apartando las
 * fechas para la restricción EXCLUDE, así que alargarla produciría noches que se
 * ofrecen y no se pueden comprar.
 *
 * **Lo que de verdad recupera un pago aprobado es la reconciliación**
 * (`src/lib/pagos/reconciliar.ts`): preguntarle a Bold desde la página de
 * retorno, desde el cron —antes del barrido— y desde el botón del panel.
 *
 * ---------------------------------------------------------------------------
 * LA REGLA QUE NO SE PUEDE OLVIDAR
 * ---------------------------------------------------------------------------
 * `reservas_sin_solapamiento` es una restricción EXCLUDE y su predicado tiene
 * que ser inmutable: **no puede llamar a `now()`**. Para ella un hold vencido
 * sigue siendo una `pendiente` que ocupa sitio.
 *
 *   **Toda creación o reactivación de reserva llama antes a
 *   `liberarReservasVencidas()`** (`./liberar-vencidas.ts`).
 *
 * Los caminos de solo lectura no escriben durante un render: aplican
 * `ocupaCalendario()` en memoria y llegan a la misma respuesta.
 *
 * Módulo PURO, sin Supabase ni fechas del sistema escondidas: todo recibe
 * `ahora` para que se pueda probar. El barrido que escribe en la base vive en
 * `./liberar-vencidas.ts`, que sí es `server-only`.
 */

/**
 * Minutos que se apartan las fechas mientras el huésped paga.
 *
 * Treinta es el plazo típico de un checkout con tarjeta, PSE o Nequi: da de
 * sobra para escribir los datos de la tarjeta y volver, y no tanto como para
 * que una cabaña se quede muerta media tarde por un abandono. Si el hotel pide
 * otro plazo, se cambia **aquí y solo aquí**.
 */
export const MINUTOS_HOLD = 30;

/** Un hold al que le quedan menos de esto se destaca en el panel. */
export const MINUTOS_VENCE_PRONTO = 10;

/**
 * Motivo que se anexa a `notas` al cancelar un hold vencido.
 *
 * Tiene que ser EXACTAMENTE el mismo texto que el `default` del parámetro
 * `motivo` de `liberar_reservas_vencidas` (migración 013): la función no
 * duplica la nota si ya la encuentra en el campo, y esa comprobación es por
 * contenido.
 */
export const MOTIVO_VENCIDA =
  "Reserva vencida: la solicitud caducó sin completar el pago.";

const MS_POR_MINUTO = 60_000;

/* ===========================================================================
 * Cálculo
 * ======================================================================== */

/**
 * Vencimiento de un hold que nace ahora.
 *
 * `minutos` se deja como parámetro —con `MINUTOS_HOLD` por defecto— para el día
 * en que el hotel quiera un plazo distinto para el Día de Calma o para las
 * reservas de temporada alta. Hoy nadie le pasa otro valor.
 */
export function calcularVencimiento(
  ahora: Date = new Date(),
  minutos: number = MINUTOS_HOLD,
): Date {
  return new Date(ahora.getTime() + minutos * MS_POR_MINUTO);
}

/** Lo mismo, ya en el texto ISO que espera la columna `timestamptz`. */
export function vencimientoISO(
  ahora: Date = new Date(),
  minutos: number = MINUTOS_HOLD,
): string {
  return calcularVencimiento(ahora, minutos).toISOString();
}

/** Convierte a `Date` lo que llegue de la base (texto ISO) o del código. */
function aFecha(valor: string | Date | null | undefined): Date | null {
  if (valor === null || valor === undefined) return null;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/* ===========================================================================
 * Consulta
 * ======================================================================== */

/** Forma mínima de una fila de `reservas` para decidir si ocupa calendario. */
export type ReservaConVencimiento = {
  estado: string;
  /** ISO de la columna `expira_at`. `null` o ausente = no vence. */
  expira_at?: string | null;
};

/**
 * ¿Este hold ya venció?
 *
 * El estado entra en la comprobación y no solo la fecha: una `confirmada` que
 * arrastre el `expira_at` de cuando era pendiente sigue ocupando calendario.
 * Solo las `pendiente` vencen.
 */
export function estaVencida(
  reserva: ReservaConVencimiento,
  ahora: Date = new Date(),
): boolean {
  if (reserva.estado !== "pendiente") return false;
  const limite = aFecha(reserva.expira_at);
  if (!limite) return false;
  return limite.getTime() <= ahora.getTime();
}

/**
 * Cuántos minutos le quedan al hold. Negativo si ya venció, `null` si la
 * reserva no vence.
 */
export function minutosRestantes(
  expiraAt: string | Date | null | undefined,
  ahora: Date = new Date(),
): number | null {
  const limite = aFecha(expiraAt);
  if (!limite) return null;
  return Math.round((limite.getTime() - ahora.getTime()) / MS_POR_MINUTO);
}

/**
 * ¿La reserva ocupa fechas en el calendario?
 *
 * **ES LA REGLA DEL MOTOR, Y VIVE AQUÍ Y EN NINGÚN OTRO SITIO.** La usan el
 * endpoint público de disponibilidad, la comprobación de choques del panel, el
 * calendario del mes y el cupo del Día de Calma. Si dos de ellos no dijeran
 * exactamente lo mismo, la diferencia se llamaría **sobreventa**: el sitio
 * ofrecería como libre una noche que el panel da por ocupada, o al contrario.
 *
 * Qué ocupa:
 *   · `pendiente`  — sí, salvo que su hold haya vencido.
 *   · `confirmada` — siempre.
 *   · `completada` — siempre (es una noche que ya se usó; el calendario
 *     histórico no puede ofrecerla como libre).
 *   · `cancelada`  — nunca.
 */
export function ocupaCalendario(
  reserva: ReservaConVencimiento,
  ahora: Date = new Date(),
): boolean {
  if (reserva.estado === "cancelada") return false;
  return !estaVencida(reserva, ahora);
}

/**
 * ¿El hold está a punto de vencer? El panel destaca estos: son las solicitudes
 * que se van a caer en los próximos minutos.
 */
export function vencePronto(
  reserva: ReservaConVencimiento,
  ahora: Date = new Date(),
): boolean {
  if (reserva.estado !== "pendiente") return false;
  const minutos = minutosRestantes(reserva.expira_at, ahora);
  if (minutos === null) return false;
  return minutos > 0 && minutos <= MINUTOS_VENCE_PRONTO;
}

/* ===========================================================================
 * Texto en español
 * ======================================================================== */

/**
 * Cuenta atrás del hold, en español, para el panel: «Vence en 12 min»,
 * «Vence en 1 h 05 min», «Vencida hace 3 min».
 *
 * Se redondea a minutos y no se muestran segundos: la página del panel no se
 * refresca sola, y un contador al segundo estaría mintiendo desde el instante
 * en que se pinta. La granularidad de minutos sigue siendo cierta el rato que
 * dura una mirada.
 *
 * `null` cuando la reserva no vence: quien lo pinte no debe escribir nada.
 */
export function cuentaAtras(
  expiraAt: string | Date | null | undefined,
  ahora: Date = new Date(),
): string | null {
  const minutos = minutosRestantes(expiraAt, ahora);
  if (minutos === null) return null;

  if (minutos <= 0) {
    const pasados = Math.abs(minutos);
    if (pasados < 60) {
      return `Vencida hace ${pasados} ${pasados === 1 ? "minuto" : "minutos"}`;
    }
    const horas = Math.floor(pasados / 60);
    return `Vencida hace ${horas} ${horas === 1 ? "hora" : "horas"}`;
  }

  if (minutos < 60) {
    return `Vence en ${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;
  }

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (resto === 0) return `Vence en ${horas} ${horas === 1 ? "hora" : "horas"}`;
  return `Vence en ${horas} h ${String(resto).padStart(2, "0")} min`;
}

/**
 * El plazo del hold escrito para el huésped: «30 minutos».
 *
 * Va en el correo de «solicitud recibida», así que tiene que leerse como una
 * frase y no como una constante.
 */
export function plazoEnPalabras(minutos: number = MINUTOS_HOLD): string {
  if (minutos < 60) return `${minutos} minutos`;
  const horas = minutos / 60;
  if (Number.isInteger(horas)) {
    return `${horas} ${horas === 1 ? "hora" : "horas"}`;
  }
  return `${Math.floor(horas)} h ${minutos % 60} min`;
}

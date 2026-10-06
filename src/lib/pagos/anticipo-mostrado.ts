/**
 * EL ANTICIPO QUE VIO EL HUÉSPED Y EL QUE COBRA EL SERVIDOR TIENEN QUE SER EL
 * MISMO.
 *
 * El navegador calcula el total para enseñarlo sin esperar; el servidor lo
 * recalcula con la base, que es lo que se cobra (`cotizarEnServidor`). Si
 * difieren —una tarifa que el hotel cambió mientras el huésped elegía, una
 * temporada nueva, un catálogo cacheado— el huésped no puede llegar a la
 * pasarela con un monto que no vio. Antes nadie comparaba los dos.
 *
 * Ahora el botón manda el anticipo que enseñó (`anticipoEsperado`) y:
 *   · el servidor, si no coincide, responde 409 con el monto nuevo SIN crear
 *     nada (`/api/reservar`);
 *   · el navegador enseña el monto nuevo y pide confirmación antes de pagar; y
 *     si aun así el servidor devolviera otro anticipo, tampoco abre la pasarela
 *     sin preguntar.
 *
 * Puro y sin dependencias de servidor: lo usan el Route Handler y el botón.
 */
import { formatearCOP } from "../utils/formato";

/** Lo que manda el navegador: un entero positivo, o nada. */
export function leerAnticipoEsperado(valor: unknown): number | null {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) return null;
  return Math.round(valor);
}

/** ¿Es distinto lo que vio el huésped de lo que se va a cobrar? */
export function anticipoCambio(mostrado: number | null, cobrado: number): boolean {
  return mostrado !== null && Math.round(mostrado) !== Math.round(cobrado);
}

/** La frase que lee el huésped antes de confirmar el monto nuevo. */
export function mensajeAnticipoCambio(antes: number, ahora: number): string {
  return `El anticipo cambió mientras elegías: veías ${formatearCOP(antes)} y ahora es ${formatearCOP(ahora)}, porque recalculamos el precio con las tarifas vigentes. ¿Quieres pagar ${formatearCOP(ahora)}?`;
}

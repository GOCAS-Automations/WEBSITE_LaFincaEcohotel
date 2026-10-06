/**
 * Personas de una reserva del sitio: un ENTERO de 1 a 2, o `null`.
 *
 * Las cinco cabañas son para dos y el Día de Calma se vende para una o dos
 * personas. Antes se hacía `Math.round(Number(…))` y se acotaba: con un texto
 * salía `NaN`, que llegaba a la base como NULL y **saltaba el cupo del Día de
 * Calma** (`NULL + ocupadas > 10` no es «cierto»). Ahora lo que no es 1 o 2
 * se rechaza —`/api/reservar` responde 400— en vez de adivinarse.
 *
 * Vive aparte de `cotizar-en-servidor.ts` para que el Route Handler la use sin
 * arrastrar la lectura de la base (y para poder probarlo con ese módulo
 * sustituido por un doble).
 */
export function personasValidas(valor: unknown): 1 | 2 | null {
  if (typeof valor !== "number" && typeof valor !== "string") return null;
  if (typeof valor === "string" && !/^\s*\d+\s*$/.test(valor)) return null;
  const numero = Number(valor);
  return numero === 1 || numero === 2 ? numero : null;
}

/** El motivo, en español, cuando `personas` no es 1 ni 2. */
export function motivoPersonasInvalidas(tipo: "hospedaje" | "dia"): string {
  return tipo === "dia"
    ? "Elige si el Día de Calma es para una o para dos personas."
    : "Elige si la estadía es para una o para dos personas.";
}

/**
 * Lectura de los números que se escriben a mano en el panel: precios, abonos,
 * capacidades, órdenes.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ NO BASTA CON BORRAR LOS PUNTOS
 * ---------------------------------------------------------------------------
 * Hasta el 2026-10-05 se borraban puntos, comas y espacios y se leía lo que
 * quedara. «552.000» daba 552000, bien; pero «552.000,50» daba **55.200.050**:
 * los centavos se volvían cifras y el precio se multiplicaba por cien sin que
 * nadie lo notara. En pesos colombianos no hay centavos que cobrar, así que la
 * regla es simple y sin ambigüedad:
 *
 *   · Se aceptan cifras solas (`552000`) o con separador de miles en grupos de
 *     tres, siempre el mismo (`552.000`, `552,000`, `552 000`, `1.250.000`).
 *     El signo de pesos delante y los espacios de los extremos no estorban.
 *   · Si termina en un separador con una o dos cifras (`552.000,50`, `552,5`,
 *     `350000.00`) es un número con centavos o decimales: **se rechaza** y se
 *     dice por qué. No se redondea: quien escribió centavos tiene que saber
 *     que no se guardaron.
 *   · Cualquier otra forma (`552.0000`, `1.234,567`, `12a`) no se adivina: se
 *     rechaza como formato no válido.
 *
 * Puro y sin dependencias: lo usa la validación de las Server Actions
 * (`src/lib/admin/validacion.ts`) y el formulario de reserva manual, que pinta
 * el total mientras se escribe.
 */

export type ProblemaEntero = "vacio" | "centavos" | "formato";

export type LecturaEntero =
  | { ok: true; valor: number }
  | { ok: false; problema: ProblemaEntero };

/** Miles en grupos de tres con UN solo separador repetido: `1.250.000`. */
const MILES = /^\d{1,3}([., ])\d{3}(?:\1\d{3})*$/;

/** Termina en separador + una o dos cifras: centavos o decimales. */
const CENTAVOS = /[.,]\d{1,2}$/;

export function leerEnteroEscrito(crudo: string | null | undefined): LecturaEntero {
  let texto = String(crudo ?? "")
    /* Espacios duros que pega el teclado del celular o una hoja de cálculo. */
    .replace(/[  ]/g, " ")
    .trim();
  if (!texto) return { ok: false, problema: "vacio" };

  let negativo = false;
  const quitarSigno = () => {
    if (texto.startsWith("-") || texto.startsWith("−")) {
      negativo = true;
      texto = texto.slice(1).trim();
    }
  };
  quitarSigno();
  if (texto.startsWith("$")) texto = texto.slice(1).trim();
  quitarSigno();
  if (!texto) return { ok: false, problema: "formato" };

  let cifras: string;
  if (/^\d+$/.test(texto)) {
    cifras = texto;
  } else if (CENTAVOS.test(texto)) {
    return { ok: false, problema: "centavos" };
  } else if (MILES.test(texto)) {
    cifras = texto.replace(/[., ]/g, "");
  } else {
    return { ok: false, problema: "formato" };
  }

  const valor = Number(cifras);
  if (!Number.isSafeInteger(valor)) return { ok: false, problema: "formato" };
  return { ok: true, valor: negativo && valor !== 0 ? -valor : valor };
}

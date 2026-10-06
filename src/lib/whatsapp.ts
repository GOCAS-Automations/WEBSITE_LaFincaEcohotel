/**
 * Mensajes prellenados de WhatsApp.
 *
 * WhatsApp es hoy el canal real de reservas de La Finca y va a seguir estando
 * en todo el sitio incluso cuando exista el motor de reservas (se le prometió
 * al cliente explícitamente, §5 del plan). Mientras el motor no exista, este
 * mensaje ES la solicitud de reserva: tiene que llegar con todo lo que el
 * equipo necesita para responder sin una sola pregunta de vuelta.
 *
 * El número por defecto es el de `SITIO.contacto`; los componentes que ya
 * leyeron `getContacto()` deben pasar el número editado desde el panel.
 */
import {
  formatearCOP,
  formatearFecha,
  formatearFechaConDia,
  type FechaISO,
} from "./utils/formato";
import { SITIO } from "./sitio";

/** Deja solo dígitos: `"+57 316 047 6671"` → `"573160476671"`. */
export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/**
 * Construye el enlace `wa.me` con el mensaje ya codificado.
 *
 *     enlaceWhatsapp("Hola!") → "https://wa.me/573160476671?text=Hola!"
 */
export function enlaceWhatsapp(
  mensaje: string,
  numero: string = SITIO.contacto.whatsapp,
): string {
  const destino = soloDigitos(numero) || SITIO.contacto.whatsapp;
  return `https://wa.me/${destino}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * La línea de la autorización de datos que viaja dentro del mensaje.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ VA EN EL MENSAJE Y NO SOLO EN LA PANTALLA
 * ---------------------------------------------------------------------------
 * La **Ley 1581 de 2012** (art. 9) exige autorización previa y expresa del
 * titular, y el **Decreto 1074 de 2015** (art. 2.2.2.25.2.4) obliga a
 * **conservar prueba** de ella. Mientras el cierre de la reserva sea un mensaje
 * de WhatsApp, la casilla que el visitante marca en el sitio no llega a ninguna
 * base de datos: la reserva la escribe después el equipo desde el panel.
 *
 * Si la aceptación no viaja en el mensaje, la prueba se pierde en el paso más
 * frágil de todo el flujo: la memoria de quien atiende el WhatsApp. Con la línea
 * escrita, el equipo la ve al copiar los datos y la marca en el panel (el
 * formulario de reserva tiene el campo), y queda la fecha y la versión del texto
 * que esa persona leyó — que es lo que se pide si algún día hay una queja.
 *
 * Cuando entre la pasarela de pagos, la reserva se creará desde el sitio y estas
 * tres cosas se escribirán directamente en `reservas.autorizacion_datos_*`
 * (migración 012). Esta línea seguirá sirviendo para el canal de WhatsApp, que
 * el hotel va a conservar de todos modos.
 */
export function lineaAutorizacionDatos(version: string): string {
  return `Autorizo el tratamiento de mis datos personales conforme a la Política de tratamiento de datos de La Finca Eco Hotel (versión del ${formatearFecha(version)}), que leí antes de enviar esta solicitud.`;
}

/** Mensaje del botón flotante: el mismo que usa el sitio actual. */
export const MENSAJE_GENERAL =
  "¡Hola! Vengo del sitio web de La Finca Eco Hotel y me gustaría recibir más información sobre las opciones de hospedaje y disponibilidad. ✨";

/** Desde la ficha de una cabaña. */
export function mensajeCabana(nombre: string): string {
  return `¡Hola! Vengo del sitio web de La Finca Eco Hotel. Me interesa la ${nombre} y quisiera saber si tienen disponibilidad.`;
}

/** Desde una experiencia o adicional. */
export function mensajeExperiencia(nombre: string): string {
  return `¡Hola! Vengo del sitio web de La Finca Eco Hotel. Quiero añadir la experiencia "${nombre}" a mi reserva. ¿Me cuentan cómo?`;
}

/** Desde un plan tarifario. */
export function mensajePlan(nombre: string): string {
  return `¡Hola! Vengo del sitio web de La Finca Eco Hotel. Me interesa el plan ${nombre} y quisiera consultar disponibilidad y precio.`;
}

/** Una noche del desglose, ya con la fecha escrita en español. */
export type NocheDelMensaje = {
  /** Fecha ya formateada («12 de marzo de 2026»). */
  fecha: string;
  /** Plan que se le aplicó a esa noche. */
  plan: string;
  /** Precio de esa noche, entero COP. */
  precio: number;
  /** Nombre del festivo, si esa noche lo es. */
  festivo?: string | null;
  /** Nombre de la temporada, si el precio de esa noche es de temporada. */
  temporada?: string | null;
};

/** Una experiencia o adicional elegido, con la noche a la que pertenece. */
export type ExtraDelMensaje = {
  nombre: string;
  cantidad: number;
  /** Lo que suma esa línea, entero COP. */
  importe: number;
  /** Noche ya formateada («vie 18/09/2026»); `null` = para toda la estadía. */
  noche?: string | null;
};

/** Cómo se reparte el pago. */
export type AnticipoDelMensaje = {
  /** 50 o 100. */
  porcentaje: number;
  /** Lo que se paga ahora, entero COP. */
  monto: number;
  /** Lo que queda por pagar antes de llegar. */
  saldo: number;
};

export type SolicitudReserva = {
  /** Nombre de la cabaña, si el visitante ya eligió una. */
  cabana?: string | null;
  /** Los planes que intervienen, ya juntados («Entre Semana + Estándar»). */
  plan?: string | null;
  /** Fechas `AAAA-MM-DD`, si las indicó. */
  entrada?: FechaISO | null;
  salida?: FechaISO | null;
  /** Cuántos adultos. Siempre adultos: La Finca no recibe menores de edad. */
  adultos?: number | null;
  /**
   * El desglose noche por noche que calculó el motor.
   *
   * Va ENTERO en el mensaje: en La Finca el precio cambia de una noche a otra
   * —una estadía de jueves a domingo mezcla tarifa de entre semana con tarifa
   * de fin de semana— y el equipo necesita ver de dónde sale el total para
   * poder confirmarlo sin rehacer la cuenta.
   */
  desglose?: NocheDelMensaje[] | null;
  /**
   * Las experiencias elegidas, **noche por noche**.
   *
   * En La Finca la torta de aniversario se sirve un día concreto: si el
   * mensaje solo dijera «Aniversario con Amor», el equipo tendría que
   * preguntar cuándo. Ver `src/lib/reserva/total.ts`.
   */
  extras?: ExtraDelMensaje[] | null;
  /** Total estimado, entero COP. */
  total?: number | null;
  /** Cuánto quiere pagar ahora el huésped y cuánto queda pendiente. */
  anticipo?: AnticipoDelMensaje | null;
  /**
   * Versión de la política de datos que el visitante aceptó en la casilla.
   *
   * Ver `lineaAutorizacionDatos()`.
   */
  autorizacionDatos?: string | null;
};

/**
 * Solicitud de reserva desde `/reservar`.
 *
 * Se arma por partes y solo se nombra lo que el visitante realmente eligió:
 * un mensaje que anuncia "del null al null" es peor que uno corto. Las fechas
 * van en formato largo ("12 de marzo de 2026") porque un "12/03" se lee
 * distinto según el país de quien escribe.
 *
 * El desglose va con saltos de línea de verdad (`\n`): `encodeURIComponent`
 * los convierte en `%0A` y WhatsApp los respeta, así que el mensaje llega
 * formateado como una lista y no como un párrafo corrido.
 */
export function mensajeReserva({
  cabana,
  plan,
  entrada,
  salida,
  adultos,
  desglose,
  extras,
  total,
  anticipo,
  autorizacionDatos,
}: SolicitudReserva): string {
  const partes: string[] = [
    "¡Hola! Vengo del sitio web de La Finca Eco Hotel y quiero reservar.",
  ];

  if (cabana) partes.push(`Cabaña: ${cabana}.`);
  if (plan) partes.push(`Plan: ${plan}.`);
  if (typeof adultos === "number" && adultos > 0) {
    partes.push(
      adultos === 1 ? "Somos 1 adulto." : `Somos ${adultos} adultos.`,
    );
  }

  if (entrada && salida) {
    partes.push(`Fechas: del ${formatearFechaConDia(entrada)} al ${formatearFechaConDia(salida)}.`);
  } else if (entrada) {
    partes.push(`Fecha de llegada: ${formatearFechaConDia(entrada)}.`);
  }

  const cabecera = partes.join(" ");
  const bloques: string[] = [cabecera];

  if (desglose && desglose.length > 0) {
    const lineas = desglose.map((noche) => {
      const cuando = noche.festivo
        ? `${noche.fecha} (${noche.festivo})`
        : noche.fecha;
      const plan = noche.temporada
        ? `${noche.plan}, ${noche.temporada}`
        : noche.plan;
      return `• ${cuando} — ${plan}: ${formatearCOP(noche.precio)}`;
    });
    bloques.push(["Noche por noche:", ...lineas].join("\n"));
  }

  if (extras && extras.length > 0) {
    const lineas = extras.map((extra) => {
      const cuando = extra.noche ? extra.noche : "Para toda la estadía";
      const cantidad = extra.cantidad > 1 ? ` ×${extra.cantidad}` : "";
      return `• ${cuando} — ${extra.nombre}${cantidad}: ${formatearCOP(extra.importe)}`;
    });
    bloques.push(["Experiencias y adicionales:", ...lineas].join("\n"));
  }

  if (typeof total === "number" && total > 0) {
    bloques.push(`Total estimado: ${formatearCOP(total)}.`);
  }

  if (anticipo && anticipo.monto > 0) {
    bloques.push(
      anticipo.porcentaje >= 100
        ? `Quiero pagar el 100 % ahora: ${formatearCOP(anticipo.monto)}.`
        : `Quiero pagar el ${anticipo.porcentaje} % ahora (${formatearCOP(anticipo.monto)}) y el resto (${formatearCOP(anticipo.saldo)}) antes de llegar.`,
    );
  }

  bloques.push("¿Me confirman disponibilidad y cómo hago el pago?");

  if (autorizacionDatos) {
    bloques.push(lineaAutorizacionDatos(autorizacionDatos));
  }

  return bloques.join("\n\n");
}

/* ---------------------------------------------------------------------------
 * Día de Calma
 * ------------------------------------------------------------------------- */

export type SolicitudDiaDeCalma = {
  /** Fecha `AAAA-MM-DD` del día. */
  fecha: FechaISO;
  personas: number;
  /** Horario publicado del plan («10:00 a. m. – 5:00 p. m.»). */
  horario?: string | null;
  /**
   * Los adicionales elegidos para el día.
   *
   * Sin `noche`: en el Día de Calma no hay ninguna. Son los mismos adicionales
   * que en el hospedaje viajan «para toda la estadía» (`noche = null` en
   * `reserva_extras`).
   */
  extras?: Omit<ExtraDelMensaje, "noche">[] | null;
  /** Total, entero COP. `null` cuando el hotel todavía no lo ha publicado. */
  total?: number | null;
  /** Cuánto quiere adelantar y cuánto queda, igual que en el hospedaje. */
  anticipo?: AnticipoDelMensaje | null;
  /** Versión de la política de datos aceptada en la casilla. */
  autorizacionDatos?: string | null;
};

/**
 * Solicitud de un **Día de Calma**: un día en La Finca, sin hospedaje.
 *
 * Nunca se escribe la palabra «pasadía»: el hotel la rechaza expresamente
 * (§3 de `docs/DATOS_CLIENTE.md`). Cuando el total no se puede calcular —más
 * de dos personas, cuyo valor adicional el hotel no ha publicado— el mensaje
 * lo pregunta en vez de inventarlo.
 */
export function mensajeDiaDeCalma({
  fecha,
  personas,
  horario,
  extras,
  total,
  anticipo,
  autorizacionDatos,
}: SolicitudDiaDeCalma): string {
  const partes: string[] = [
    "¡Hola! Vengo del sitio web de La Finca Eco Hotel y quiero reservar un Día de Calma (sin hospedaje).",
    `Fecha: ${formatearFechaConDia(fecha)}.`,
    personas === 1 ? "Vengo 1 persona." : `Venimos ${personas} personas.`,
  ];
  if (horario) partes.push(`Horario: ${horario}.`);

  const bloques: string[] = [partes.join(" ")];

  if (extras && extras.length > 0) {
    const lineas = extras.map((extra) => {
      const cantidad = extra.cantidad > 1 ? ` ×${extra.cantidad}` : "";
      return `• ${extra.nombre}${cantidad}: ${formatearCOP(extra.importe)}`;
    });
    bloques.push(["Adicionales para el día:", ...lineas].join("\n"));
  }

  bloques.push(
    typeof total === "number" && total > 0
      ? `Total estimado: ${formatearCOP(total)}.`
      : "¿Me confirman el valor para ese número de personas?",
  );

  /* El mismo cierre que el hospedaje: el Día de Calma también elige cuánto
     adelanta, de 50 a 100 %. Ver `src/lib/reserva/total.ts`. */
  if (anticipo && anticipo.monto > 0) {
    bloques.push(
      anticipo.porcentaje >= 100
        ? `Quiero pagar el 100 % ahora: ${formatearCOP(anticipo.monto)}.`
        : `Quiero pagar el ${anticipo.porcentaje} % ahora (${formatearCOP(anticipo.monto)}) y el resto (${formatearCOP(anticipo.saldo)}) antes de llegar.`,
    );
  }

  bloques.push("¿Me confirman disponibilidad y cómo hago el pago?");

  if (autorizacionDatos) {
    bloques.push(lineaAutorizacionDatos(autorizacionDatos));
  }

  return bloques.join("\n\n");
}

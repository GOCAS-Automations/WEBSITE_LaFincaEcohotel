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
import { formatearCOP, formatearFecha, type FechaISO } from "./utils/formato";
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
  /** Total estimado, entero COP. */
  total?: number | null;
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
  total,
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
    partes.push(`Fechas: del ${formatearFecha(entrada)} al ${formatearFecha(salida)}.`);
  } else if (entrada) {
    partes.push(`Fecha de llegada: ${formatearFecha(entrada)}.`);
  }

  const cabecera = partes.join(" ");
  const bloques: string[] = [cabecera];

  if (desglose && desglose.length > 0) {
    const lineas = desglose.map((noche) => {
      const cuando = noche.festivo
        ? `${noche.fecha} (${noche.festivo})`
        : noche.fecha;
      return `• ${cuando} — ${noche.plan}: ${formatearCOP(noche.precio)}`;
    });
    bloques.push(["Noche por noche:", ...lineas].join("\n"));
  }

  if (typeof total === "number" && total > 0) {
    bloques.push(`Total estimado: ${formatearCOP(total)}.`);
  }

  bloques.push("¿Me confirman disponibilidad y cómo hago el pago?");
  return bloques.join("\n\n");
}

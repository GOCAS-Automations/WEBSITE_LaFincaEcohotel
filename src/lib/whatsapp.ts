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

export type SolicitudReserva = {
  /** Nombre de la cabaña, si el visitante ya eligió una. */
  cabana?: string | null;
  /** Nombre del plan, si ya eligió uno. */
  plan?: string | null;
  /** Fechas `AAAA-MM-DD`, si las indicó. */
  entrada?: FechaISO | null;
  salida?: FechaISO | null;
  /** Precio por noche del plan elegido, en COP enteros. */
  precioNoche?: number | null;
};

/**
 * Solicitud de reserva desde `/reservar`.
 *
 * Se arma por partes y solo se nombra lo que el visitante realmente eligió:
 * un mensaje que anuncia "del null al null" es peor que uno corto. Las fechas
 * van en formato largo ("12 de marzo de 2026") porque un "12/03" se lee
 * distinto según el país de quien escribe.
 */
export function mensajeReserva({
  cabana,
  plan,
  entrada,
  salida,
  precioNoche,
}: SolicitudReserva): string {
  const partes: string[] = [
    "¡Hola! Vengo del sitio web de La Finca Eco Hotel y quiero reservar.",
  ];

  if (cabana) partes.push(`Cabaña: ${cabana}.`);
  if (plan) partes.push(`Plan: ${plan}.`);

  if (entrada && salida) {
    partes.push(`Fechas: del ${formatearFecha(entrada)} al ${formatearFecha(salida)}.`);
  } else if (entrada) {
    partes.push(`Fecha de llegada: ${formatearFecha(entrada)}.`);
  }

  if (typeof precioNoche === "number" && precioNoche > 0) {
    partes.push(`Tarifa publicada: ${formatearCOP(precioNoche)} por noche.`);
  }

  partes.push("¿Me confirman disponibilidad y cómo hago el pago?");
  return partes.join(" ");
}

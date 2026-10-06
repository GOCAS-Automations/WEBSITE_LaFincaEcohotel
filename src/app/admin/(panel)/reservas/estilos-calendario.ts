import type { CSSProperties } from "react";

import type { Barra } from "@/lib/admin/calendario-mes";
import { CUPO_DIA_DE_CALMA } from "@/lib/reserva/dia-de-calma";
import type { EstadoReserva } from "@/lib/tipos/basedatos";

/**
 * Colores del calendario de ocupación, compartidos por la cuadrícula del mes
 * (escritorio) y la agenda por día (celular): las dos vistas tienen que
 * pintar lo mismo del mismo color, o la leyenda mentiría en una de ellas.
 */

/** Reservas de la base (sitio web y panel): color lleno según el estado. */
export const COLOR_ESTADO: Record<EstadoReserva, string> = {
  pendiente: "bg-dorado-300 text-dorado-950",
  confirmada: "bg-petroleo-600 text-white",
  completada: "bg-petroleo-200 text-petroleo-900",
  cancelada: "bg-crema-300 text-crema-800",
};

export const COLOR_BLOQUEO = "bg-crema-600 text-white";

/**
 * El calendario de Google del hotel va RAYADO y con borde punteado, no con un
 * color plano: esas franjas no son reservas nuestras —no tienen código, ni
 * total, ni ficha— sino lo que el equipo apuntó a mano en Google. La trama
 * dice «ocupado, pero de otra fuente» sin gastar otro color de la paleta.
 */
export const PATRON_GOOGLE: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, rgba(2,117,112,0.22) 0 4px, rgba(2,117,112,0.07) 4px 9px)",
};
export const COLOR_GOOGLE =
  "bg-petroleo-50 text-petroleo-900 outline-1 -outline-offset-1 outline-dashed outline-petroleo-600/55";
/**
 * Un evento de Google que no dice qué cabaña ocupa TODAS (así lo cuenta la
 * disponibilidad): mismo rayado, borde ámbar, para que se lea como aviso y no
 * como una reserva de esa cabaña.
 */
export const COLOR_GOOGLE_SIN_CABANA =
  "bg-dorado-50 text-dorado-950 outline-2 -outline-offset-2 outline-dashed outline-dorado-500";

/** Clases y estilo de una barra, según su fuente. */
export function pielDeBarra(
  barra: Pick<Barra, "fuente" | "estado"> & { sinCabana?: boolean },
): {
  clase: string;
  estilo?: CSSProperties;
} {
  if (barra.fuente === "google") {
    return {
      clase: barra.sinCabana ? COLOR_GOOGLE_SIN_CABANA : COLOR_GOOGLE,
      estilo: PATRON_GOOGLE,
    };
  }
  if (barra.fuente === "bloqueo") return { clase: COLOR_BLOQUEO };
  return { clase: COLOR_ESTADO[barra.estado ?? "confirmada"] };
}

/** Tono del cupo del Día de Calma: sube de color según se llena. */
export function tonoCupo(personas: number): string {
  if (personas >= CUPO_DIA_DE_CALMA) return "bg-crema-700 text-white";
  if (personas >= CUPO_DIA_DE_CALMA * 0.6) return "bg-dorado-300 text-dorado-950";
  return "bg-oliva-200 text-oliva-900";
}

/** Las muestras de la leyenda. */
export const LEYENDA: {
  etiqueta: string;
  clase: string;
  estilo?: CSSProperties;
}[] = [
  { etiqueta: "Confirmada", clase: COLOR_ESTADO.confirmada },
  { etiqueta: "Pendiente de pago", clase: COLOR_ESTADO.pendiente },
  { etiqueta: "Completada", clase: COLOR_ESTADO.completada },
  {
    etiqueta: "Evento del calendario del hotel (Google)",
    clase: COLOR_GOOGLE,
    estilo: PATRON_GOOGLE,
  },
  {
    etiqueta: "Evento sin cabaña: ocupa todas",
    clase: COLOR_GOOGLE_SIN_CABANA,
    estilo: PATRON_GOOGLE,
  },
  { etiqueta: "Bloqueo", clase: COLOR_BLOQUEO },
  { etiqueta: "Fin de semana o festivo", clase: "bg-crema-200 ring-1 ring-inset ring-crema-300" },
  { etiqueta: "Hoy", clase: "bg-petroleo-50 ring-2 ring-inset ring-petroleo-500" },
];

import type { TipoExtra } from "@/lib/tipos/basedatos";

/**
 * A qué sección del panel pertenece cada tipo de extra.
 *
 * Vive fuera de `acciones.ts` porque un archivo `"use server"` solo puede
 * exportar funciones asíncronas: una función normal como esta rompería la
 * compilación si se declarara allí.
 */
export function rutaDeTipo(tipo: TipoExtra): string {
  return tipo === "experiencia" ? "/admin/experiencias" : "/admin/adicionales";
}

export const TEXTOS_EXTRA: Record<
  TipoExtra,
  {
    titulo: string;
    singular: string;
    plural: string;
    descripcion: string;
    explicacionVacio: string;
    carpeta: "experiencias" | "adicionales";
  }
> = {
  experiencia: {
    titulo: "Experiencias",
    singular: "experiencia",
    plural: "experiencias",
    descripcion:
      "Las celebraciones que el huésped puede añadir a su reserva: aniversarios, cumpleaños y todo lo que se prepare en la cabaña antes de que llegue.",
    explicacionVacio:
      "Aquí se administran las celebraciones que el huésped puede añadir a su reserva. Cada una tiene su foto, su precio y lo que incluye.",
    carpeta: "experiencias",
  },
  adicional: {
    titulo: "Adicionales",
    singular: "adicional",
    plural: "adicionales",
    descripcion:
      "Servicios sueltos que se cobran aparte de la estadía: transporte, decoración extra, lo que el hotel quiera ofrecer.",
    explicacionVacio:
      "Aquí se administran los servicios que se cobran aparte de la estadía. Cada uno tiene su precio y, si quieres, su foto.",
    carpeta: "adicionales",
  },
};

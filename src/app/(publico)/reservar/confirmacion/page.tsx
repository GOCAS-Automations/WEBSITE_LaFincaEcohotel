import type { Metadata } from "next";

import { PaginaConfirmacion } from "@/components/paginas/confirmacion-pago";
import { metadatosPagina } from "@/lib/seo";

/**
 * A dónde vuelve el huésped desde la pasarela de Bold.
 *
 * ---------------------------------------------------------------------------
 * ESTA PÁGINA NO CONFIRMA NADA. **NADA.**
 * ---------------------------------------------------------------------------
 * Requisito 2 de `docs/AUDITORIA_SEGURIDAD.md`: «La reserva se confirma SOLO
 * por webhook, nunca por la redirección del navegador. La vuelta del checkout es
 * una pista para el huésped, no un hecho: se puede falsificar escribiendo la
 * URL». Cualquiera puede abrir
 * `…/reservar/confirmacion?bold-order-id=X&bold-tx-status=approved` a mano, así
 * que lo que diga la dirección se ignora y el estado se **pregunta a Bold**.
 *
 * Dinámica y sin indexar: depende de un parámetro y no tiene nada que buscar
 * nadie en Google.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return await metadatosPagina({
    titulo: "Tu reserva",
    descripcion:
      "El estado de tu pago y los siguientes pasos de tu reserva en La Finca Eco Hotel.",
    ruta: "/reservar/confirmacion",
    /* Una página con la referencia de pago de alguien no se indexa. */
    noIndexar: true,
  });
}

export default async function Confirmacion({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;

  const primero = (valor: string | string[] | undefined): string =>
    (Array.isArray(valor) ? valor[0] : valor) ?? "";

  return (
    <PaginaConfirmacion
      /* `ref` es NUESTRO parámetro (lo pusimos en `redirectionUrl`), y
         `bold-order-id` el que añade Bold. Se admiten los dos: el de Bold no
         llega cuando el huésped vuelve por abandono. */
      referencia={primero(parametros.ref) || primero(parametros["bold-order-id"])}
      abandono={primero(parametros.abandono) === "1"}
    />
  );
}

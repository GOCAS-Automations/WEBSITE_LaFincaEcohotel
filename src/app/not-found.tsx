import type { Metadata } from "next";

import { ContenidoNoEncontrado } from "@/components/paginas/no-encontrado";
import { MarcoPublico } from "@/components/sitio/marco-publico";

/**
 * Página 404 de la raíz: la que responde a una dirección que no coincide con
 * ninguna ruta del sitio.
 *
 * Se renderiza fuera del grupo `(publico)`, así que monta el marco del sitio a
 * mano. Sin esto saldría sin menú, sin pie y sin el RNT.
 */
export const metadata: Metadata = {
  title: "Página no encontrada",
  description:
    "La dirección que buscas no existe o cambió de lugar. Vuelve al inicio de La Finca Eco Hotel.",
  robots: { index: false, follow: true },
};

export default function NoEncontrado() {
  return (
    <MarcoPublico>
      <ContenidoNoEncontrado />
    </MarcoPublico>
  );
}

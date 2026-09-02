import type { Metadata } from "next";

import { PaginaLegal } from "@/components/paginas/legal";
import { getContacto } from "@/lib/contenido";
import { documentosLegales } from "@/lib/legal";
import { metadatosPagina } from "@/lib/seo";

export const revalidate = 3600;

const CLAVE = "privacidad" as const;

export async function generateMetadata(): Promise<Metadata> {
  const contacto = await getContacto();
  const documento = documentosLegales(contacto)[CLAVE];

  return metadatosPagina({
    titulo: documento.titulo,
    descripcion: documento.descripcion,
    ruta: documento.ruta,
  });
}

export default function Documento() {
  return <PaginaLegal clave={CLAVE} />;
}

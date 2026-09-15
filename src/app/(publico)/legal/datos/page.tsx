import type { Metadata } from "next";

import { PaginaLegal } from "@/components/paginas/legal";
import { getDocumentoLegal } from "@/lib/contenido";
import { RUTA_LEGAL } from "@/lib/legal";
import { metadatosPagina } from "@/lib/seo";

export const revalidate = 3600;

const CLAVE = "datos" as const;

export async function generateMetadata(): Promise<Metadata> {
  const documento = await getDocumentoLegal(CLAVE);

  return await metadatosPagina({
    titulo: documento.titulo,
    descripcion: documento.descripcion,
    ruta: RUTA_LEGAL[CLAVE],
  });
}

export default function Documento() {
  return <PaginaLegal clave={CLAVE} />;
}

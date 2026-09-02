import type { Metadata } from "next";

import { PaginaInicio } from "@/components/paginas/inicio";
import {
  getAlojamientos,
  getContacto,
  getHero,
  getPrecioDesde,
  getSeoSitio,
} from "@/lib/contenido";
import { grafoHotel } from "@/lib/datos-estructurados";
import { metadatosPagina, serializarJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [seo, hero] = await Promise.all([getSeoSitio(), getHero()]);

  return {
    ...metadatosPagina({
      titulo: seo.titulo,
      tituloAbsoluto: true,
      descripcion: seo.descripcion,
      ruta: "/",
      imagen: seo.imagen,
      tituloSocial: seo.titulo,
      descripcionSocial: hero.subtitulo,
    }),
    keywords: seo.palabras_clave,
  };
}

export default async function Inicio() {
  const [contacto, precioDesde, alojamientos, seo] = await Promise.all([
    getContacto(),
    getPrecioDesde(),
    getAlojamientos(),
    getSeoSitio(),
  ]);

  const grafo = grafoHotel({
    contacto,
    precioDesde,
    descripcion: seo.descripcion,
    numeroDeCabanas: alojamientos.length,
    imagenes: [
      seo.imagen.url,
      ...alojamientos
        .map((alojamiento) => alojamiento.galeria[0]?.url)
        .filter((url): url is string => Boolean(url))
        .slice(0, 4),
    ],
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializarJsonLd(grafo) }}
      />
      <PaginaInicio />
    </>
  );
}

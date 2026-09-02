import type { Metadata } from "next";

import { PaginaGaleria } from "@/components/paginas/galeria";
import { getHeroesListados } from "@/lib/contenido";
import { metadatosPagina } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const heroes = await getHeroesListados();
  const hero = heroes.galeria;

  return metadatosPagina({
    titulo: "Galería",
    descripcion:
      "Fotos de La Finca Eco Hotel: las cabañas, el bosque de niebla, la zona húmeda, la piscina y los senderos del Km 18 vía Cali–Buenaventura.",
    ruta: "/galeria",
    imagen: { url: hero.imagen, alt: hero.imagen_alt },
  });
}

export default function GaleriaGeneral() {
  return <PaginaGaleria />;
}

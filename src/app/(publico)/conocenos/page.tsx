import type { Metadata } from "next";

import { PaginaConocenos } from "@/components/paginas/conocenos";
import { getHeroesListados } from "@/lib/contenido";
import { metadatosPagina } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const heroes = await getHeroesListados();
  const hero = heroes.conocenos;

  return metadatosPagina({
    titulo: "Conócenos",
    descripcion:
      "La Finca Eco Hotel está en el Km 18 vía Cali–Buenaventura, en un bosque de niebla: zona húmeda, piscina, restaurante, salón de eventos y senderos.",
    ruta: "/conocenos",
    imagen: { url: hero.imagen, alt: hero.imagen_alt },
  });
}

export default function Conocenos() {
  return <PaginaConocenos />;
}

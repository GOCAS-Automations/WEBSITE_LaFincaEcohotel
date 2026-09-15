import type { Metadata } from "next";

import { PaginaExperiencias } from "@/components/paginas/experiencias";
import { getHeroesListados } from "@/lib/contenido";
import { metadatosPagina } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const heroes = await getHeroesListados();
  const hero = heroes.experiencias;

  return await metadatosPagina({
    titulo: "Experiencias",
    descripcion:
      "Aniversarios, cumpleaños, picnic y veladas románticas en La Finca Eco Hotel: la cabaña queda lista antes de que llegues. Km 18 vía Cali–Buenaventura.",
    ruta: "/experiencias",
    imagen: { url: hero.imagen, alt: hero.imagen_alt },
  });
}

export default function Experiencias() {
  return <PaginaExperiencias />;
}

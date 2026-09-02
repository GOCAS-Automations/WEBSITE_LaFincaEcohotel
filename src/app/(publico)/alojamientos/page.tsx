import type { Metadata } from "next";

import { PaginaAlojamientos } from "@/components/paginas/alojamientos";
import { getHeroesListados, getPrecioDesde } from "@/lib/contenido";
import { metadatosPagina } from "@/lib/seo";
import { formatearCOP } from "@/lib/utils/formato";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [heroes, precioDesde] = await Promise.all([
    getHeroesListados(),
    getPrecioDesde(),
  ]);
  const hero = heroes.alojamientos;

  return metadatosPagina({
    titulo: "Cabañas",
    descripcion: precioDesde
      ? `Cabañas para dos en La Finca Eco Hotel, Km 18 vía Cali–Buenaventura: cama doble, baño privado y vista a la montaña. Desde ${formatearCOP(precioDesde)} la noche.`
      : "Cabañas para dos en La Finca Eco Hotel, Km 18 vía Cali–Buenaventura: cama doble, baño privado y vista a la montaña.",
    ruta: "/alojamientos",
    imagen: { url: hero.imagen, alt: hero.imagen_alt },
  });
}

export default function Alojamientos() {
  return <PaginaAlojamientos />;
}

import type { Metadata } from "next";

import { PaginaReservar } from "@/components/paginas/reservar";
import { getHeroesListados, getPrecioDesde } from "@/lib/contenido";
import { metadatosPagina } from "@/lib/seo";
import { formatearCOP } from "@/lib/utils/formato";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [heroes, precioDesde] = await Promise.all([
    getHeroesListados(),
    getPrecioDesde(),
  ]);
  const hero = heroes.reservar;

  return await metadatosPagina({
    titulo: "Reservar",
    descripcion: precioDesde
      ? `Reserva tu cabaña en La Finca Eco Hotel, a 45 minutos de Cali. Tres planes desde ${formatearCOP(precioDesde)} la noche para dos personas.`
      : "Reserva tu cabaña en La Finca Eco Hotel, a 45 minutos de Cali. Elige cabaña y plan y te confirmamos disponibilidad el mismo día.",
    ruta: "/reservar",
    imagen: { url: hero.imagen, alt: hero.imagen_alt },
  });
}

export default function Reservar() {
  return <PaginaReservar />;
}

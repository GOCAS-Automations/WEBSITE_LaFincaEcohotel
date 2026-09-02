import type { Metadata } from "next";

import { PaginaFaq } from "@/components/paginas/faq";
import { getFaq, getHeroesListados } from "@/lib/contenido";
import { grafoPreguntas } from "@/lib/datos-estructurados";
import { metadatosPagina, serializarJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const heroes = await getHeroesListados();
  const hero = heroes.faq;

  return metadatosPagina({
    titulo: "Preguntas frecuentes",
    descripcion:
      "Ubicación, clima, parqueadero, mascotas, niños, restaurante y eventos: lo que más preguntan antes de llegar a La Finca Eco Hotel.",
    ruta: "/faq",
    imagen: { url: hero.imagen, alt: hero.imagen_alt },
  });
}

export default async function Faq() {
  const faq = await getFaq();

  return (
    <>
      {/* Las mismas preguntas que se ven en pantalla, para el buscador. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializarJsonLd(grafoPreguntas(faq.items)),
        }}
      />
      <PaginaFaq />
    </>
  );
}

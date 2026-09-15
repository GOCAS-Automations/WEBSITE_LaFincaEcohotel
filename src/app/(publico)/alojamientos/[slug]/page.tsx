import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PaginaAlojamiento } from "@/components/paginas/alojamiento";
import {
  getAlojamientoPorSlug,
  getAlojamientos,
  getContacto,
  portada,
} from "@/lib/contenido";
import { grafoCabana } from "@/lib/datos-estructurados";
import {
  colasDeCabana,
  componerDescripcion,
  metadatosPagina,
  serializarJsonLd,
} from "@/lib/seo";
import { formatearCOP } from "@/lib/utils/formato";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

/**
 * Prerenderiza las cinco fichas en el build. Sin esto, la primera visita a cada
 * cabaña pagaría el render completo, justo en la página que decide la reserva.
 */
export async function generateStaticParams() {
  const alojamientos = await getAlojamientos();
  return alojamientos.map((alojamiento) => ({ slug: alojamiento.slug }));
}

/** Descripción de la ficha, con el precio real como cola de contexto. */
async function descripcionDe(slug: string) {
  const alojamiento = await getAlojamientoPorSlug(slug);
  if (!alojamiento) return null;

  const base =
    alojamiento.descripcion ??
    `${alojamiento.nombre} de La Finca Eco Hotel, para dos personas, con cama doble, baño privado y vista a la montaña.`;

  return componerDescripcion(
    base,
    colasDeCabana(
      alojamiento.precio_desde ? formatearCOP(alojamiento.precio_desde) : null,
    ),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const alojamiento = await getAlojamientoPorSlug(slug);
  if (!alojamiento) return {};

  const foto = portada(
    alojamiento.galeria,
    `${alojamiento.nombre} de La Finca Eco Hotel`,
  );

  return await metadatosPagina({
    titulo: alojamiento.nombre,
    descripcion: (await descripcionDe(slug)) ?? "",
    ruta: `/alojamientos/${alojamiento.slug}`,
    imagen: { url: foto.url, alt: foto.alt },
  });
}

export default async function FichaAlojamiento({ params }: Props) {
  const { slug } = await params;
  const [alojamiento, contacto] = await Promise.all([
    getAlojamientoPorSlug(slug),
    getContacto(),
  ]);

  if (!alojamiento) notFound();

  const grafo = grafoCabana({
    alojamiento,
    contacto,
    descripcion: (await descripcionDe(slug)) ?? alojamiento.nombre,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializarJsonLd(grafo) }}
      />
      <PaginaAlojamiento alojamiento={alojamiento} />
    </>
  );
}

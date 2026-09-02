import type { MetadataRoute } from "next";

import { getAlojamientos, getUltimaModificacion } from "@/lib/contenido";
import { DOCUMENTOS_LEGALES, LEGAL_ACTUALIZADO, SITIO } from "@/lib/sitio";

export const revalidate = 3600;

/**
 * Mapa del sitio.
 *
 * Tres decisiones que importan:
 *
 * · **`lastmod` real, no la hora del despliegue.** Poner `new Date()` en cada
 *   fila le dice al buscador que la política de privacidad cambia cada vez que
 *   se recompila el sitio; un `lastmod` que miente hace que Google deje de
 *   usarlo en TODO el dominio. Aquí sale de la base (`created_at` de
 *   alojamientos y tarifas, `actualizado_at` del contenido) y, para los
 *   documentos legales, de la fecha de revisión del texto.
 *
 * · **Las direcciones son EXACTAMENTE las canónicas** que publica cada página,
 *   sin barra final. Un sitemap que lista `https://…/` mientras la página se
 *   declara canónica en `https://…` son dos señales distintas para la misma URL.
 *
 * · **Solo páginas indexables.** La 404 no entra.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [alojamientos, modificado] = await Promise.all([
    getAlojamientos(),
    getUltimaModificacion(),
  ]);

  /* Respaldo para cuando Supabase no responde durante el build: mejor la fecha
     del despliegue que ninguna. */
  const respaldo = new Date();
  const contenido = modificado.contenido ?? respaldo;
  const catalogo = modificado.alojamientosMasReciente ?? respaldo;

  const url = (ruta: string) =>
    ruta === "/" ? SITIO.url : `${SITIO.url}${ruta}`;

  return [
    {
      url: url("/"),
      lastModified: contenido,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: url("/alojamientos"),
      lastModified: catalogo,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    /* La página de reservas responde a "reservar la finca eco hotel", que es la
       búsqueda con más intención del sitio. Sus variantes `?cabana=` son la
       misma página con una cabaña preseleccionada y declaran esta canónica, así
       que no se listan. */
    {
      url: url("/reservar"),
      lastModified: catalogo,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...alojamientos.map((alojamiento) => ({
      url: url(`/alojamientos/${alojamiento.slug}`),
      lastModified: modificado.alojamientos.get(alojamiento.slug) ?? catalogo,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    {
      url: url("/experiencias"),
      lastModified: contenido,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: url("/el-lugar"),
      lastModified: contenido,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: url("/galeria"),
      lastModified: contenido,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: url("/faq"),
      lastModified: contenido,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: url("/contacto"),
      lastModified: contenido,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    // Los documentos legales no compiten por posicionamiento, pero deben ser
    // rastreables: la pasarela de pagos exige que estén publicados. Su fecha es
    // la de la última revisión del TEXTO, no la del despliegue.
    ...DOCUMENTOS_LEGALES.map((documento) => ({
      url: url(documento.href),
      lastModified: new Date(`${LEGAL_ACTUALIZADO}T00:00:00Z`),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}

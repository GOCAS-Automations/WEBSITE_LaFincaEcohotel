import type { MetadataRoute } from "next";

import { SITIO } from "@/lib/sitio";

/**
 * El sitio se declara "publicado" (el dominio real ya apunta a Vercel) solo
 * cuando esta variable vale exactamente `"1"`. Ver `.env.example` para el
 * porqué: mientras el WordPress viejo siga en producción, la URL de Vercel
 * —temporal o de preview— no puede competir por las mismas búsquedas.
 */
const sitioPublicado = process.env.SITIO_PUBLICADO === "1";

/**
 * `robots.txt`.
 *
 * Se bloquea el panel administrativo —no debe aparecer jamás en el índice— y
 * las rutas de API, que no son páginas: bloquearlas no las cierra (quien tenga
 * la dirección directa las sigue llamando), pero evita resultados vacíos en el
 * buscador y ahorra presupuesto de rastreo.
 */
export default function robots(): MetadataRoute.Robots {
  if (!sitioPublicado) {
    // Sin `SITIO_PUBLICADO=1` se bloquea el sitio COMPLETO: no solo el panel.
    // No se publica `sitemap` ni `host`: no tiene sentido invitar a rastrear
    // un sitio que el propio robots.txt le está prohibiendo indexar.
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: `${SITIO.url}/sitemap.xml`,
    host: SITIO.url,
  };
}

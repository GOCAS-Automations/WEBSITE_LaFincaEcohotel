import type { MetadataRoute } from "next";

import { SITIO } from "@/lib/sitio";

/**
 * `robots.txt`.
 *
 * Se bloquea el panel administrativo —no debe aparecer jamás en el índice— y
 * las rutas de API, que no son páginas: bloquearlas no las cierra (quien tenga
 * la dirección directa las sigue llamando), pero evita resultados vacíos en el
 * buscador y ahorra presupuesto de rastreo.
 */
export default function robots(): MetadataRoute.Robots {
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

import type { Metadata, Viewport } from "next";

import { clasesDeFuentes } from "@/lib/fuentes";
import { SITIO } from "@/lib/sitio";

import "./globals.css";

/**
 * El sitio se declara "publicado" (el dominio real ya apunta a Vercel) solo
 * cuando esta variable vale exactamente `"1"`. Ver `.env.example` para el
 * porqué.
 */
const sitioPublicado = process.env.SITIO_PUBLICADO === "1";

/**
 * Metadatos base del sitio.
 *
 * Solo lo que de verdad se hereda sin sorpresas: `metadataBase`, la plantilla
 * de títulos y el idioma. Todo lo demás —descripción, canónica, OpenGraph y
 * Twitter— lo declara cada página con `metadatosPagina()` (`src/lib/seo.ts`),
 * porque la mezcla de metadatos del App Router es superficial y un `openGraph`
 * declarado abajo reemplaza entero al de aquí.
 *
 * `robots` es la excepción: se declara aquí, en la raíz, SOLO mientras el
 * sitio no esté publicado, para que ninguna ruta —ni siquiera una que no use
 * `metadatosPagina()`— pueda escapar al `noindex, nofollow`. Cuando el sitio
 * sí está publicado no se declara nada aquí y cada página decide lo suyo (el
 * panel, por ejemplo, pone el suyo propio en `src/app/admin/layout.tsx`).
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITIO.url),
  title: {
    default: `${SITIO.nombre} — Cabañas en el bosque de niebla cerca de Cali`,
    template: `%s · ${SITIO.nombre}`,
  },
  description:
    "Ecohotel de montaña a 45 minutos de Cali, en el Km 18 vía Buenaventura. Cabañas para dos con jacuzzi, turco, piscina, restaurante y senderos.",
  applicationName: SITIO.nombre,
  authors: [{ name: SITIO.nombre }],
  creator: SITIO.nombre,
  publisher: SITIO.nombre,
  formatDetection: { telephone: false },
  /*
    LOS ICONOS NO SE DECLARAN AQUÍ.

    Antes este bloque apuntaba a `/marca/icono.png`, el isotipo PROVISIONAL que
    se sacó del Instagram del hotel mientras no llegaba el oficial. Ahora los
    iconos salen de los archivos que Next reconoce por su nombre —`icon.png`,
    `apple-icon.png` y `favicon.ico`, los tres en `src/app/`—, generados desde
    el isotipo del diseñador con `npm run marca:iconos`.

    Es importante NO declararlos también en `metadata`: un `icons` escrito a
    mano **reemplaza** a los que Next descubre por convención, y el resultado
    sería seguir publicando el logo provisional con los archivos oficiales al
    lado sin usar. Fue exactamente lo que pasó al añadirlos.
  */
  ...(sitioPublicado ? {} : { robots: { index: false, follow: false } }),
};

export const viewport: Viewport = {
  themeColor: "#027570",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={clasesDeFuentes}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
